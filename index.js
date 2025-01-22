/************************************************
 * index.js
 ************************************************/
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { createPool } from 'generic-pool';     // Dodato
import { createClient } from 'redis';

const BASE_URL = 'https://dachnews.onrender.com';

// Pomoćne promenljive za __dirname u ES modulu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // <--- OVO je jedino kreiranje app
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Posluži statiku iz "src" (gde su scripts.js, css, itd.)
app.use('/src', express.static(path.join(__dirname, 'src')));

// ----------------------------------------------
// KONFIGURACIJA REDIS CONNECTION POOL
// ----------------------------------------------
const factory = {
  create: async () => {
    const client = createClient({
      url: process.env.REDIS_URL,
    });
    await client.connect();
    return client;
  },
  destroy: async (client) => {
    await client.disconnect();
  },
};

const opts = {
  max: 8,  // maksimalni broj konekcija
  min: 2
};

const redisPool = createPool(factory, opts);
console.log("[Redis] Connection pool kreiran.");

/**
 * Dohvati Redis client iz pool-a
 */
async function getRedisClient() {
  return redisPool.acquire();
}

/**
 * Vrati Redis client nazad u pool
 */
async function releaseRedisClient(client) {
  await redisPool.release(client);
}

const SEVEN_DAYS = 60 * 60 * 24 * 7;

// URL do RSS feed-a
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Preuzima ceo feed sa RSS.App
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
 * Preuzima LGBT+ feed
 */
async function fetchLGBTFeed() {
  const LGBT_FEED_URL = "https://rss.app/feeds/v1.1/_DZwHYDTztd0rMaNe.json";
  console.log("[fetchLGBTFeed] Preuzimanje LGBT+ RSS feed-a sa:", LGBT_FEED_URL);
  try {
    const response = await axios.get(LGBT_FEED_URL);
    const items = response.data.items || [];
    console.log(`[fetchLGBTFeed] Uspelo, broj vesti: ${items.length}`);
    return items;
  } catch (error) {
    console.error("[fetchLGBTFeed] Greška pri preuzimanju LGBT+ RSS feed-a:", error);
    return [];
  }
}

/**
 * Šaljemo *batch* feed stavki GPT-u (kategorizacija)
 */
async function sendBatchToGPT(feedBatch) {
  console.log("[sendBatchToGPT] Slanje serije stavki GPT API-ju...");

  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || item.content_text || ""
  }));

  const payload = {
    model: "gpt-4o-mini",
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

Pri kategorizaciji, obavezno vodi računa o specifičnostima tih zemalja i njihove političke, društvene i kulturne karakteristike. Ako vest sadrži informacije koje se jasno odnose na neku od gore navedenih kategorija, postavi je u odgovarajuću. Ako je vest o Donaldu Trampu, stavi je u kategoriju Welt. Pokušaj da budeš što precizniji u prepoznavanju ključnih reči i konteksta, posebno kada se radi o poznatim ličnostima ili važnim događajima koji mogu imati specifičnu kategoriju. Molim te vrati isključivo JSON niz gde je svaki element: { "id": "...", "category": "..." }`
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
    if (!gptText) return null;

    if (gptText.startsWith("```json")) {
      gptText = gptText.replace(/^```json\n?/, '').replace(/```$/, '');
    }
    return gptText;
  } catch (error) {
    console.error("[sendBatchToGPT] Greška pri pozivu GPT API:", error?.response?.data || error.message);
    return null;
  }
}

function extractSource(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch (error) {
    return "unknown";
  }
}

/**
 * processFeeds - dodaje samo *nove* vesti u Redis, uz pipelining
 */
async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova (dodavanje *novih* stavki)...");
  const client = await getRedisClient();  // Uzimamo konekciju iz pool-a

  try {
    const allItems = await fetchRSSFeed();
    console.log(`[processFeeds] Ukupno preuzeto ${allItems.length} feedova.`);

    if (allItems.length === 0) {
      console.log("[processFeeds] Nema feedova, prekid.");
      return;
    }

    // Odvajamo samo nove
    let newItems = [];
    for (const item of allItems) {
      const isProcessed = await client.sIsMember("processed_ids", item.id);
      if (!isProcessed) {
        newItems.push(item);
      }
    }

    // Sklanjamo duplikate
    newItems = [...new Map(newItems.map(item => [item.id, item])).values()];
    if (newItems.length === 0) {
      console.log("[processFeeds] Nema novih feedova. Sve je već procesirano.");
      return;
    }

    console.log(`[processFeeds] Nađeno ${newItems.length} novih feedova. Slanje GPT-u...`);

    const gptResponse = await sendBatchToGPT(newItems);
    if (!gptResponse) {
      console.error("[processFeeds] GPT odgovor je prazan ili null, prekidamo.");
      return;
    }

    let classifications;
    try {
      classifications = JSON.parse(gptResponse);
      if (!Array.isArray(classifications)) {
        classifications = [classifications];
      }
      console.log("[processFeeds] Parsiran GPT JSON:", classifications);
    } catch (error) {
      console.error("[processFeeds] Greška pri parse GPT JSON:", error);
      return;
    }

    const idToCategory = {};
    for (const c of classifications) {
      if (c.id && c.category) {
        idToCategory[c.id] = c.category;
      }
    }

    // pipeline (multi)
    const pipeline = client.multi();

    for (const item of newItems) {
      const category = idToCategory[item.id] || "Uncategorized";
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
                : extractSource(item.url),
      };

      const redisKey = `category:${category}`;
      pipeline.rPush(redisKey, JSON.stringify(newsObj));
      pipeline.expire(redisKey, SEVEN_DAYS);
      pipeline.sAdd("processed_ids", item.id);

      console.log(`[processFeeds] Upisano ID:${item.id} -> category:${category}`);
    }

    pipeline.expire("processed_ids", SEVEN_DAYS);
    await pipeline.exec();

    console.log("[processFeeds] Završeno dodavanje novih feedova u Redis (pipelining).");
  } catch (err) {
    console.error("[processFeeds] Greška:", err);
  } finally {
    await releaseRedisClient(client); // Otpustimo konekciju nazad u pool
  }
}

