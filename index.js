// index.js
const express = require('express');
const { createClient } = require('redis');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { categorize } = require('./gptApi');  // Uvoz GPT API funkcija

console.log('REDIS_URL:', process.env.REDIS_URL);

// Kreiraj Express aplikaciju
const app = express();

// Middleware za sigurnost i parsiranje JSON podataka
app.use(helmet());
app.use(express.json());
app.use('/src', express.static(path.join(__dirname, 'src'))); // Statički fajlovi (CSS, JS)

// Povezivanje sa Redis serverom
const redisClient = createClient({
    url: process.env.REDIS_URL,
});

redisClient.connect().catch((err) => console.error('Redis greška:', err));

// Ruta za osnovni URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta za preuzimanje feedova
app.get('/api/feeds', async (req, res) => {
    const feedUrl = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";
    try {
        const cacheKey = 'rss_feeds';
        let data = await redisClient.get(cacheKey);
        if (!data) {
            console.log('Preuzimanje feedova sa izvora...');
            const response = await fetch(feedUrl);
            data = await response.json();
            await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600 }); // Keširaj 1 sat
        } else {
            data = JSON.parse(data);
        }
        res.json(data);
    } catch (error) {
        console.error('Greška pri preuzimanju feedova:', error);
        res.status(500).send('Server error');
    }
});

// Ruta za kategorizaciju feedova
app.post('/api/categorize', async (req, res) => {
    const { feeds } = req.body;
    if (!feeds || !Array.isArray(feeds)) {
        return res.status(400).send('Invalid input');
    }

    try {
        const results = await Promise.all(
            feeds.map(feed => categorize(feed))
        );
        res.json(results);
    } catch (error) {
        console.error('Greška pri kategorizaciji:', error);
        res.status(500).send('Server error');
    }
});

// Pokreni server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server pokrenut na portu ${PORT}`));
