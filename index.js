import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Pomoćne promenljive za __dirname u ES module okruženju
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kreiraj Express app
const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Posluži statičke fajlove (scripts.js, CSS, itd.)
app.use('/src', express.static(path.join(__dirname, 'src')));

// Redis konekcija
const redisClient = createClient({
  url: process.env.REDIS_URL,
});
console.log("[Redis] Pokušaj povezivanja...");
redisClient.connect()
  .then(() => console.log("[Redis] Konektovan na Redis!"))
  .catch((err) => console.error("[Redis] Greška pri povezivanju:", err));

// URL RSS feed-a
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";

// URL GPT API-ja
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * 1) Preuzima ceo feed sa RSS.App
 */
async function fetchRSSFeed() {
  console.log("[fetchRSSFeed] Preuzimanje RSS feed-a sa:", RSS_FEED_URL);
  try {
    const response = await axios.get(RSS_FEED_URL);
    const items = response.data.items || [];
    console.log(`[fetchRSSFeed] Uspelo. Broj vesti: ${items.length}`);
    return items;
  } catch (error) {
    console.error("[fetchRSSFeed] Greška pri preuzimanju RSS feed-a:", error);
    return [];
  }
}

/**
 * 2) Šaljemo *batch* feed stavki GPT-u, da dobijemo kategorizaciju
 *    - GPT treba da vrati JSON: [{ id: "...", category: "..." }, ...]
 */
async function sendBatchToGPT(feedBatch) {
  console.log("[sendBatchToGPT] Slanje serije stavki GPT API-ju...");

  // Kombinujemo polja koja su relevantna za kategorizaciju
  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || item.content_text || ""
  }));

  // Prompt i poruke za GPT
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Ti si stručnjak za kategorizaciju vesti. Kategorizuj SVE vesti isključivo u ove kategorije:
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

Potrudi se da baš svaka vest mora dobiti neku kategoriju iz ove liste (nema "Uncategorized"). Vrati rezultat u validnom JSON nizu, gde je svaka stavka objekat oblika:
{
  "id": "...",
  "category": "..."
}`
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
    // Poziv OpenAI endpointu
    const response = await axios.post(GPT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`, // Mora imati vaš OpenAI ključ
        "Content-Type": "application/json"
      }
    });

    // GPT nam vraća text iz "choices[0].message.content"
    const gptText = response.data.choices?.[0]?.message?.content?.trim();
    console.log("[sendBatchToGPT] GPT raw odgovor:", gptText);
    return gptText;
  } catch (error) {
    console.error("[sendBatchToGPT] Greška pri pozivu GPT API-ja:", error?.response?.data || error.message);
    return null;
  }
}

/**
 * 3) processFeeds - glavni posao:
 *    - Uzimamo sve feed stavke
 *    - Odvajamo "nove" (koje nisu u 'processed_ids')
 *    - Šaljemo batch GPT-u da dobijemo kategorije
 *    - Upisujemo ih u Redis: category:<naziv> = [ ...items... ]
 */
