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
    contentSecurityPolicy: false,
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

const RSS_FEED_URL = "https://rss.app/feeds/v1.1/tSylunkFT455Icoi.json";
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// Preuzima sirove feedove sa RSS App
async function fetchRSSFeed() {
  try {
    const response = await axios.get(RSS_FEED_URL);
    return response.data.items || [];
  } catch (error) {
    console.error("Greška pri preuzimanju RSS feed-a:", error);
    return [];
  }
}

// Procesiranje feedova (kategorizacija i čuvanje u Redis)
async function processFeeds() {
  const items = await fetchRSSFeed();
  const newItems = [];

  for (const item of items) {
    const id = item.id;
    const isProcessed = await redisClient.sIsMember("processed_ids", id);
    if (!isProcessed) {
      newItems.push(item);
    }
  }

  if (newItems.length === 0) return;

  for (const item of newItems) {
    const category = item.category || "Uncategorized";
    await redisClient.rPush(`category:${category}`, JSON.stringify(item));
    await redisClient.sAdd("processed_ids", item.id);
  }
}

// Rute
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/feeds", async (req, res) => {
  try {
    const items = await fetchRSSFeed();
    res.json(items);
  } catch (error) {
    console.error("Greška pri preuzimanju feedova:", error);
    res.status(500).send("Server error");
  }
});

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});

setInterval(processFeeds, 5 * 60 * 1000);
processFeeds();
