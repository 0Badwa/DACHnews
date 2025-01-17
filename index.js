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
    contentSecurityPolicy: false, // Isključeno da dozvoli učitavanje eksternih resursa
  })
);
app.use(express.json());

// Posluži statičke fajlove iz "src" foldera
app.use('/src', express.static(path.join(__dirname, 'src')));

// Redis konekcija
const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.connect().catch((err) => console.error('Redis greška:', err));

// URL za RSS feed i GPT API
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// Funkcija za preuzimanje RSS feed-a
async function fetchRSSFeed() {
  try {
    const response = await axios.get(RSS_FEED_URL);
    return response.data.items || [];
  } catch (error) {
    console.error("Greška pri preuzimanju RSS feed-a:", error);
    return [];
  }
}

// Funkcija za slanje grupe feed-ova GPT API-ju i vraćanje rezultata
async function sendBatchToGPT(feedBatch) {
  const combinedContent = feedBatch.map((item) => {
    return {
      id: item.id,
      title: item.title,
      description: item.description
    };
  });

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Klasifikuj vesti u sledeće kategorije: Technologie, Gesundheit, Sport, Wirtschaft, Kultur, Auto, Reisen, Lifestyle, Panorama, Politik, Unterhaltung, Welt, LGBT. Vrati rezultat u validnom JSON formatu gde je svaki element objekat sa poljima 'id' i 'category'."
      },
      {
        role: "user",
        content: JSON.stringify(combinedContent)
      }
    ],
    max_tokens: 1500
  };

  try {
    const response = await axios.post(GPT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    return response.data.choices[0]?.message?.content?.trim();
  } catch (error) {
    console.error("Greška pri slanju GPT API-ju:", error);
    return null;
  }
}

// Funkcija za procesiranje i čuvanje novih vesti
async function processFeeds() {
  const items = await fetchRSSFeed();

  const newItems = [];
  for (const item of items) {
    const id = item.id;
    const title = item.title;
    const description = item.content_text || "";

    // Proveri da li je ID već obrađen
    const isProcessed = await redisClient.sIsMember("processed_ids", id);
    if (isProcessed) continue;

    newItems.push({ id, title, description });
  }

  if (newItems.length === 0) return;

  const gptResponse = await sendBatchToGPT(newItems);
  console.log("GPT batch result:", gptResponse);

  if (gptResponse) {
    let classifications;
    try {
      classifications = JSON.parse(gptResponse);
    } catch (e) {
      console.error("Greška pri parsiranju GPT odgovora:", e);
      return;
    }

    const idCategoryMap = {};
    classifications.forEach(item => {
      if (item.id && item.category) {
        idCategoryMap[item.id] = item.category;
      }
    });

    for (const feedItem of newItems) {
      const category = idCategoryMap[feedItem.id] || "Uncategorized";
      const newsItem = {
        id: feedItem.id,
        title: feedItem.title,
        description: feedItem.description,
        category,
      };
      await redisClient.sAdd("processed_ids", feedItem.id);
      await redisClient.rPush(`category:${category}`, JSON.stringify(newsItem));
    }
  }
}

// Ruta za osnovni URL (učitava HTML stranicu)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Ruta za preuzimanje i keširanje RSS feedova
app.get("/api/feeds", async (req, res) => {
  const cacheKey = "rss_feeds";

  try {
    let data = await redisClient.get(cacheKey);

    if (!data) {
      console.log("Preuzimanje feedova sa izvora:", RSS_FEED_URL);
      const response = await axios.get(RSS_FEED_URL);
      data = response.data;
      await redisClient.set(cacheKey, JSON.stringify(data), { EX: 604800 }); // Keširaj na 7 dana
    } else {
      data = JSON.parse(data);
    }

    res.json(data);
  } catch (error) {
    console.error("Greška pri preuzimanju feedova:", error);
    res.status(500).send("Server error");
  }
});

// Ruta za feedove po kategoriji
app.get('/api/feeds-by-category/:category', async (req, res) => {
  const category = req.params.category;
  try {
    const feedItems = await redisClient.lRange(`category:${category}`, 0, -1);
    const parsedItems = feedItems.map(item => JSON.parse(item));
    res.json(parsedItems);
  } catch (error) {
    console.error(`Greška pri preuzimanju vesti za kategoriju ${category}:`, error);
    res.status(500).send('Server error');
  }
});

// Pokreni proces osvežavanja svakih 5 minuta
setInterval(processFeeds, 5 * 60 * 1000);
processFeeds();

// Pokreni server na portu određenom od strane Render-a ili lokalno na 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});
