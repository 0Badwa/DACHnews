/************************************************
 * index.js
 ************************************************/

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  initRedis,
  redisClient,
  processFeeds,
  getAllFeedsFromRedis
} from './feedsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Služenje statičkog sadržaja
app.use('/src', express.static(path.join(__dirname, 'src'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Poveži se na Redis
await initRedis();

// Rute:
app.get('/', (req, res) => {
  console.log("[Route /] Služenje index.html...");
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/feeds', async (req, res) => {
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

app.get('/api/feeds-by-category/:category', async (req, res) => {
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

/**
 * Ruta za dohvatanje slike iz Redis-a.
 * Pošto Redis v4 nema getBuffer(), koristimo get() i dekodiramo Base64 u buffer.
 */
app.get('/image/:id', async (req, res) => {
  const imgKey = `img:${req.params.id}`;
  try {
    // Uzimamo Base64 string iz Redis-a
    const base64 = await redisClient.get(imgKey);
    if (!base64) {
      console.log(`[Route /image/:id] Nema slike za ključ: ${imgKey}`);
      return res.status(404).send("Image not found.");
    }

    // Pretvaramo Base64 nazad u buffer
    const buffer = Buffer.from(base64, 'base64');

    res.setHeader('Content-Type', 'image/webp');
    res.send(buffer);
  } catch (error) {
    console.error("[Route /image/:id] Greska:", error);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server pokrenut na portu ${PORT}`); // Ispravno!
});


// Periodična obrada feedova (12 minuta)
setInterval(processFeeds, 12 * 60 * 1000);
processFeeds();

app.post('/api/block-source', async (req, res) => {
  const { source } = req.body;
  if (!source) return res.status(400).send("Source required");

  try {
    let blockedSources = await redisClient.get("blockedSources");
    blockedSources = blockedSources ? JSON.parse(blockedSources) : [];
    if (!blockedSources.includes(source)) {
      blockedSources.push(source);
      await redisClient.set("blockedSources", JSON.stringify(blockedSources));
    }
    res.status(200).send("Source blocked");
  } catch (error) {
    console.error("Greška pri blokiranju izvora:", error);
    res.status(500).send("Server error");
  }
});

app.post('/api/unblock-source', async (req, res) => {
  const { source } = req.body;
  if (!source) return res.status(400).send("Source required");

  try {
    let blockedSources = await redisClient.get("blockedSources");
    blockedSources = blockedSources ? JSON.parse(blockedSources) : [];
    blockedSources = blockedSources.filter(s => s !== source);
    await redisClient.set("blockedSources", JSON.stringify(blockedSources));
    res.status(200).send("Source unblocked");
  } catch (error) {
    console.error("Greška pri uklanjanju izvora:", error);
    res.status(500).send("Server error");
  }
});

