require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');

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

// Funkcija za slanje zahteva GPT API-ju
async function sendToGPT(title, description) {
  try {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Vrati rezultat u formatu 'id=kategorija' za naslov i opis vesti. Dostupne kategorije su: Technologie, Gesundheit, Sport, Wirtschaft, Kultur, Auto, Reisen, Lifestyle, Panorama, Politik, Unterhaltung, Welt, LGBT."
        },
        {
          role: "user",
          content: `Naslov: \"${title}\". Opis: \"${description}\".`
        }
      ],
      max_tokens: 50
    };

    const response = await axios.post(GPT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    return response.data.choices[0].message.content.trim();
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
    if (result) {
      // Čuvaj rezultat u Redis-u
      const [newsId, category] = result.split('=');
      if (newsId && category) {
        await redisClient.sAdd("processed_ids", id);
        await redisClient.rPush(`category:${category}`, JSON.stringify({ id, title, description }));
      }
    }
  }
}

// Ruta za osnovni URL (učitava HTML stranicu)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta za preuzimanje i keširanje RSS feedova
app.get('/api/feeds', async (req, res) => {
  const cacheKey = 'rss_feeds';

  try {
    let data = await redisClient.get(cacheKey);

    if (!data) {
      console.log('Preuzimanje feedova sa izvora:', RSS_FEED_URL);
      const response = await axios.get(RSS_FEED_URL);
      data = response.data;
      await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600 }); // Keširaj na 1 sat
    } else {
      data = JSON.parse(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Greška pri preuzimanju feedova:', error);
    res.status(500).send('Server error');
  }
});

// Ruta za kategorizaciju feedova putem GPT API-ja
app.post('/api/categorize', async (req, res) => {
  const { feeds } = req.body;

  if (!feeds || !Array.isArray(feeds)) {
    return res.status(400).send('Invalid input');
  }

  const validFeeds = feeds.filter(
    (feed) => feed.id && feed.title && feed.content_text && feed.content_text.trim().length > 0
  );

  if (validFeeds.length === 0) {
    return res.status(400).send('Nema validnih feedova za analizu.');
  }

  try {
    const results = await Promise.all(
      validFeeds.map((feed) => sendToGPT(feed.title, feed.content_text).then(category => ({
        id: feed.id,
        title: feed.title,
        category,
      })))
    );

    res.json(results);
  } catch (error) {
    console.error('Greška pri kategorizaciji:', error);
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
