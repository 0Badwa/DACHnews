/************************************************
 * index.js
 ************************************************/

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Pomoćne promenljive za __dirname u ES modulu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Posluži statiku iz "src" (gde je scripts.js, css, sl.)
app.use('/src', express.static(path.join(__dirname, 'src')));

// Redis konekcija
const redisClient = createClient({
  url: process.env.REDIS_URL,
});
console.log("[Redis] Pokušaj povezivanja...");
redisClient.connect()
  .then(() => console.log("[Redis] Konektovan na Redis!"))
  .catch((err) => console.error("[Redis] Greška pri povezivanju:", err));

// Trajanje keša u sekundama (7 dana)
const SEVEN_DAYS = 60 * 60 * 24 * 7;

// URL do RSS feed-a
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";

// OpenAI endpoint, koristimo "gpt-4o-mini" (pod pretpostavkom da vam je dostupan)
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * 1) Preuzima ceo feed sa RSS.App
 */
async function fetchRSSFeed() {
  console.log("[fetchRSSFeed] Preuzimanje RSS feed-a sa:", RSS_FEED_URL);
  try {
    const response = await axios.get(RSS_FEED_URL);
    const items = response.data.items || [];
    console.log(`[fetchRSSFeed] Uspelo, broj vesti: ${items.length}`);
    return items;
  } catch (error) {
    console.error("[fetchRSSFeed] Greška pri preuzimanju RSS feed-a:", error);
    return [];
  }
}

/**
 * 2) Šaljemo *batch* feed stavki GPT-u, da dobijemo kategorizaciju
 *    - GPT model: "gpt-4o-mini" (morate imati pristup)
 */
async function sendBatchToGPT(feedBatch) {
  console.log("[sendBatchToGPT] Slanje serije stavki GPT API-ju...");

  // Sastavimo JSON koji prosleđujemo GPT-u
  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || item.content_text || ""
  }));

  // Prompt i poruke za GPT
  const payload = {
    model: "gpt-4o-mini",  // novi model
    messages: [
      {
        role: "system",
        content: `Ti si veštački inteligentni asistent specijalizovan za kategorizaciju vesti za projekat DACH News, koji se fokusira na vesti za tri zemlje: Nemačku, Austriju i Švajcarsku. Vesti koje obrađuješ biće na nemačkom jeziku, i potrebno je da ih kategorizuješ u jednoj od sledećih kategorija:
- Technologie
- Gesundheit
- Sport
- Wirtschaft
- Kultur
- Auto
- Reisen
- Lifestyle
- Panorama
- Politik
- Unterhaltung
- Welt
- LGBT+

Pri kategorizaciji, obavezno vodi računa o specifičnostima tih zemalja i njihove političke, društvene i kulturne karakteristike. Ako vest sadrži informacije koje se jasno odnose na neku od gore navedenih kategorija, postavi je u odgovarajuću. Pokušaj da budeš precizniji u prepoznavanju ključnih reči i konteksta, posebno kada se radi o političkim ličnostima ili važnim događajima koji mogu imati specifičnu kategoriju: { "id": "...", "category": "..." }`
      },
      {
        role: "user",
        content: JSON.stringify(combinedContent)
      }
    ],
    max_tokens: 1500,
    temperature: 0.0
  };

  try {
    const response = await axios.post(GPT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`, // vaš OpenAI ključ
        "Content-Type": "application/json"
      }
    });

    const gptText = response.data.choices?.[0]?.message?.content?.trim();
    console.log("[sendBatchToGPT] GPT raw odgovor:", gptText);
    return gptText;
  } catch (error) {
    console.error("[sendBatchToGPT] Greška pri pozivu GPT API:", error?.response?.data || error.message);
    return null;
  }
}

/**
 * 3) processFeeds - dodaje samo *nove* vesti u Redis
 *    - Proverava "processed_ids" set (koji isto expajruje za 7 dana).
 *    - Nove ID-jeve šalje GPT-u, uzima kategorije i upisuje u "category:<kategorija>".
 *    - Svaki "category:<cat>" ima expire 7 dana.
 */
async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova (dodavanje *novih* stavki)...");

  // Uzimamo sve stavke sa RSS feed-a
  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Ukupno preuzeto ${allItems.length} feedova.`);

  if (allItems.length === 0) {
    console.log("[processFeeds] Nema feedova, prekid.");
    return;
  }

  // Filtriramo one koje NISU u processed_ids
  const newItems = [];
  for (const item of allItems) {
    const alreadyProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (!alreadyProcessed) {
      newItems.push(item);
    }
  }

  if (newItems.length === 0) {
    console.log("[processFeeds] Nema novih feedova. Sve je već procesirano.");
    return;
  }

  console.log(`[processFeeds] Nađeno ${newItems.length} novih feedova. Slanje GPT-u...`);

  // Pozovemo GPT za batch
  let gptResponse = await sendBatchToGPT(newItems);
  if (!gptResponse) {
    console.error("[processFeeds] GPT odgovor je prazan ili null, prekidamo.");
    return;
  }

  // Ako je fenced code, uklonimo
  if (gptResponse.startsWith("```json")) {
    gptResponse = gptResponse.replace(/^```json\n?/, '').replace(/```$/, '');
  }

let classifications;
try {
  classifications = JSON.parse(gptResponse);
  console.log("[processFeeds] Parsiran GPT JSON:", classifications);

  // Ako parsirani JSON nije niz, pretvorimo ga u niz radi dalje obrade
  if (!Array.isArray(classifications)) {
    classifications = [classifications];
  }
  
} catch (error) {
  console.error("[processFeeds] Greška pri parse GPT JSON:", error);
  return;
}

// Napravimo mapu ID -> category
const idToCategory = {};
for (const c of classifications) {
  if (c.id && c.category) {
    idToCategory[c.id] = c.category;
  }
}

// Sad upišemo u Redis
for (const item of newItems) {
  const category = idToCategory[item.id] || "Uncategorized";

  // Unutar petlje u processFeeds za svaku novu stavku
  const newsObj = {
    id: item.id,
    title: item.title,
    date_published: item.date_published || null,
    url: item.url || null,
    image: item.image || null,
    content_text: item.content_text || "",
    category,
    source: (item.authors && item.authors.length > 0) ? item.authors[0].name : extractSource(item.url)
  };
}


    // Upis u listu "category:KATEGORIJA"
    const redisKey = `category:${category}`;
    await redisClient.rPush(redisKey, JSON.stringify(newsObj));

    // Postavi expire 7 dana na tu listu
    await redisClient.expire(redisKey, SEVEN_DAYS);

    // Dodaj ID u processed_ids
    await redisClient.sAdd("processed_ids", item.id);
    console.log(`[processFeeds] Upisano ID:${item.id} -> category:${category}`);
  }

  // Postavimo expire i na processed_ids
  await redisClient.expire("processed_ids", SEVEN_DAYS);

  console.log("[processFeeds] Završeno dodavanje novih feedova u Redis.");
}

