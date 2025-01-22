/************************************************
 * index.js
 ************************************************/

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import { initRedis, redisClient, processFeeds, processLGBTFeed, getAllFeedsFromRedis } from './feedsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Za statiku (scripts.js, css, icons itd.)
app.use('/src', express.static(path.join(__dirname, 'src'), {
  setHeaders: (res, filePath) => {
    // MIME fix za .js
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

// NOVO: dohvat slike iz Redis-a (kompresovane)
app.get('/image/:id', async (req, res) => {
  const imgKey = `img:${req.params.id}`;
  try {
    const buffer = await redisClient.getBuffer(imgKey);
    if (!buffer) {
      // Nema slike u Redis-u, po želji ili 404 ili fallback
      console.log(`[Route /image/:id] Nema slike za ključ: ${imgKey}`);
      return res.status(404).send("Image not found.");
    }
    // Ako imamo bajtove, šaljemo
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (error) {
    console.error("[Route /image/:id] Greska:", error);
    res.status(500).send("Server error");
  }
});

// Pokreni server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Express] Server pokrenut na portu ${PORT}`);
});

// Periodične obrade feedova
function getRandomInterval() {
  const minMinutes = 12;
  const maxMinutes = 14;
  const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return randomMinutes * 60 * 1000;
}
setInterval(processFeeds, getRandomInterval());
processFeeds();

// LGBT feed na 13 minuta
setInterval(processLGBTFeed, 13 * 60 * 1000);
processLGBTFeed();
