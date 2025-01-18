import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// __dirname u ES modu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Serviranje statičkih fajlova
app.use('/src', express.static(path.join(__dirname, 'src')));

// Kreiranje Redis klijenta
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

console.log("[Redis] Pokušaj povezivanja...");
redisClient.connect()
  .then(() => console.log("[Redis] Konektovan!"))
  .catch((err) => console.error("[Redis] Greška:", err));

const RSS_FEED_URL = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";

// (Fiktivni) GPT API
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// Fiktivna funkcija koja bi realno pozvala GPT, ali ovde samo loguje i vraća mock kategoriju
async function callGPTApi(item) {
  console.log(`[callGPTApi] Slanje item-a (ID: ${item.id}) ka GPT API...`);
  // Ovde bi išao pravi poziv, tipa:
  // const response = await axios.post(GPT_API_URL, {...});
  // console.log("[callGPTApi] Odgovor GPT API:", response.data);

  // Povratak fiktivne kategorije
  const mockCategory = "GPT_Suggested_Category";
  console.log(`[callGPTApi] (Mock) Kategorija za item "${item.title}" je: ${mockCategory}`);

  return mockCategory;
}

// Preuzimanje feedova sa RSS-a
async function fetchRSSFeed() {
  console.log("[fetchRSSFeed] Preuzimanje RSS feed-a:", RSS_FEED_URL);
  try {
    const response = await axios.get(RSS_FEED_URL);
    console.log("[fetchRSSFeed] Uspelo, broj item-a:", response.data.items?.length);
    return response.data.items || [];
  } catch (error) {
    console.error("[fetchRSSFeed] Greška:", error);
    return [];
  }
}

/**
 * Potpuno re-kategorizovanje:
 *  1) Obrišemo stare kategorije (lista u Redis-u) – da ne dupliramo
 *  2) Za svaki item zovemo GPT (fiktivno), dodelimo category i upišemo u Redis
 */
async function processFeeds() {
  console.log("[processFeeds] Pokrenuto re-kategorizovanje svih feed-ova...");

  const items = await fetchRSSFeed();
  console.log(`[processFeeds] Preuzeto total: ${items.length} feedova.`);

  // (Opcionalno) Uzmite listu kategorija iz nekog fajla ili definicije
  // ili pak generišite je iz GPT-a. Za primer, možemo obrisati sve ključeve
  // "category:*" da bismo očistili stare liste.
  console.log("[processFeeds] Brisanje starih kategorija u Redis-u...");
  // Ako znate tačno koje kategorije imate, možete za svaku zvati `DEL category:Name`
  // ili listing ključeva - ali `KEYS` komanda je "skupa" za produkciju, pa oprez.
  // Ovde za primer, brisaćemo sve "category:*":
  const oldCategoryKeys = await redisClient.keys("category:*");
  for (const key of oldCategoryKeys) {
    await redisClient.del(key);
    console.log(`[processFeeds] Obrisali smo stari ključ: ${key}`);
  }

  // Sada prolazimo kroz sve feedove
  for (const item of items) {
    // 1) Fiktivni GPT poziv
    const gptCat = await callGPTApi(item);

    // 2) Uzmemo originalnu kategoriju sa feeda ako postoji
    //    ili GPT, ili "Uncategorized"
    const category = item.category || gptCat || "Uncategorized";

    // Dodelimo je i u samom objektu, da klijent (Front) vidi `feed.category`.
    item.category = category;

    // 3) Upisujemo feed u "category:..." listu
    const redisKey = `category:${category}`;
    await redisClient.rPush(redisKey, JSON.stringify(item));
    console.log(`[processFeeds] Feed sa ID: ${item.id} upisan u "${redisKey}".`);
  }

  console.log("[processFeeds] Kraj re-kategorizacije. Svi itemi su raspoređeni.");
}

// Rute
app.get("/", (req, res) => {
  console.log("[Route /] Služenje index.html");
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/feeds", async (req, res) => {
  console.log("[Route /api/feeds] Zahtev za sve feedove (direktno sa RSS)...");
  try {
    const items = await fetchRSSFeed();
    console.log("[Route /api/feeds] Vraćamo klijentu:", items.length, "feedova.");
    res.json(items);
  } catch (error) {
    console.error("[Route /api/feeds] Greška:", error);
    res.status(500).send("Server error");
  }
});

app.get('/api/feeds-by-category/:category', async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Kategorija: ${category}`);
  try {
    // Čitamo sve iteme za traženu kategoriju
    const feedItems = await redisClient.lRange(`category:${category}`, 0, -1);
    console.log(`[Route /api/feeds-by-category] ${feedItems.length} item-a pronađeno u Redis-u.`);
    const parsedItems = feedItems.map(i => JSON.parse(i));
    res.json(parsedItems);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Greška:`, error);
    res.status(500).send('Server error');
  }
});

// Pokretanje servera
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server je startovan na portu ${PORT}`);
});

// Periodično (svakih 5 min) pokrećemo pun re-import i GPT kategorizaciju
console.log("[setInterval] Zakazano re-kategorizovanje svakih 5 min...");
setInterval(processFeeds, 5 * 60 * 1000);

// Inicijalno pokretanje pri startu servera
processFeeds();
