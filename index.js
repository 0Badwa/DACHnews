import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Postavljanje __dirname u ES module okruženju
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kreiraj Express aplikaciju
const app = express();

// Middleware za sigurnost (Helmet) i parsiranje JSON podataka
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Posluži statičke fajlove iz "src" foldera
app.use('/src', express.static(path.join(__dirname, 'src')));

// Redis konekcija
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

console.log("[Redis] Pokušaj povezivanja na Redis...");
redisClient.connect().then(() => {
  console.log("[Redis] Uspostavljena konekcija na Redis!");
}).catch((err) => {
  console.error('[Redis] Greška:', err);
});

// URL RSS feed-a
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";

// GPT API (nije trenutno implementiran, samo ćemo dodati console.log za primer)
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Primer fiktivne funkcije koja bi pozvala GPT API 
 * (trenutno samo loguje i vraća dummy vrednost).
 */
async function callGPTApi(item) {
  console.log(`[callGPTApi] Slanje item-a sa ID: ${item.id} i naslovom: "${item.title}" ka GPT API...`);
  // Ovde bi išao stvarni poziv, npr.:
  // const response = await axios.post(GPT_API_URL, { ... });
  // console.log("[callGPTApi] Odgovor GPT API:", response.data);

  // Izmišljen odgovor GPT-a
  const mockCategory = "GPT_Suggested_Category";
  console.log(`[callGPTApi] GPT API (mock) je vratio kategoriju: "${mockCategory}" za item "${item.title}"`);

  return mockCategory;
}

// Preuzima sirove feedove sa RSS App
async function fetchRSSFeed() {
  console.log("[fetchRSSFeed] Pokušaj preuzimanja RSS feed-a sa:", RSS_FEED_URL);
  try {
    const response = await axios.get(RSS_FEED_URL);
    console.log("[fetchRSSFeed] Uspešno preuzet RSS JSON:", response.data);

    // Vraćamo samo items ili prazan niz ako ne postoji
    return response.data.items || [];
  } catch (error) {
    console.error("[fetchRSSFeed] Greška pri preuzimanju RSS feed-a:", error);
    return [];
  }
}

// Procesiranje feedova (kategorizacija i čuvanje u Redis)
async function processFeeds() {
  console.log("[processFeeds] Inicijalno preuzimanje RSS feed-ova...");
  const items = await fetchRSSFeed();
  console.log(`[processFeeds] Broj preuzetih item-a: ${items.length}`);

  const newItems = [];

  // Prolazimo kroz iteme i proveravamo da li su već procesirani
  for (const item of items) {
    const id = item.id;
    const isProcessed = await redisClient.sIsMember("processed_ids", id);

    if (!isProcessed) {
      console.log(`[processFeeds] Novi item pronađen -> ID: ${id}, Title: "${item.title}"`);
      newItems.push(item);
    } else {
      console.log(`[processFeeds] Item već procesiran -> ID: ${id}`);
    }
  }

  if (newItems.length === 0) {
    console.log("[processFeeds] Nema novih item-a za obradu.");
    return;
  }

  // Sada prolazimo kroz nove iteme i upisujemo ih u Redis
  for (const item of newItems) {
    // Primer (fiktivni) poziva GPT API-ja da nam "predloži" kategoriju
    console.log(`[processFeeds] Slanje item-a (ID: ${item.id}) GPT API-ju za analizu...`);
    const gptSuggestedCategory = await callGPTApi(item);

    // Ovde možemo da kombinujemo originalnu kategoriju i GPT predlog
    // ali za primer, zadržaćemo originalnu ako postoji, ili "Uncategorized"
    // (Možete implementirati logiku spajanja dve vrednosti)
    const category = item.category || gptSuggestedCategory || "Uncategorized";

    console.log(`[processFeeds] Dodeljena kategorija za item (ID: ${item.id}): ${category}`);

    // Čuvamo item u Redis listu po kategoriji
    await redisClient.rPush(`category:${category}`, JSON.stringify(item));
    console.log(`[processFeeds] Item (ID: ${item.id}) sačuvan u Redis pod category:${category}`);

    // Dodajemo ID u set 'processed_ids' kako bismo obeležili da smo ga već obradili
    await redisClient.sAdd("processed_ids", item.id);
    console.log(`[processFeeds] ID: ${item.id} dodat u set 'processed_ids'`);
  }
}

// Rute
app.get("/", (req, res) => {
  console.log("[Route /] Služenje index.html glavne strane...");
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/feeds", async (req, res) => {
  console.log("[Route /api/feeds] Zahtev za sve feedove...");
  try {
    const items = await fetchRSSFeed();
    console.log("[Route /api/feeds] Slanje preuzetih feedova klijentu. Broj:", items.length);
    res.json(items);
  } catch (error) {
    console.error("[Route /api/feeds] Greška pri preuzimanju feedova:", error);
    res.status(500).send("Server error");
  }
});

app.get('/api/feeds-by-category/:category', async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Zahtev za kategoriju: ${category}`);
  try {
    // Uzimamo sve iteme iz Redis liste za tu kategoriju
    const feedItems = await redisClient.lRange(`category:${category}`, 0, -1);
    console.log(`[Route /api/feeds-by-category] Broj item-a u Redis za kategoriju '${category}':`, feedItems.length);

    const parsedItems = feedItems.map(item => JSON.parse(item));
    console.log(`[Route /api/feeds-by-category] Slanje item-a klijentu:`, parsedItems.length);
    res.json(parsedItems);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Greška pri preuzimanju vesti za kategoriju ${category}:`, error);
    res.status(500).send('Server error');
  }
});

// Start servera
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});

// Periodično procesiranje feedova svakih 5 minuta
console.log("[setInterval] Pokrećemo periodični (5min) poziv 'processFeeds'...");
setInterval(processFeeds, 5 * 60 * 1000);

// Prva inicijalna obrada odmah pri startu
processFeeds();
