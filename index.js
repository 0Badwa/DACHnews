// index.js
// U kodu (index.js) koristi createClient({ url: process.env.REDIS_URL }).
const express = require('express');
const { createClient } = require('redis');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { categorize } = require('./gptApi');

// Proverno ispisujemo ključeve radi debug-a (po želji)
console.log('API ključ:', process.env.OPENAI_API_KEY);
console.log('REDIS_URL:', process.env.REDIS_URL);

// Kreiraj Express aplikaciju
const app = express();

// --------------------------------------------------------
// Konfigurisani Helmet da dozvoli konekcije ka spoljnim API-jevima (RSS, OpenAI)
// i da dozvoli učitavanje slika sa HTTPS domena (npr. example.com).
// --------------------------------------------------------
// app.use(
//   helmet({
   //  contentSecurityPolicy: {
      // directives: {
        // ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // dozvoli fetch ("connect-src") ka samom sajtu + RSS + OpenAI
        // 'connect-src': ["'self'", "https://rss.app", "https://api.openai.com"],
        // dozvoli učitavanje slika sa 'self', data: i bilo kog https domena
        // 'img-src': ["'self'", "data:", "https:"],
     //  },
  //   },
//   })
// );

// Middleware za parsiranje JSON podataka
app.use(express.json());

// Posluži statičke fajlove iz foldera "src"
app.use('/src', express.static(path.join(__dirname, 'src')));

// Serviraj favicon.ico ako ga dodaš u folder "public"
app.use(express.static(path.join(__dirname, 'public')));

// Povezivanje sa Redis serverom
const redisClient = createClient({
    url: process.env.REDIS_URL,
});
redisClient.connect().catch((err) => console.error('Redis greška:', err));

// Ruta za osnovni URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta za preuzimanje feedova (ako želiš da RSS uzimaš preko backend-a)
app.get('/api/feeds', async (req, res) => {
    const feedUrl = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";
    try {
        const cacheKey = 'rss_feeds';
        let data = await redisClient.get(cacheKey);
        if (!data) {
            console.log('Preuzimanje feedova sa izvora...', feedUrl);
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

// Pokreni server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server pokrenut na portu ${PORT}`));



app.post('/api/categorize', async (req, res) => {
    const { feeds } = req.body;

    if (!feeds || !Array.isArray(feeds)) {
        return res.status(400).send('Invalid input');
    }

    // Filtriraj feedove koji imaju validne naslove i sadržaj
    const validFeeds = feeds.filter(feed => 
        feed.id && 
        feed.title && 
        feed.content_text &&
        feed.content_text.trim().length > 0
    );

    if (validFeeds.length === 0) {
        return res.status(400).send('Nema validnih feedova za analizu.');
    }

    try {
        // Obradi svaki feed i pošalji ga GPT API-ju
        const results = await Promise.all(validFeeds.map(feed => 
            categorize({
                id: feed.id,
                content: `${feed.title}. ${feed.content_text}`, // Kombinuj title i content_text
            })
        ));

        res.json(results); // Vrati rezultat
    } catch (error) {
        console.error('Greška pri kategorizaciji:', error);
        res.status(500).send('Server error');
    }
});
