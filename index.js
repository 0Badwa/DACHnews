/**
 * index.js
 * Backend aplikacije
 */

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

import puppeteer from 'puppeteer'; // Koristi bundlovani Chromium iz puppeteer

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

// Helper funkcija: Generiše prerenderovani HTML za dati newsId
async function generatePrerenderedHtml(newsId) {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const targetUrl = `${baseUrl}/?newsId=${newsId}`;
  
  // Pokrećemo Puppeteer koristeći bundlovani Chromium sa potrebnim argumentima za Render
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser', // Default path for Chromium on Render
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  
  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: 'networkidle0' });
  const html = await page.content();
  await browser.close();
  return html;
}

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

// Ruta za dohvatanje slike iz Redis-a
app.get('/image/:id', async (req, res) => {
  const imgKey = `img:${req.params.id}`;
  try {
    const base64 = await redisClient.get(imgKey);
    if (!base64) {
      console.log(`[Route /image/:id] Nema slike za ključ: ${imgKey}`);
      return res.status(404).send("Image not found.");
    }
    const buffer = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', 'image/webp');
    res.send(buffer);
  } catch (error) {
    console.error("[Route /image/:id] Greska:", error);
    res.status(500).send("Server error");
  }
});

// Ruta za prerenderovanje pojedinačne vesti koristeći Puppeteer
app.get('/news/:id', async (req, res) => {
  const newsId = req.params.id;
  const cacheKey = `prerender:news:${newsId}`;
  try {
    // Pokušaj da dohvatiš prerenderovani HTML iz Redis-a
    let cachedHtml = await redisClient.get(cacheKey);
    if (cachedHtml) {
      console.log(`[Prerender] Serving cached HTML for news ${newsId}`);
      return res.send(cachedHtml);
    }
    // Ako nema u kešu, generiši HTML
    const html = await generatePrerenderedHtml(newsId);
    // Keširaj prerenderovani HTML na 12 sati (43200 sekundi)
    await redisClient.setEx(cacheKey, 43200, html);
    console.log(`[Prerender] Cached HTML for news ${newsId}`);
    res.send(html);
  } catch (error) {
    console.error(`[Prerender] Error prerendering news ${newsId}:`, error);
    res.status(500).send("Error prerendering page");
  }
});

// API ruta za dohvatanje pojedinačne vesti po id
app.get('/api/news/:id', async (req, res) => {
  const newsId = req.params.id;
  try {
    const allFeeds = await getAllFeedsFromRedis();
    const news = allFeeds.find(item => item.id === newsId);
    if (!news) return res.status(404).send("News not found");
    res.json(news);
  } catch (error) {
    console.error(`[API] Error fetching news ${newsId}:`, error);
    res.status(500).send("Server error");
  }
});

/* DEBUG ruta – prikazuje sve Redis ključeve sa prefiksom "prerender:" */
app.get('/api/debug/redis-keys', async (req, res) => {
  try {
    const keys = await redisClient.keys('prerender:*');
    res.json(keys);
  } catch (error) {
    console.error("Greška pri dohvaćanju Redis ključeva:", error);
    res.status(500).json({ error: error.toString() });
  }
});

// NOVA funkcija: Automatsko prerenderovanje svih vesti iz category ključeva
async function prerenderAllNews() {
  console.log("[Prerender] Pokrećem automatsko prerenderovanje svih vesti iz category ključeva...");
  let successCount = 0;
  try {
    const categoryKeys = await redisClient.keys("category:*");
    for (const key of categoryKeys) {
      const items = await redisClient.lRange(key, 0, -1);
      for (const itemStr of items) {
        try {
          const item = JSON.parse(itemStr);
          const newsId = item.id;
          if (!newsId) continue;
          console.log(`[Prerender] Prerenderujem vest ${newsId} iz ${key}`);
          const html = await generatePrerenderedHtml(newsId);
          const cacheKey = `prerender:news:${newsId}`;
          await redisClient.setEx(cacheKey, 43200, html);
          successCount++;
        } catch (err) {
          console.error("Error prerendering vest:", err);
        }
      }
    }
    console.log(`[Prerender] Završeno automatsko prerenderovanje. Uspešno keširano HTML za ${successCount} vesti.`);
  } catch (error) {
    console.error("[Prerender] Greška pri prerenderovanju svih vesti:", error);
  }
  // Loguj ukupni broj prerenderovanih HTML ključeva u Redis-u
  try {
    const keys = await redisClient.keys("prerender:*");
    console.log(`[Prerender] Ukupno prerender HTML ključeva u Redis-u: ${keys.length}`);
  } catch (err) {
    console.error("Greška pri dohvaćanju prerender ključeva:", err);
  }
}

// Pokreni automatsko prerenderovanje svakih 12 sati (43200000 ms)
setInterval(prerenderAllNews, 43200000);
// Opcionalno, pokreni odmah pri startu
prerenderAllNews();

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server pokrenut na portu ${PORT}`);
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

app.use((req, res, next) => {
  if (req.headers.host === 'dachnews.onrender.com') {
    return res.redirect(301, 'https://www.dach.news' + req.url);
  }
  next();
});
