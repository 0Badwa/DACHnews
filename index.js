const express = require('express');
const redis = require('redis');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

// Kreiraj Express aplikaciju
const app = express();

// Middleware za parsiranje JSON podataka
app.use(bodyParser.json());

// Povezivanje Redis servera (Render.com)
const redisClient = redis.createClient({
    socket: {
        host: 'redis://red-ctsqli3v2p9s738dmv50:6379', // Host iz Internal Redis URL
        port: 6379                        // Port iz Internal Redis URL
    }
});

redisClient.connect()
    .then(() => console.log('Povezan na Redis server na Render.com!'))
    .catch(err => console.error('Greška pri povezivanju sa Redis serverom:', err));

// ChatGPT API podaci
require('dotenv').config();
const CHATGPT_API_KEY = process.env.OPENAI_API_KEY;

const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';


// Funkcija za slanje zahteva ChatGPT API-ju
async function fetchChatGPTResponse(jsonData) {
    try {
        const response = await fetch(CHATGPT_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CHATGPT_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-4omini', // Koristi 4omini model
                messages: [
                    { role: 'system', content: 'Ti si pomoćnik za analizu RSS feedova.' },
                    { role: 'user', content: `Obradi sledeći JSON: ${JSON.stringify(jsonData)}` }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Greška API-ja: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Greška pri pozivanju ChatGPT API-ja:', error);
        throw error;
    }
}

// Funkcije za rad sa Redis kešom
async function cacheResponse(key, data, ttl = 3600) {
    try {
        await redisClient.set(key, JSON.stringify(data), { EX: ttl }); // TTL je 1 sat
        console.log(`Podaci sačuvani u kešu: ${key}`);
    } catch (error) {
        console.error('Greška pri keširanju:', error);
    }
}

async function getCachedResponse(key) {
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Greška pri dobavljanju keša:', error);
        return null;
    }
}

// Ruta za obradu RSS feedova
app.post('/process-feeds', async (req, res) => {
    const rssFeeds = req.body.feeds;

    if (!rssFeeds || !Array.isArray(rssFeeds)) {
        return res.status(400).send('Neispravan ulaz. Očekuje se lista feedova.');
    }

    try {
        const cacheKey = 'chatgpt_processed_feeds';
        let responseData = await getCachedResponse(cacheKey);

        if (!responseData) {
            console.log('Podaci nisu u kešu, pozivam ChatGPT API...');
            responseData = await fetchChatGPTResponse(rssFeeds);
            await cacheResponse(cacheKey, responseData);
        }

        res.json({ data: responseData });
    } catch (error) {
        res.status(500).send('Greška pri obradi feedova.');
    }
});

// Ruta za dobavljanje keširanih podataka
app.get('/feeds', async (req, res) => {
    try {
        const data = await getCachedResponse('chatgpt_processed_feeds');
        if (!data) {
            return res.status(404).send('Nema podataka u kešu.');
        }
        res.json({ data });
    } catch (error) {
        res.status(500).send('Greška pri dobavljanju feedova.');
    }
});

// Pokretanje servera
const PORT = 10000; // Render koristi port 10000 za tvoju aplikaciju
app.listen(PORT, () => {
    console.log(`Server pokrenut na portu ${PORT}`);
});
