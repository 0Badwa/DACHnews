// feedsService.js

import axios from 'axios';
import { createClient } from 'redis';
import sharp from 'sharp'; // Dodato
import dotenv from 'dotenv';
dotenv.config();

// Redis klijent
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

async function initRedis() {
  console.log("[Redis] Pokušaj povezivanja...");
  try {
    await redisClient.connect();
    console.log("[Redis] Konektovan na Redis!");
  } catch (err) {
    console.error("[Redis] Greška pri povezivanju:", err);
  }
}

// Funkcija za smanjenje slike (max 240px, JPEG kvalitet 80%)
async function smanjiSliku(buffer) {
  try {
    const data = await sharp(buffer)
      .resize(240, null, { fit: 'inside' }) // 240px širina, visina proporcionalna
      .jpeg({ quality: 80 })
      .toBuffer();
    return data;
  } catch (error) {
    console.error("[smanjiSliku] Greška pri resize-u:", error);
    return null;
  }
}

// Čuva smanjenu sliku u Redis, vraća true ako uspe
async function storeImageInRedis(imageUrl, id) {
  if (!imageUrl) return false;
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const optimized = await smanjiSliku(buffer);
    if (!optimized) return false;

    await redisClient.set(`img:${id}`, optimized); // Čuvamo bajt-niz
    console.log(`[storeImageInRedis] Slika za ID:${id} uspešno optimizovana i snimljena`);
    return true;
  } catch (error) {
    console.error(`[storeImageInRedis] Greška pri snimanju slike za ID:${id}:`, error);
    return false;
  }
}

// ------------------- OSTALE FUNKCIJE I RUTE ZA FEEDOVE ------------------- //

const SEVEN_DAYS = 60 * 60 * 24 * 7;
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";
const LGBT_FEED_URL = "https://rss.app/feeds/v1.1/_DZwHYDTztd0rMaNe.json";
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// (Ovde se nalaze ranije definisane funkcije: fetchRSSFeed, fetchLGBTFeed, etc.)
// ... ostale importovane i definisane stvari ...

// primer: sendBatchToGPT, addItemsToRedis, ... NE MENJAMO ako ne treba ...

// Glavna funkcija koja preuzima i obrađuje feed-ove
export async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova...");

  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Ukupno preuzeto ${allItems.length} feedova.`);

  if (allItems.length === 0) {
    console.log("[processFeeds] Nema feedova za obradu, prekid.");
    return;
  }

  // Filtriramo nove stavke (koje nisu u processed_ids) ...
  // ... (ovde ista logika kao pre) ...

  // Šaljemo GPT-u u batch-ovima ...
  // ... (sendBatchToGPT, addItemsToRedis, i sl)...

  // Kada upisujemo feed, ispred upisa:
  //   await storeImageInRedis(item.image, item.id);
  //   item.image = `/image/${item.id}`;

  // primer:
  // ...
  // for (const item of newItemsBatch) {
  //   const success = await storeImageInRedis(item.image, item.id);
  //   if (success) {
  //     item.image = `/image/${item.id}`;
  //   } else {
  //     item.image = null; // ili ostavimo fallback
  //   }
  //   // upišemo ostalo ...
  // }
  
  // U suštini, u addItemsToRedis kad formiramo newsObj, pre nego što ga upišemo u Redis listu:
  // newsObj.image = success ? `/image/${item.id}` : null;
}

// LGBT feed
export async function processLGBTFeed() {
  console.log("[processLGBTFeed] Početak obrade LGBT feed-a...");
  const lgbtItems = await fetchLGBTFeed();
  console.log(`[processLGBTFeed] Preuzeto ${lgbtItems.length} vesti za LGBT+ kategoriju`);

  if (lgbtItems.length === 0) {
    console.log("[processLGBTFeed] Nema vesti za obradu.");
    return;
  }

  // Pri upisu u Redis:
  //   storeImageInRedis(item.image, item.id)
  //   if uspe: item.image = `/image/${item.id}`;
  //   else: item.image = null;

  // ... ostalo nepromenjeno ...
}

// Ostale funkcije tipa getAllFeedsFromRedis, initRedis itd.

export async function fetchRSSFeed() {
  // ...
}
export async function fetchLGBTFeed() {
  // ...
}
// ...
