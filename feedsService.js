/************************************************
 * feedsService.js
 ************************************************/

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { createClient } from 'redis';
import sharp from 'sharp';
import pLimit from 'p-limit';

// OVO JE KLJUČNO da bude OVDE, pre upotrebe limit:
const limit = pLimit(3);

const SEVEN_DAYS = 60 * 60 * 24 * 7;
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// Redis konekcija
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

/**
 * Funkcija za uspostavljanje konekcije na Redis.
 */
export async function initRedis() {
  console.log("[Redis] Pokušaj povezivanja...");
  try {
    await redisClient.connect();
    console.log("[Redis] Konektovan na Redis!");
  } catch (err) {
    console.error("[Redis] Greška pri povezivanju:", err);
  }
}

/**
 * Funkcija koja preuzima glavni RSS feed.
 */
export async function fetchRSSFeed() {
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
 * Funkcija za slanje batch-a feed stavki GPT API-ju.
 */
async function sendBatchToGPT(feedBatch) {
  console.log("[sendBatchToGPT] Slanje serije stavki GPT API-ju...");

  // Skraćujemo opis radi manje potrošnje tokena
  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: (item.description || item.content_text || "").slice(0, 500)
  }));

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Ti si veštački inteligentni asistent specijalizovan za kategorizaciju vesti za projekat DACH News...`
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
    let gptText = response.data.choices?.[0]?.message?.content?.trim() || '';
    if (gptText.startsWith("```json")) {
      gptText = gptText.replace(/^```json\n?/, '').replace(/```$/, '');
    }
    return JSON.parse(gptText);
  } catch (error) {
    console.error("[sendBatchToGPT] Greška pri pozivu GPT API:", error?.response?.data || error.message);
    return null;
  }
}

/**
 * Funkcija za smanjivanje slike (320px, quality 100%) pomoću Sharp.
 */
async function smanjiSliku(buffer) {
  try {
    return await sharp(buffer)
      .resize(320, null, { fit: 'inside' })
      .jpeg({ quality: 100 })
      .toBuffer();
  } catch (error) {
    console.error("[smanjiSliku] Greška pri resize-u:", error);
    return null;
  }
}

/**
 * Čuva smanjenu sliku u Redis (base64).
 */
async function storeImageInRedis(imageUrl, id) {
  if (!imageUrl) return false;
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const optimized = await smanjiSliku(buffer);
    if (!optimized) return false;

    const base64 = optimized.toString('base64');
    await redisClient.set(`img:${id}`, base64);

    console.log(`[storeImageInRedis] Slika za ID:${id} uspešno snimljena (320px).`);
    return true;
  } catch (error) {
    console.error(`[storeImageInRedis] Greška pri snimanju slike za ID:${id}:`, error);
    return false;
  }
}

/**
 * Helper za izvlačenje domena iz URL-a.
 */
function extractSource(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return "unknown";
  }
}

/**
 * Dodavanje jedne vesti u Redis (nakon GPT kategorizacije).
 */
export async function addItemToRedis(item, category) {
  const newsObj = {
    id: item.id,
    title: item.title,
    date_published: item.date_published || null,
    url: item.url || null,
    content_text: item.content_text || "",
    category,
    source: (item.authors && item.authors.length > 0)
      ? item.authors[0].name
      : extractSource(item.url),
  };

  if (item.image) {
    const success = await storeImageInRedis(item.image, item.id);
    newsObj.image = success ? `/image/${item.id}` : item.image;
  } else {
    newsObj.image = null;
  }

  const redisKey = `category:${category}`;
  await redisClient.rPush(redisKey, JSON.stringify(newsObj));
  await redisClient.expire(redisKey, SEVEN_DAYS);

  // Obeležimo ID kao obrađen
  await redisClient.sAdd("processed_ids", item.id);
  await redisClient.expire("processed_ids", SEVEN_DAYS);

  console.log(`[addItemToRedis] Upisano ID:${item.id}, category:${category}`);
}

/**
 * getAllFeedsFromRedis - spaja poslednje 4 vesti iz svake category:* (sortirano).
 */
export async function getAllFeedsFromRedis() {
  const keys = await redisClient.keys("category:*");
  let combined = [];

  for (const key of keys) {
    // Dohvatamo poslednja 4 elementa iz svake Redis liste
    const items = await redisClient.lRange(key, -4, -1);
    const parsed = items.map(x => JSON.parse(x));
    combined = combined.concat(parsed);
  }

  // Uklanjamo duplikate
  const mapById = {};
  for (const obj of combined) {
    mapById[obj.id] = obj;
  }
  let all = Object.values(mapById);

  // Sortiramo desc po date_published
  all.sort((a,b) => {
    const dA = a.date_published ? new Date(a.date_published).getTime() : 0;
    const dB = b.date_published ? new Date(b.date_published).getTime() : 0;
    return dB - dA;
  });
  return all;
}

/**
 * processFeeds - glavni workflow
 */
export async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova...");
  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Ukupno preuzeto ${allItems.length} feedova.`);

  if (allItems.length === 0) {
    console.log("[processFeeds] Nema feedova za obradu, prekid.");
    return;
  }

  // Filtriramo nove
  let newItems = [];
  for (const item of allItems) {
    const alreadyProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (!alreadyProcessed) {
      newItems.push(item);
    }
  }
  newItems = [...new Map(newItems.map(item => [item.id, item])).values()];
  if (newItems.length === 0) {
    console.log("[processFeeds] Sve vesti su već obrađene.");
    return;
  }
  console.log(`[processFeeds] Nađeno ${newItems.length} novih vesti.`);

  if (newItems.length < 2) {
    console.log("[processFeeds] Manje od 2 nove vesti, preskačemo GPT za sada.");
    return;
  }

  const BATCH_SIZE = 20;
  for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
    const batch = newItems.slice(i, i + BATCH_SIZE);

    const gptResponse = await sendBatchToGPT(batch);
    if (!gptResponse || !Array.isArray(gptResponse)) {
      console.error("[processFeeds] GPT odgovor nevalidan. Sve ide u 'Uncategorized'.");
      for (const item of batch) {
        // concurrency limit
        await limit(() => addItemToRedis(item, "Uncategorized"));
      }
      continue;
    }

    // Mapiramo ID -> category
    const idToCat = {};
    gptResponse.forEach(c => {
      if (c.id && c.category) {
        idToCat[c.id] = c.category;
      }
    });

    // concurrency limit
    await Promise.all(
      batch.map(item => {
        const cat = idToCat[item.id] || "Uncategorized";
        return limit(() => addItemToRedis(item, cat));
      })
    );
  }

  console.log("[processFeeds] Završeno dodavanje novih feedova u Redis.");
}
