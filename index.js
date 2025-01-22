/************************************************
 * index.js
 ************************************************/

/**
 * Glavni fajl aplikacije - konfiguriše Express server,
 * učitava rute i koristi funkcije iz feedsService.js za logiku.
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Uvoz servisnog fajla gde je sva logika
import {
  initRedis,
  processFeeds,
  processLGBTFeed,
  getAllFeedsFromRedis,
  redisClient
} from './feedsService.js';

const BASE_URL = 'https://dachnews.onrender.com';

// Pomoćne promenljive za __dirname u ES modulu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Posluži statiku iz "src" (gde je scripts.js, css, sl.)
app.use('/src', express.static(path.join(__dirname, 'src')));

// Poveži se na Redis
await initRedis();

// Rute i endpoint-i

/**
 * Rota za posluživanje početne stranice.
 */
app.get("/", (req, res) => {
  console.log("[Route /] Služenje index.html...");
  res.sendFile(path.join(__dirname, "index.html"));
});

/**
 * Rota za dobijanje svih feedova.
 */
app.get("/api/feeds", async (req, res) => {
  console.log("[Route /api/feeds] Klijent traži sve feedove...");
  try {
    const all = await getAllFeedsFromRedis();
    console.log(`[Route /api/feeds] Vraćamo ${all.length} feedova`);
    res.json(all);
  } catch (error) {
    console.error("[Route /api/feeds] Greška:", error);
    res.status(500).send("Server error");
  }
});

/**
 * Rota za dobijanje feed-ova određene kategorije.
 */
app.get("/api/feeds-by-category/:category", async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Kategorija: ${category}`);
  try {
    const redisKey = `category:${category}`;
    const feedItems = await redisClient.lRange(redisKey, 0, -1);
    console.log(`[Route /api/feeds-by-category] Nađeno ${feedItems.length} stavki za ${category}`);
    const parsed = feedItems.map(x => JSON.parse(x));
    res.json(parsed);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Greška:`, error);
    res.status(500).send('Server error');
  }
});

// Pokretanje servera
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Express] Server pokrenut na portu ${PORT}`);
});

/**
 * Pomoćna funkcija da napravimo random interval.
 */
function getRandomInterval() {
  const minMinutes = 12;
  const maxMinutes = 14;
  const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return randomMinutes * 60 * 1000;
}

// Periodično procesiranje feedova
setInterval(processFeeds, getRandomInterval());
processFeeds();

// Periodično procesiranje LGBT feed-a (svakih 13 minuta)
setInterval(processLGBTFeed, 13 * 60 * 1000);
processLGBTFeed();
