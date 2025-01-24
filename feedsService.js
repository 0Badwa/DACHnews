// feedsService.js
/**
 * Fajl koji sadrži funkcije za preuzimanje, obradu i čuvanje feed-ova u Redis.
 * Ovde je izdvojena sva poslovna logika kako bi index.js ostao čist i fokusiran na rute.
 */

import axios from 'axios';
import { createClient } from 'redis';

// Konstantne vrednosti
const SEVEN_DAYS = 60 * 60 * 24 * 7;
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";
const LGBT_FEED_URL = "https://rss.app/feeds/v1.1/_DZwHYDTztd0rMaNe.json";
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";
const BATCH_SIZE = 20; // Veličina batch-a za slanje GPT API-ju

// Redis klijent
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

/**
 * Funkcija za pokretanje konekcije na Redis.
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
 * Pomoćna funkcija za izdvajanje izvora (domena) iz URL-a.
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
 * Funkcija za preuzimanje RSS feed-a (glavni feed) sa RSS.app.
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
 * Funkcija za preuzimanje LGBT+ RSS feed-a sa RSS.app (zaseban izvor).
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
 * Funkcija za slanje jednog batch-a feed stavki GPT API-ju radi kategorizacije.
 * Vraća parsirani JSON ili null ako dođe do greške.
 */
