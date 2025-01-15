const express = require('express');
const { createClient } = require('redis');
const fetch = require('node-fetch');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();


// Kreiraj Express aplikaciju
const app = express();
// Serviraj statičke fajlove iz direktorijuma 'src'
app.use('/src', express.static(path.join(__dirname, 'src')));


console.log('Učitavanje environment promenljivih:');
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);


// Provera environment varijabli
if (!process.env.REDIS_URL) {
    console.error('REDIS_URL nije definisan u environment varijablama.');
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY nije definisan u environment varijablama.');
    process.exit(1);
}


// Middleware za sigurnost i parsiranje JSON podataka
app.use(helmet());
app.use(express.json());

// Povezivanje sa Redis serverom
const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Greška pri povezivanju sa Redis serverom:', err));
redisClient.on('connect', () => console.log('Povezan na Redis server.'));
redisClient.on('ready', () => console.log('Redis spreman za upotrebu.'));
redisClient.on('end', () => console.log('Redis konekcija zatvorena.'));

redisClient.connect()
    .catch((err) => {
        console.error('Greška pri povezivanju sa Redis serverom:', err);
        process.exit(1);
    });

// ChatGPT API podaci
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
                model: 'gpt-4-turbo-4omini',
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


// Ruta za osnovni URL - otvara index.html iz root direktorijuma
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
        res.status(500).json({
            message: 'Greška pri obradi feedova.',
            error: error.message
        });
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
const PORT = process.env.PORT || 10000; // Koristi port iz environment varijable ili podrazumevani 10000
app.listen(PORT, () => {
    console.log(`Server pokrenut na portu ${PORT}`);
});