async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova (kategorizacija)...");

  // 3.1) Uzimamo sve stavke sa RSS feeda
  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Sve ukupno stiglo: ${allItems.length} stavki.`);

  // 3.2) Filtriramo *nove* stavke
  const newItems = [];
  for (const item of allItems) {
    const isProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (!isProcessed) {
      // Ako nije već procesirano, dopunimo "description" polje
      const description = item.content_text || "";
      newItems.push({
        id: item.id,
        title: item.title,
        description,
        // Pamtimo i original feedItem ako treba kasnije
        originalItem: item
      });
    }
  }

  if (newItems.length === 0) {
    console.log("[processFeeds] Nema novih vesti za GPT kategorizaciju.");
    return;
  }

  console.log(`[processFeeds] Imamo ${newItems.length} novih vesti. Slanje GPT-u...`);

  // 3.3) Pozovemo GPT da ih kategorizuje
  let gptResponse = await sendBatchToGPT(newItems);
  if (!gptResponse) {
    console.error("[processFeeds] Nema validnog odgovora GPT-a. Prekidamo.");
    return;
  }

  // Ako se dogodi da GPT vrati fenced code "```json ... ```", uklonimo to
  if (gptResponse.startsWith("```json")) {
    gptResponse = gptResponse.replace(/^```json\n?/, '').replace(/```$/, '');
  }

  let classifications;
  try {
    classifications = JSON.parse(gptResponse);
    console.log("[processFeeds] Parsiran JSON iz GPT:", classifications);
  } catch (error) {
    console.error("[processFeeds] Greška pri parsiranju GPT odgovora u JSON:", error);
    return;
  }

  // 3.4) Napravimo mapu ID->kategorija
  const idCategoryMap = {};
  for (const c of classifications) {
    if (c.id && c.category) {
      idCategoryMap[c.id] = c.category;
    }
  }

  // 3.5) Za svaku novu stavku, smeštamo je u Redis
  //      i oznaka da smo procesirali taj ID.
  for (const feedItem of newItems) {
    const category = idCategoryMap[feedItem.id] || "Uncategorized"; 
    // Možda GPT nije vratio, pa fallback.
    
    // Napravimo finalni objekat koji želimo da čuvamo
    const newsObj = {
      id: feedItem.id,
      title: feedItem.title,
      description: feedItem.description,
      category,
      // Preuzmemo i originalan datum, sliku, link ako vam treba
      date_published: feedItem.originalItem.date_published || null,
      url: feedItem.originalItem.url || null,
      image: feedItem.originalItem.image || null,
      content_text: feedItem.originalItem.content_text || null
    };

    // Upis u Redis listu: "category:Sport", "category:Kultur", ...
    await redisClient.rPush(`category:${category}`, JSON.stringify(newsObj));
    console.log(`[processFeeds] Sačuvan feed (ID: ${feedItem.id}) pod category:${category}`);

    // Dodamo id u set "processed_ids"
    await redisClient.sAdd("processed_ids", feedItem.id);
  }

  console.log("[processFeeds] Završena obrada feed-ova. Sve nove vesti su snimljene u Redis.");
}

/**
 * 4) Pomoćna: /api/feeds da vrati *sve* stavke iz svih kategorija 
 *    (kako bi klijentu prikazao “Home”).
 */
async function getAllFeedsFromRedis() {
  // Tražimo sve ključeve oblika "category:*"
  const keys = await redisClient.keys("category:*");
  let allItems = [];

  for (const key of keys) {
    const items = await redisClient.lRange(key, 0, -1);
    const parsed = items.map(str => JSON.parse(str));
    allItems = allItems.concat(parsed);
  }

  // Eventualno uklonimo duplikate (ako isti ID upadne u dve kategorije)
  // Obezbeđujemo da "All" zaista sadrži sve feedove.
  const uniqueMap = {};
  for (const item of allItems) {
    uniqueMap[item.id] = item;  // prepisujemo, ako se pojavi isti id
  }
  return Object.values(uniqueMap);
}

// ------------------ RUTE ---------------------

// Služenje početne strane
app.get("/", (req, res) => {
  console.log("[Route /] Služenje index.html...");
  res.sendFile(path.join(__dirname, "index.html"));
});

// (A) "Svi feedovi" = spajamo sve kategorije iz Redisa
app.get("/api/feeds", async (req, res) => {
  console.log("[Route /api/feeds] Zahtev klijenta za *sve* feedove...");
  try {
    const allFeeds = await getAllFeedsFromRedis();
    console.log(`[Route /api/feeds] Vraćamo ${allFeeds.length} feedova klijentu.`);
    res.json(allFeeds);
  } catch (error) {
    console.error("[Route /api/feeds] Greška:", error);
    res.status(500).send("Server error");
  }
});

// (B) "Po kategoriji"
app.get("/api/feeds-by-category/:category", async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Kategorija: ${category}`);
  try {
    const feedItems = await redisClient.lRange(`category:${category}`, 0, -1);
    console.log(`[Route /api/feeds-by-category] Nađeno ${feedItems.length} stavki u Redis-u za ${category}.`);

    const parsedItems = feedItems.map(item => JSON.parse(item));
    res.json(parsedItems);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Greška za kategoriju ${category}:`, error);
    res.status(500).send('Server error');
  }
});

// Pokretanje servera
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n[Express] Server pokrenut na portu ${PORT}\n`);
});

// Periodično (svakih 5 min) da procesiramo feed
setInterval(processFeeds, 5 * 60 * 1000);

// Odmah pokrenemo obradu pri startu
processFeeds();
