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

// __dirname i __filename u ES modu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Serviramo statičke fajlove (scripts.js, css) iz "src" foldera
app.use('/src', express.static(path.join(__dirname, 'src')));

// Redis
const redisClient = createClient({
  url: process.env.REDIS_URL,
});
console.log("[Redis] Pokušaj povezivanja...");
redisClient.connect()
  .then(() => console.log("[Redis] Konektovan na Redis!"))
  .catch((err) => console.error("[Redis] Greška pri povezivanju:", err));

// URL do RSS feed-a
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";

// OpenAI GPT endpoint
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Preuzimanje feed-a sa RSS App
 */
async function fetchRSSFeed() {
  console.log("[fetchRSSFeed] Preuzimanje RSS sa:", RSS_FEED_URL);
  try {
    const resp = await axios.get(RSS_FEED_URL);
    const items = resp.data.items || [];
    console.log(`[fetchRSSFeed] Uspelo, broj item-a: ${items.length}`);
    return items;
  } catch (error) {
    console.error("[fetchRSSFeed] Greška:", error);
    return [];
  }
}

/**
 * Slanje serije feed-ova GPT-u za kategorizaciju
 */
async function sendBatchToGPT(feedBatch) {
  console.log("[sendBatchToGPT] Slanje batch-a GPT API-ju...");

  // Pripremimo "user" poruku (JSON)
  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.content_text || "",
  }));

  // Prompt za GPT
  const payload = {
    model: "gpt-4o-mini", // ili "gpt-4"
    messages: [
      {
        role: "system",
        content: `Ti si stručnjak za kategorizaciju vesti. Kategorizuj vesti isključivo u ove kategorije:
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

Potrudi se da **svaka** vest dobije jednu kategoriju iz ove liste. Vrati rezultat u JSON obliku niza,
gde je svaka stavka: { "id": "...", "category": "..." }`
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
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
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
 * Glavna funkcija: svaka 2 (ili 5) minuta, *ponovo* raspoređuje (re-kategorizuje) SVE feed-ove.
 * 1) Obrišemo stare "category:*" ključeve (da ne mešamo staru i novu raspodelu).
 * 2) Preuzmemo sav RSS (50 feedova).
 * 3) Pošaljemo GPT-u da ih kategorizuje.
 * 4) U Redis upisujemo: category:<kategorija> => [ feed-objekti ]
 */
async function processFeeds() {
  console.log("[processFeeds] Počinje RE-kategorizacija svih feedova...");

  // 1) Obrisati stare category:* ključeve
  const oldKeys = await redisClient.keys("category:*");
  for (const key of oldKeys) {
    await redisClient.del(key);
    console.log("[processFeeds] Obrisao stari ključ:", key);
  }

  // (Ako hoćete, možete obrisati i "processed_ids" ako ste ga ranije koristili)
  // await redisClient.del("processed_ids");

  // 2) Uzimamo sve feedove
  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Stiglo: ${allItems.length} stavki.`);

  if (allItems.length === 0) {
    console.log("[processFeeds] Nema stavki, prekidam.");
    return;
  }

  // 3) Šaljemo GPT-u sve
  let gptResponse = await sendBatchToGPT(allItems);
  if (!gptResponse) {
    console.log("[processFeeds] GPT vratio null/empty, prekid.");
    return;
  }

  // Ako je GPT vratio fenced code ```json ..., uklonimo
  if (gptResponse.startsWith("```json")) {
    gptResponse = gptResponse.replace(/^```json\n?/, '').replace(/```$/, '');
  }

  // Parsiramo JSON
  let classifications;
  try {
    classifications = JSON.parse(gptResponse);
    console.log("[processFeeds] GPT parse OK:", classifications);
  } catch (err) {
    console.error("[processFeeds] Greška pri parse GPT JSON:", err);
    return;
  }

  // ID -> Kategorija mapa
  const idToCategory = {};
  for (const c of classifications) {
    if (c.id && c.category) {
      idToCategory[c.id] = c.category;
    }
  }

  // 4) Upisujemo u Redis. Uz svaku vest pamtimo polja od original feed-a
  for (const item of allItems) {
    const category = idToCategory[item.id] || "Uncategorized";

    // Kreiramo finalni objekat
    const newsObj = {
      id: item.id,
      title: item.title,
      date_published: item.date_published || null,
      url: item.url || null,
      image: item.image || null,
      content_text: item.content_text || "",
      category
    };

    // rPush u listu: category:...
    await redisClient.rPush(`category:${category}`, JSON.stringify(newsObj));
    console.log(`[processFeeds] Upisano ID: ${item.id} -> category:${category}`);
  }

  console.log("[processFeeds] Završena re-kategorizacija svih feed-ova!");
}

/**
 * Pomoćna funkcija: spoji sve liste iz "category:*" u jedan niz
 * da imamo "sve feedove" (za /api/feeds).
 */
async function getAllFeedsFromRedis() {
  const keys = await redisClient.keys("category:*");
  let allItems = [];
  for (const key of keys) {
    const arr = await redisClient.lRange(key, 0, -1);
    const parsed = arr.map(x => JSON.parse(x));
    allItems = allItems.concat(parsed);
  }
  // Uklonimo duplikate po ID-u (ako GPT svrstao isti ID u dve kategorije, što je retko ali može da se dogodi)
  const mapById = {};
  for (const it of allItems) {
    mapById[it.id] = it;
  }
  return Object.values(mapById);
}

// ------------------- RUTE ---------------------

// Služenje index.html
app.get("/", (req, res) => {
  console.log("[Route /] Služenje index.html...");
  res.sendFile(path.join(__dirname, "index.html"));
});

// (A) Vraća *sve* feedove (spoj svih kategorija)
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

// (B) Vraća feedove samo iz tražene kategorije
app.get("/api/feeds-by-category/:category", async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Zahtev za kategoriju: ${category}`);
  try {
    const feedItems = await redisClient.lRange(`category:${category}`, 0, -1);
    console.log(`[Route /api/feeds-by-category] Nađeno ${feedItems.length} stavki u category:${category}`);
    const parsed = feedItems.map(i => JSON.parse(i));
    res.json(parsed);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Greška:`, error);
    res.status(500).send('Server error');
  }
});

// Pokretanje servera
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n[Express] Server pokrenut na portu ${PORT}`);
});

// Periodično (npr. svakih 5 minuta) re-kategorizujemo sve
setInterval(processFeeds, 5 * 60 * 1000);

// Pokrenemo i odmah pri startu
processFeeds();