/**
 * 4) Funkcija za spajanje *svih* feed-ova iz svih "category:*" listi
 */
async function getAllFeedsFromRedis() {
  const keys = await redisClient.keys("category:*");
  let all = [];

  for (const key of keys) {
    const items = await redisClient.lRange(key, 0, -1);
    const parsed = items.map(x => JSON.parse(x));
    all = all.concat(parsed);
  }

  // Mogući duplikati ako GPT nekad dodeli vest u više kategorija (retko, ali moguće)
  const mapById = {};
  for (const obj of all) {
    mapById[obj.id] = obj; // prepisujemo ako se ponovi isti ID
  }
  return Object.values(mapById);
}

// ------------------- RUTE ---------------------

app.get("/", (req, res) => {
  console.log("[Route /] Služenje index.html...");
  res.sendFile(path.join(__dirname, "index.html"));
});

/**
 * /api/feeds => spaja sve iz Redisa u jedan niz (svih kategorija).
 * Frontend će ih sortirati po datumu (najnoviji prvo).
 */
app.get("/api/feeds", async (req, res) => {
  console.log("[Route /api/feeds] Klijent traži sve feedove...");
  try {
    const all = await getAllFeedsFromRedis();
    console.log(`[Route /api/feeds] Vraćamo ${all.length} feedova`);
    res.json(all);
  } catch (error) {
    console.error("[Route /api/feeds] Greška:", error);
    res.status(500).send("Server error");
  }
});

/**
 * /api/feeds-by-category/:category => samo feedovi iz jedne kategorije
 */
app.get("/api/feeds-by-category/:category", async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Kategorija: ${category}`);
  try {
    const redisKey = `category:${category}`;
    const feedItems = await redisClient.lRange(redisKey, 0, -1);
    console.log(`[Route /api/feeds-by-category] Nađeno ${feedItems.length} stavki za ${category}`);
    const parsed = feedItems.map(x => JSON.parse(x));
    res.json(parsed);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Greška:`, error);
    res.status(500).send('Server error');
  }
});

// Pokrećemo server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Express] Server pokrenut na portu ${PORT}`);
});

// Periodično, npr. svakih 5 minuta, radimo processFeeds
setInterval(processFeeds, 5 * 60 * 1000);
// I odmah pri startu
processFeeds();
