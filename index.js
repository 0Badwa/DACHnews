/**
 * index.js
 * Backend aplikacije – Server-side generisanje HTML-a za svaku vest i automatsko generisanje XML sitemap-a
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

/**
 * Funkcija koja generiše HTML za vest iz JSON objekta.
 * @param {Object} news - Objekat sa podacima o vesti.
 * @returns {string} - Generisani HTML.
 */
function generateHtmlForNews(news) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${news.title}</title>
      <meta name="description" content="${news.content_text ? news.content_text.substring(0, 160) : ''}">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        img { max-width: 100%; height: auto; }
      </style>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "${news.title}",
        "datePublished": "${news.date_published ? new Date(news.date_published).toISOString() : new Date().toISOString()}",
        "image": "${news.image || ''}",
        "author": {
          "@type": "Person",
          "name": "${news.source}"
        },
        "publisher": {
          "@type": "Organization",
          "name": "DACH.news",
          "logo": {
            "@type": "ImageObject",
            "url": "https://www.dach.news/src/icons/favicon.ico"
          }
        },
        "description": "${news.content_text ? news.content_text.substring(0, 160) : ''}"
      }
      </script>
    </head>
    <body>
      <h1>${news.title}</h1>
      <p><em>${news.date_published ? new Date(news.date_published).toLocaleString() : ''}</em></p>
      ${news.image ? `<img src="${news.image}" alt="${news.title}">` : ''}
      <div>${news.content_text}</div>
      <p>Source: ${news.source}</p>
      <p>Category: ${news.category}</p>
    </body>
    </html>
  `;
}

// Ruta za glavnu stranicu
app.get('/', (req, res) => {
  console.log("[Route /] Serving index.html...");
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API ruta za sve feedove
app.get('/api/feeds', async (req, res) => {
  console.log("[Route /api/feeds] Client requesting all feeds...");
  try {
    const all = await getAllFeedsFromRedis();
    console.log(`[Route /api/feeds] Returning ${all.length} feeds`);
    res.json(all);
  } catch (error) {
    console.error("[Route /api/feeds] Error:", error);
    res.status(500).send("Server error");
  }
});

// API ruta za feedove po kategoriji
app.get('/api/feeds-by-category/:category', async (req, res) => {
  const category = req.params.category;
  console.log(`[Route /api/feeds-by-category] Category: ${category}`);
  try {
    const redisKey = `category:${category}`;
    const feedItems = await redisClient.lRange(redisKey, 0, -1);
    console.log(`[Route /api/feeds-by-category] Found ${feedItems.length} items for ${category}`);
    const parsed = feedItems.map(x => JSON.parse(x));
    res.json(parsed);
  } catch (error) {
    console.error(`[Route /api/feeds-by-category] Error:`, error);
    res.status(500).send("Server error");
  }
});

// Ruta za dohvatanje slike iz Redis-a
app.get('/image/:id', async (req, res) => {
  const imgKey = `img:${req.params.id}`;
  try {
    const base64 = await redisClient.get(imgKey);
    if (!base64) {
      console.log(`[Route /image/:id] No image found for key: ${imgKey}`);
      return res.status(404).send("Image not found.");
    }
    const buffer = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', 'image/webp');
    res.send(buffer);
  } catch (error) {
    console.error("[Route /image/:id] Error:", error);
    res.status(500).send("Server error");
  }
});

/**
 * Ruta za generisanje statičkog HTML-a za pojedinačnu vest.
 * Ako HTML već postoji u Redis kešu (ključ: html:news:<id>), koristi se keširana verzija.
 * U suprotnom, dohvaća se vest iz JSON podataka, generiše se HTML i kešira se u Redis-u na 12 sati.
 */
app.get('/news/:id', async (req, res) => {
  const newsId = req.params.id;
  const cacheKey = `html:news:${newsId}`;
  try {
    let cachedHtml = await redisClient.get(cacheKey);
    if (cachedHtml) {
      console.log(`[Express HTML] Serving cached HTML for news ${newsId}`);
      res.setHeader("Content-Type", "text/html");
      return res.send(cachedHtml);
    }
    const allFeeds = await getAllFeedsFromRedis();
    const news = allFeeds.find(item => item.id === newsId);
    if (!news) return res.status(404).send("News not found");
    
    const html = generateHtmlForNews(news);
    await redisClient.setEx(cacheKey, 43200, html); // Keširaj na 12 sati
    console.log(`[Express HTML] Cached HTML for news ${newsId}`);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error(`[Express HTML] Error generating HTML for news ${newsId}:`, error);
    res.status(500).send("Server error");
  }
});

// API ruta za pojedinačnu vest u JSON formatu
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

/**
 * Ruta za generisanje XML sitemap-a.
 * Preuzima sve vesti iz Redis-a i kreira XML sitemap sa URL-ovima:
 * Sada koristimo ?newsId=<id> umesto /news/<id>, da bismo automatski otvarali modal
 */
app.get('/sitemap.xml', async (req, res) => {
  try {
    const allFeeds = await getAllFeedsFromRedis();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const news of allFeeds) {
      const lastmod = news.date_published ? new Date(news.date_published).toISOString() : new Date().toISOString();
      xml += '  <url>\n';
      // Dodato `?newsId=` umesto /news/<id>
      xml += `    <loc>https://www.dach.news/?newsId=${news.id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Server error");
  }
});

// Debug ruta – prikazuje sve Redis ključeve za HTML (prefiks "html:news:")
app.get('/api/debug/html-keys', async (req, res) => {
  try {
    const keys = await redisClient.keys('html:news:*');
    res.json(keys);
  } catch (error) {
    console.error("Error fetching Redis keys:", error);
    res.status(500).json({ error: error.toString() });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server running on port ${PORT}`);
});

// Periodična obrada feedova (svakih 12 minuta)
setInterval(processFeeds, 12 * 60 * 1000);
processFeeds();

// Endpointi za blokiranje/otblokiranje izvora
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
    console.error("Error blocking source:", error);
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
    console.error("Error unblocking source:", error);
    res.status(500).send("Server error");
  }
});

// Redirect sa onrender domena na www.dach.news
app.use((req, res, next) => {
  if (req.headers.host === 'dachnews.onrender.com') {
    return res.redirect(301, 'https://www.dach.news' + req.url);
  }
  next();
});
