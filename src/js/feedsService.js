/************************************************
 * feedsService.js
 ************************************************/

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { createClient } from 'redis';
import sharp from 'sharp';

// Glavne konstante
const SEVEN_DAYS = 60 * 60 * 24 * 7;
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";
const LGBT_FEED_URL = "https://rss.app/feeds/v1.1/_DZwHYDTztd0rMaNe.json";
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
 * Funkcija koja preuzima glavni RSS feed (sa RSS.app).
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
 * Funkcija koja preuzima LGBT feed (dodatni izvor).
 */
export async function fetchLGBTFeed() {
  console.log("[fetchLGBTFeed] Preuzimanje LGBT+ RSS feed-a sa:", LGBT_FEED_URL);
  try {
    const response = await axios.get(LGBT_FEED_URL);
    const items = response.data.items || [];
    console.log(`[fetchLGBTFeed] Uspelo, broj vesti: ${items.length}`);
    return items;
  } catch (error) {
    console.error("[fetchLGBTFeed] Greška pri preuzimanju feed-a:", error);
    return [];
  }
}

/**
 * Funkcija za slanje batch-a feed stavki GPT API-ju radi kategorizacije.
 * (Ovde je samo primer, prilagodite svom GPT endpointu po potrebi.)
 */
async function sendBatchToGPT(feedBatch) {
  console.log("[sendBatchToGPT] Slanje serije stavki GPT API-ju...");
  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || item.content_text || ""
  }));

  const payload = {
    model: "gpt-4o-mini", // ili model po vašem izboru
    messages: [
      {
        role: "system",
        content: `Ti si veštački inteligentni asistent specijalizovan za kategorizaciju vesti...`
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
 * Funkcija za smanjivanje slike (rezanje na 320px, kvalitet 100%) pomoću Sharp.
 */
async function smanjiSliku(buffer) {
  try {
    const data = await sharp(buffer)
      .resize(320, null, { fit: 'inside' }) // 320px širina, visina proporcionalna
      .jpeg({ quality: 100 })
      .toBuffer();
    return data;
  } catch (error) {
    console.error("[smanjiSliku] Greška pri resize-u:", error);
    return null;
  }
}

/**
 * Čuva smanjenu sliku u Redis kao bajt-niz (pod ključem "img:<id>").
 */
async function storeImageInRedis(imageUrl, id) {
  if (!imageUrl) return false;
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const optimized = await smanjiSliku(buffer);
    if (!optimized) return false;

    await redisClient.set(`img:${id}`, optimized);
    console.log(`[storeImageInRedis] Slika za ID:${id} uspešno optimizovana i snimljena (320px, 100% kvalitet)`);
    return true;
  } catch (error) {
    console.error(`[storeImageInRedis] Greška pri snimanju slike za ID:${id}:`, error);
    return false;
  }
}

/**
 * Funkcija za upis pojedinačnog item-a u Redis (nakon GPT kategorizacije).
 * categoryKey = "category:<naziv>"
 */
async function addItemToRedis(item, category) {
  const newsObj = {
    id: item.id,
    title: item.title,
    date_published: item.date_published || null,
    url: item.url || null,
    content_text: item.content_text || "",
    category,
    source: (item.authors && item.authors.length > 0) ? item.authors[0].name : extractSource(item.url),
  };

  // Ako ima originalnu sliku, pokušamo da je smanjimo i upišemo
  // pa postavimo newsObj.image = `/image/${id}` ili null
  const success = await storeImageInRedis(item.image, item.id);
  if (success) {
    newsObj.image = `/image/${item.id}`;
  } else {
    newsObj.image = null; // ili fallback
  }

  const redisKey = `category:${category}`;
  await redisClient.rPush(redisKey, JSON.stringify(newsObj));
  await redisClient.expire(redisKey, SEVEN_DAYS);

  // dodaj u set processed_ids
  await redisClient.sAdd("processed_ids", item.id);
  await redisClient.expire("processed_ids", SEVEN_DAYS);
  console.log(`[addItemToRedis] Upisano ID:${item.id}, category:${category}`);
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
 * processFeeds - glavni workflow za glavni RSS feed.
 * 1) preuzmemo feed
 * 2) filtriramo nove vesti
 * 3) šaljemo batch GPT
 * 4) upisujemo u Redis po kategorijama
 */
export async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova...");
  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Ukupno preuzeto ${allItems.length} feedova.`);

  if (allItems.length === 0) {
    console.log("[processFeeds] Nema feedova za obradu, prekid.");
    return;
  }

  // filtriramo nove
  let newItems = [];
  for (const item of allItems) {
    const alreadyProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (!alreadyProcessed) {
      newItems.push(item);
    }
  }
  // uklonimo duplikate
  newItems = [...new Map(newItems.map(item => [item.id, item])).values()];
  if (newItems.length === 0) {
    console.log("[processFeeds] Sve vesti su već obrađene.");
    return;
  }
  console.log(`[processFeeds] Nađeno ${newItems.length} novih vesti.`);

  // batch-slanje GPT-u
  const BATCH_SIZE = 20;
  for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
    const batch = newItems.slice(i, i + BATCH_SIZE);
    const gptResponse = await sendBatchToGPT(batch);

    if (!gptResponse || !Array.isArray(gptResponse)) {
      console.error("[processFeeds] GPT odgovor je nevalidan. Stavljamo sve u Uncategorized.");
      // fallback sve -> "Uncategorized"
      for (const item of batch) {
        await addItemToRedis(item, "Uncategorized");
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

    // Upis u Redis
    for (const item of batch) {
      const cat = idToCat[item.id] || "Uncategorized";
      await addItemToRedis(item, cat);
    }
  }
  console.log("[processFeeds] Završeno dodavanje novih feedova u Redis.");
}

/**
 * processLGBTFeed - slično za LGBT feed, stavljamo sve direktno u "LGBT+" kategoriju.
 */
export async function processLGBTFeed() {
  console.log("[processLGBTFeed] Početak obrade LGBT feed-a...");
  const lgbtItems = await fetchLGBTFeed();
  console.log(`[processLGBTFeed] Preuzeto ${lgbtItems.length} vesti za LGBT+ kategoriju`);

  if (lgbtItems.length === 0) {
    console.log("[processLGBTFeed] Nema vesti za obradu.");
    return;
  }

  for (const item of lgbtItems) {
    const alreadyProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (alreadyProcessed) {
      continue; // preskačemo
    }
    // Bez GPT, sve -> "LGBT+"
    await addItemToRedis(item, "LGBT+");
  }
  console.log("[processLGBTFeed] Završena obrada LGBT feed-a.");
}

/**
 * getAllFeedsFromRedis - spaja sve vesti iz category:* listi (uklanja dupl. ID).
 */
export async function getAllFeedsFromRedis() {
  const keys = await redisClient.keys("category:*");
  let all = [];
  for (const key of keys) {
    const items = await redisClient.lRange(key, 0, -1);
    const parsed = items.map(x => JSON.parse(x));
    all = all.concat(parsed);
  }
  const mapById = {};
  for (const obj of all) {
    mapById[obj.id] = obj;
  }
  return Object.values(mapById);
}