export async function sendBatchToGPT(feedBatch) {
  console.log("[sendBatchToGPT] Slanje serije stavki GPT API-ju...");

  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || item.content_text || ""
  }));

  const payload = {
    model: "gpt-4o-mini", // Pretpostavka da je model dostupan
    messages: [
      {
        role: "system",
        content: `Ti si veštački inteligentni asistent specijalizovan za kategorizaciju vesti za projekat DACH News, koji se fokusira na vesti za tri zemlje: Nemačku, Austriju i Švajcarsku. Vesti koje obrađuješ biće na nemačkom jeziku, i potrebno je da ih kategorizuješ u jednu od sledećih kategorija:
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

Pri kategorizaciji, obavezno vodi računa o specifičnostima tih zemalja. Ako vest sadrži informacije koje se jasno odnose na neku od gore navedenih kategorija, postavi je u odgovarajuću. Ako je vest o Donaldu Trampu, stavi je u kategoriju Welt. Molim te vrati isključivo JSON niz gde je svaki element: { "id": "...", "category": "..." }`
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

    let gptText = response.data.choices?.[0]?.message?.content?.trim();
    console.log("[sendBatchToGPT] GPT raw odgovor:", gptText);

    // Ako sadrži ```json u output-u, uklanjamo formatiranje
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
 * Funkcija za dodavanje stavki u Redis (ukoliko je GPT uspeo da vrati validnu kategorizaciju).
 */
async function addItemsToRedis(items, categoriesMap) {
  for (const item of items) {
    const category = categoriesMap[item.id] || "Uncategorized"; // Fallback ako nema kategorije
    const newsObj = {
      id: item.id,
      title: item.title,
      date_published: item.date_published || null,
      url: item.url || null,
      image: item.image || null,
      content_text: item.content_text || "",
      category,
      source: (item.authors && item.authors.length > 0) 
        ? item.authors[0].name 
        : extractSource(item.url)
    };

    const redisKey = `category:${category}`;
    try {
      await redisClient.rPush(redisKey, JSON.stringify(newsObj));
      await redisClient.sAdd("processed_ids", item.id);
      console.log(`[processFeeds] Upisano ID:${item.id} -> category:${category}`);
      await redisClient.expire(redisKey, SEVEN_DAYS);
    } catch (err) {
      console.error(`[processFeeds] Greška pri upisu u Redis za ID:${item.id}:`, err);
    }
  }
}

/**
 * Glavna funkcija za obradu feed-ova:
 * 1. Preuzimamo novi RSS feed
 * 2. Uzimamo samo nove stavke (koje nisu u processed_ids)
 * 3. Delimo ih u batch-ove od BATCH_SIZE i šaljemo GPT-u
 * 4. Čuvamo rezultate u Redis
 */
export async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova...");

  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Ukupno preuzeto ${allItems.length} feedova.`);

  if (allItems.length === 0) {
    console.log("[processFeeds] Nema feedova za obradu, prekid.");
    return;
  }

  // Filtriramo nove stavke
  const newItems = [];
  for (const item of allItems) {
    const alreadyProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (!alreadyProcessed) {
      newItems.push(item);
    }
  }

  // Uklanjamo duplikate po ID-u
  const uniqueItems = [...new Map(newItems.map(item => [item.id, item])).values()];
  if (uniqueItems.length === 0) {
    console.log("[processFeeds] Nema novih feedova. Sve je već procesirano.");
    return;
  }
  console.log(`[processFeeds] Nađeno ${uniqueItems.length} novih feedova.`);

  // Delimo u batch-ove i šaljemo GPT-u
  for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
    const batch = uniqueItems.slice(i, i + BATCH_SIZE);
    console.log(`[processFeeds] Slanje batch-a GPT-u, veličina: ${batch.length}`);

    // GPT odgovor
    const gptData = await sendBatchToGPT(batch);

    if (!gptData || !Array.isArray(gptData)) {
      console.error("[processFeeds] GPT odgovor je nevalidan, sve ide u 'Uncategorized'.");
      // Ako GPT nije uspeo, sve stavke iz ovog batch-a
      // stavljamo u Uncategorized.
      const fallbackMap = batch.reduce((acc, item) => {
        acc[item.id] = "Uncategorized";
        return acc;
      }, {});
      await addItemsToRedis(batch, fallbackMap);
      continue;
    }

    // Mapiramo ID->kategorija
    const idToCategory = {};
    gptData.forEach(c => {
      if (c.id && c.category) {
        idToCategory[c.id] = c.category;
      }
    });

    // Snimamo u Redis
    await addItemsToRedis(batch, idToCategory);
  }

  // Postavimo expire za processed_ids
  await redisClient.expire("processed_ids", SEVEN_DAYS);
  console.log("[processFeeds] Završeno dodavanje novih feedova u Redis.");
}

/**
 * Funkcija za učitavanje *svih* feedova iz Redis-a (iz svih category:* listi).
 */
export async function getAllFeedsFromRedis() {
  const keys = await redisClient.keys("category:*");
  let all = [];

  for (const key of keys) {
    const items = await redisClient.lRange(key, 0, -1);
    const parsed = items.map(x => JSON.parse(x));
    all = all.concat(parsed);
  }

  // Uklonimo duplikate po ID-u
  const mapById = {};
  for (const obj of all) {
    mapById[obj.id] = obj;
  }
  return Object.values(mapById);
}

/**
 * Funkcija za obradu LGBT feed-a (bez GPT kategorizacije, sve ide u LGBT+).
 */
export async function processLGBTFeed() {
  console.log("[processLGBTFeed] Početak obrade LGBT feed-a...");
  const lgbtItems = await fetchLGBTFeed();
  console.log(`[processLGBTFeed] Preuzeto ${lgbtItems.length} vesti za LGBT+ kategoriju`);

  if (lgbtItems.length === 0) {
    console.log("[processLGBTFeed] Nema vesti za obradu.");
    return;
  }

  const redisKey = `category:LGBT+`;
  for (const item of lgbtItems) {
    const alreadyProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (alreadyProcessed) {
      console.log(`[processLGBTFeed] Vest sa ID:${item.id} je već obrađena, preskačem.`);
      continue;
    }

    const newsObj = {
      id: item.id,
      title: item.title,
      date_published: item.date_published || null,
      url: item.url || null,
      image: item.image || null,
      content_text: item.content_text || "",
      category: "LGBT+",
      source: item.source || extractSource(item.url)
    };

    try {
      await redisClient.rPush(redisKey, JSON.stringify(newsObj));
      await redisClient.sAdd("processed_ids", item.id);
      console.log(`[processLGBTFeed] Upisano ID:${item.id} u kategoriju LGBT+`);
    } catch (error) {
      console.error(`[processLGBTFeed] Greška pri upisu ID:${item.id}`, error);
    }
  }

  await redisClient.expire(redisKey, SEVEN_DAYS);
  console.log("[processLGBTFeed] Završena obrada LGBT feed-a.");
}