/**
 * getAllFeedsFromRedis - spajanje *svih* feed-ova iz "category:*" listi (pipelining).
 */
async function getAllFeedsFromRedis() {
  const client = await getRedisClient();
  try {
    const keys = await client.keys("category:*");
    if (!keys || keys.length === 0) return [];

    const pipeline = client.multi();
    keys.forEach((key) => {
      pipeline.lRange(key, 0, -1);
    });
    const results = await pipeline.exec();

    let all = [];
    results.forEach((entry) => {
      const [err, arr] = entry;
      if (!err && arr) {
        const parsed = arr.map(x => JSON.parse(x));
        all = all.concat(parsed);
      }
    });

    // Uklanjanje duplikata
    const mapById = {};
    for (const obj of all) {
      mapById[obj.id] = obj;
    }
    return Object.values(mapById);
  } catch (err) {
    console.error("[getAllFeedsFromRedis] Greška:", err);
    return [];
  } finally {
    await releaseRedisClient(client);
  }
}

/**
 * Route definicije
 */
app.get("/", (req, res) => {
  console.log("[Route /] Služenje index.html...");
  res.sendFile(path.join(__dirname, "index.html"));
});

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

app.get("/api/feeds-by-category/:category", async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Kategorija: ${category}`);
  const client = await getRedisClient();
  try {
    const redisKey = `category:${category}`;
    const feedItems = await client.lRange(redisKey, 0, -1);
    const parsed = feedItems.map(x => JSON.parse(x));
    console.log(`[Route /api/feeds-by-category] Nađeno ${parsed.length} stavki za ${category}`);
    res.json(parsed);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Greška:`, error);
    res.status(500).send('Server error');
  } finally {
    await releaseRedisClient(client);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Express] Server pokrenut na portu ${PORT}`);
});

function getRandomInterval() {
  const minMinutes = 12;
  const maxMinutes = 14;
  const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return randomMinutes * 60 * 1000;
}

// Periodično, npr. svakih ~13 minuta, radimo processFeeds
setInterval(processFeeds, getRandomInterval());
 // Ručno pokrećemo processFeeds() jednom na startu i logujemo broj upisanih stavki
 processFeeds().then(async () => {
   // Proveravamo koliko ima ključeva "category:*" u Redis-u
   const client = await getRedisClient();
   const keys = await client.keys("category:*");
   console.log(`[processFeeds] Na startu pronađeno ključeva: ${keys.length}`);
   await releaseRedisClient(client);
 });

/**
 * processLGBTFeed - Učitava LGBT+ feed u Redis (bez GPT), uz pipeline
 */
async function processLGBTFeed() {
  console.log("[processLGBTFeed] Početak obrade LGBT feed-a...");
  const client = await getRedisClient();
  try {
    const lgbtItems = await fetchLGBTFeed();
    console.log(`[processLGBTFeed] Preuzeto ${lgbtItems.length} vesti za LGBT+ kategoriju`);
    if (lgbtItems.length === 0) {
      console.log("[processLGBTFeed] Nema vesti za obradu.");
      return;
    }

    const pipeline = client.multi();
    const redisKey = `category:LGBT+`;

    for (const item of lgbtItems) {
      const alreadyProcessed = await client.sIsMember("processed_ids", item.id);
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
      pipeline.rPush(redisKey, JSON.stringify(newsObj));
      pipeline.sAdd("processed_ids", item.id);
      console.log(`[processLGBTFeed] Upisano ID:${item.id} u kategoriju LGBT+`);
    }
    pipeline.expire(redisKey, SEVEN_DAYS);
    pipeline.expire("processed_ids", SEVEN_DAYS);

    await pipeline.exec();
    console.log("[processLGBTFeed] Završena obrada LGBT feed-a (pipeline).");
  } catch (err) {
    console.error("[processLGBTFeed] Greška:", err);
  } finally {
    await releaseRedisClient(client);
  }
}

// Pozivanje processLGBTFeed odmah pri startu
processLGBTFeed();
// Zakazivanje periodičnog poziva za LGBT+ feed svakih 13 minuta
setInterval(processLGBTFeed, 13 * 60 * 1000);
