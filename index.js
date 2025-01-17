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

// Funkcija za slanje zahteva GPT API-ju za jedan naslov i opis
async function sendToGPT(title, description) {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Vrati rezultat u formatu 'id=kategorija' za naslov i opis vesti. Dostupne kategorije su: Technologie, Gesundheit, Sport, Wirtschaft, Kultur, Auto, Reisen, Lifestyle, Panorama, Politik, Unterhaltung, Welt, LGBT."
      },
      {
        role: "user",
        content: `Naslov: "${title}". Opis: "${description}".`
      }
    ],
    max_tokens: 50
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

  for (const item of items) {
    const id = item.id;
    const title = item.title;
    const description = item.content_text || "";

    // Proveri da li je ID već obrađen
    const isProcessed = await redisClient.sIsMember("processed_ids", id);
    if (isProcessed) continue;

    // Pošalji podatke GPT API-ju
    const result = await sendToGPT(title, description);
    console.log("GPT result:", result); // Log za testiranje
    if (result) {
      const [newsId, category] = result.split("=");
      if (newsId && category) {
        // Dodavanje u Redis sa kategorijom
        const newsItem = {
          id,
          title,
          description,
          category, // Dodajemo kategoriju
        };
        await redisClient.sAdd("processed_ids", id);
        await redisClient.rPush(`category:${category}`, JSON.stringify(newsItem));
      }
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
      await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600 }); // Keširaj na 1 sat
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

// Funkcija za kreiranje kartice za vest
function createNewsCard(feed) {
  const newsCard = document.createElement('div');
  newsCard.className = 'news-card';
  newsCard.innerHTML = `
    <h3 class="news-title">${feed.title}</h3>
    <p class="news-category">Kategorija: ${feed.category || 'Uncategorized'}</p>
    <p class="news-date">
      ${feed.date_published ? new Date(feed.date_published).toLocaleDateString() : 'N/A'}
    </p>
    <img class="news-image" src="${feed.image || 'https://via.placeholder.com/150'}" alt="${feed.title}">
    <p class="news-content">${feed.description || ''}</p>
    <a class="news-link" href="${feed.url}" target="_blank">Pročitaj više</a>
  `;
  return newsCard;
}

// Pokreni proces osvežavanja svakih 5 minuta
setInterval(processFeeds, 5 * 60 * 1000);
processFeeds();

// Pokreni server na portu određenom od strane Render-a ili lokalno na 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});
