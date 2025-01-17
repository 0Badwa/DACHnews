// Učitaj potrebne biblioteke
require('dotenv').config();
const axios = require('axios');
const Redis = require('ioredis');

// Redis konekcija
const redis = new Redis(process.env.REDIS_URL);

// URL RSS feed-a i GPT API-ja
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
        const isProcessed = await redis.sismember("processed_ids", id);
        if (isProcessed) continue;

        // Pošalji podatke GPT API-ju
        const result = await sendToGPT(title, description);
        if (result) {
            // Čuvaj rezultat u Redis-u
            const [newsId, category] = result.split('=');
            if (newsId && category) {
                await redis.sadd("processed_ids", id);
                await redis.rpush(`category:${category}`, JSON.stringify({ id, title, description }));
            }
        }
    }
}

// Endpoint za povlačenje vesti po kategorijama
const express = require('express');
const app = express();

app.get('/categories/:category', async (req, res) => {
    const category = req.params.category;
    const news = await redis.lrange(`category:${category}`, 0, -1);
    res.json(news.map(item => JSON.parse(item)));
});

// Pokreni server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});

// Pokreni proces osvežavanja svakih 5 minuta
setInterval(processFeeds, 5 * 60 * 1000);
processFeeds();
