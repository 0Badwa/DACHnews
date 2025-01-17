// index.js
require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');
const { categorize } = require('./gptApi');

// Proveri ključne promenljive okruženja
console.log('API ključ:', process.env.OPENAI_API_KEY);
console.log('REDIS_URL:', process.env.REDIS_URL);

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

// Ruta za osnovni URL (učitava HTML stranicu)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta za preuzimanje i keširanje RSS feedova
app.get('/api/feeds', async (req, res) => {
  const feedUrl = 'https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json';
  const cacheKey = 'rss_feeds';

  try {
    let data = await redisClient.get(cacheKey);

    if (!data) {
      console.log('Preuzimanje feedova sa izvora:', feedUrl);
      const response = await axios.get(feedUrl);
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
      validFeeds.map((feed) =>
        categorize({
          id: feed.id,
          title: feed.title,
          content_text: feed.content_text,
        })
      )
    );

    res.json(results);
  } catch (error) {
    console.error('Greška pri kategorizaciji:', error);
    res.status(500).send('Server error');
  }
});

// Pokreni server na portu određenom od strane Render-a ili lokalno na 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});
