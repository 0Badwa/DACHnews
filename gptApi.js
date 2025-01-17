// gptapi.js

// 1) Učitaj potrebne biblioteke
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Redis = require('ioredis');

// 2) Kreiraj Redis konekciju; obično se čita iz .env (REDIS_URL)
const redis = new Redis(process.env.REDIS_URL);

// 3) Definiši URL RSS feed-a i GPT API-ja
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// 4) Funkcija za preuzimanje RSS feed-a
async function fetchRSSFeed() {
  try {
    const response = await axios.get(RSS_FEED_URL);
    return response.data.items || [];
  } catch (error) {
    console.error("Greška pri preuzimanju RSS feed-a:", error);
    return [];
  }
}

// 5) Funkcija za slanje zahteva GPT API-ju
async function sendToGPT(title, description) {
  try {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: 
            "Vrati rezultat u formatu 'id=kategorija' za naslov i opis vesti. " +
            "Dostupne kategorije su: Technologie, Gesundheit, Sport, Wirtschaft, " + 
            "Kultur, Auto, Reisen, Lifestyle, Panorama, Politik, Unterhaltung, " +
            "Welt, LGBT."
        },
        {
          role: "user",
          content: `Naslov: "${title}". Opis: "${description}".`
        }
      ],
      max_tokens: 50
    };

    const response = await axios.post(GPT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`, // uzima se iz .env
        "Content-Type": "application/json",
      },
    });

    // Očekujemo da je odgovor u formatu "id=kategorija"
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Greška pri slanju GPT API-ju:", error);
    return null;
  }
}

// 6) Funkcija za procesiranje i čuvanje novih vesti
async function processFeeds() {
  const items = await fetchRSSFeed();

  for (const item of items) {
    const id = item.id;
    const title = item.title;
    const description = item.content_text || "";

    // Proveri da li je ID već obrađen
    const isProcessed = await redis.sismember("processed_ids", id);
    if (isProcessed) {
      // Ako jeste, preskoči
      continue;
    }

    // Pošalji podatke GPT API-ju
    const result = await sendToGPT(title, description);
    if (result) {
      // Očekujemo "newsId=kategorija"
      const [newsId, category] = result.split("=");
      if (newsId && category) {
        // Upis u Redis
        await redis.sadd("processed_ids", id);
        await redis.rpush(`category:${category}`, JSON.stringify({
          id,
          title,
          description
        }));
      }
    }
  }
}

// 7) Kreiraj Express server i endpoint
const app = express();

// Endpoint za povlačenje vesti po kategorijama
app.get('/categories/:category', async (req, res) => {
  const category = req.params.category;
  // Dohvati sve članke za zadatu kategoriju
  const news = await redis.lrange(`category:${category}`, 0, -1);
  // Parsiraj rezultate i pošalji ih klijentu
  res.json(news.map(item => JSON.parse(item)));
});

// 8) Pokreni server
//    Možeš da promeniš 3001 u bilo koji slobodan port:
//    npr. 4000 ili 8080 ili 3002...
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server radi na portu ${PORT}`);
});

// 9) Pokreni inicijalno proces Feeda i postavi interval na 5 minuta
processFeeds();
setInterval(processFeeds, 5 * 60 * 1000);
