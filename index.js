/* index.js */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { initRedis, redisClient, processFeeds, getAllFeedsFromRedis, getSeoFeedsFromRedis } from './feedsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Služi Bing verifikacioni fajl
app.get('/BingSiteAuth.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'BingSiteAuth.xml'));
});

app.use('/favicon.ico', express.static(path.join(__dirname, 'src/icons/favicon.ico')));
app.use('/fonts', express.static(path.join(__dirname, 'src/fonts')));

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://www.dach.news", "https://exyunews.onrender.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);
app.use(express.json());

app.use('/src', express.static(path.join(__dirname, 'src'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

await initRedis();

/**
 * Funkcija koja generiše HTML za vest iz JSON objekta.
 */
function generateHtmlForNews(news) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
     <title>${news.title} - DACH News: Nachrichten aus Deutschland, Österreich, Schweiz</title>
      <meta name="description" content="${news.content_text ? news.content_text.substring(0, 160) : ''}">
      <link rel="canonical" href="https://www.dach.news/news/${news.id}">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        img { max-width: 100%; height: auto; }
      </style>

             <h1>${news.title}</h1>

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

/**
 * Ruta za glavnu stranicu sa dinamičkim popunjavanjem index.html
 */
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Greška pri čitanju index.html", err);
      return res.status(500).send("Server error");
    }
    // Dinamički postavi naslov (ovdje možeš preuzeti vrijednost iz baze ili drugdje)
    const newsTitle = "Najnovije vijesti";
    const modifiedHtml = data.replace('%%NEWS_TITLE%%', newsTitle);
    res.send(modifiedHtml);
  });
});

/**
 * API ruta za sve feedove iz liste "Aktuell".
 * Ova ruta čita listu "Aktuell" iz Redis-a (poslednjih 200 vesti)
 * i vraća ih kao JSON.
 */
app.get('/api/feeds', async (req, res) => {
  console.log("[Route /api/feeds] Client requesting 'Aktuell' feeds...");
  try {
    const items = await redisClient.lRange("Aktuell", 0, -1);
    const feeds = items.map(item => JSON.parse(item));
    console.log(`[Route /api/feeds] Returning ${feeds.length} feeds from 'Aktuell'`);
    res.json(feeds);
  } catch (error) {
    console.error("[Route /api/feeds] Error:", error);
    res.status(500).send("Server error");
  }
});

/**
 * API ruta za feedove po kategoriji.
 * Dodata da se mogu dohvatiti feedovi iz Redis-a (lista "category:Naziv").
 */
app.get('/api/feeds-by-category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const redisKey = `category:${category}`;
    const items = await redisClient.lRange(redisKey, 0, -1);
    const feeds = items.map((item) => JSON.parse(item));

    console.log(`[Route /api/feeds-by-category] Returning ${feeds.length} feeds for category ${category}`);
    res.json(feeds);
  } catch (error) {
    console.error("[Route /api/feeds-by-category] Error:", error);
    res.status(500).send("Server error");
  }
});

/**
 * Ruta za dohvatanje slike iz Redis-a.
 */
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
 * API ruta za pojedinačnu vest u JSON formatu.
 * (Zbog duple definicije, spojeno u jednu rutu.)
 */
app.get('/api/news/:id', async (req, res) => {
  const newsId = req.params.id;
  try {
    // Pokušaj da se vest pronađe u kategorijama
    let allFeeds = await getAllFeedsFromRedis();
    let news = allFeeds.find(item => item.id === newsId);
    
    // Ako nije pronađena, pokušaj sa SEO vesti
    if (!news) {
      const seoFeeds = await getSeoFeedsFromRedis();
      news = seoFeeds.find(item => item.id === newsId);
    }
    
    if (!news) return res.status(404).send("News not found");
    res.json(news);
  } catch (error) {
    console.error(`[API] Error fetching news ${newsId}:`, error);
    res.status(500).send("Server error");
  }
});

/**
 * Ruta za generisanje XML sitemap-a.
 */
app.get('/sitemap.xml', async (req, res) => {
  try {
    const allFeeds = await getSeoFeedsFromRedis(); // Koristimo SEO keš
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const news of allFeeds) {
      const lastmod = news.date_published ? new Date(news.date_published).toISOString() : new Date().toISOString();
      xml += '  <url>\n';
      xml += `    <loc>https://www.dach.news/news/${news.id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>hourly</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';
    }

    // Dodajemo RSS feed u sitemap
    xml += '  <url>\n';
    xml += `    <loc>https://www.dach.news/rss</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '    <changefreq>hourly</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Server error");
  }
});

app.get('/api/debug/html-keys', async (req, res) => {
  try {
    const keys = await redisClient.keys('seo:news');
    res.json(keys);
  } catch (error) {
    console.error("Error fetching Redis keys:", error);
    res.status(500).json({ error: error.toString() });
  }
});

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

app.use((req, res, next) => {
  if (req.headers.host === 'dachnews.onrender.com') {
    return res.redirect(301, 'https://www.dach.news' + req.url);
  }
  next();
});

/**********************************************
 * DODATE NOVE FUNKCIJE ZA RSS
 **********************************************/

/**
 * 1) API ruta koja vraća JSON feed (podaci iz Redis-a).
 *    Npr. do 200 najnovijih iz "Aktuell".
 */
app.get('/api/rss', async (req, res) => {
  try {
    // Uzimamo do 200 najnovijih vesti iz 'Aktuell'
    const rawItems = await redisClient.lRange("Aktuell", 0, 199);
    const feeds = rawItems.map(item => JSON.parse(item));

    // JSON-LD struktura za AI pretraživače (Schema.org format)
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "DataFeed",
      "name": "DACH.news API",
      "description": "Aktuelle Nachrichten aus der DACH-Region, analysiert von AI.",
      "url": "https://www.dach.news/api/rss",
      "dataFeedElement": feeds.map(feed => ({
        "@type": "NewsArticle",
        "headline": feed.title,
        "datePublished": feed.date_published ? new Date(feed.date_published).toISOString() : new Date().toISOString(),
        "image": feed.image || "https://www.dach.news/src/icons/default-image.png",
        "url": feed.url || "https://www.dach.news",
        "author": {
          "@type": "Organization",
          "name": feed.source || "Unbekannte Quelle",
          "url": feed.url ? new URL(feed.url).origin : "https://www.dach.news"
        },
        "publisher": {
          "@type": "Organization",
          "name": "DACH.news",
          "url": "https://www.dach.news",
          "logo": {
            "@type": "ImageObject",
            "url": "https://www.dach.news/src/icons/logo.png"
          }
        },
        "description": `Diese Nachricht stammt von ${feed.source || "einer unbekannten Quelle"} und wurde von KI analysiert.`,
        "comment": feed.analysis ? {
          "@type": "Comment",
          "text": feed.analysis,
          "author": {
            "@type": "AIAlgorithm",
            "name": "DACH.news AI"
          }
        } : undefined
      }))
    };

    res.json(jsonLd);
  } catch (error) {
    console.error("[Route /api/rss] Error:", error);
    res.status(500).send("Server error");
  }
});

/**
 * 2) Ruta koja generiše RSS feed u XML formatu (klasičan RSS 2.0)
 */
app.get('/rss', async (req, res) => {
  try {
    // Uzimamo do 200 najnovijih iz 'Aktuell'
    const rawItems = await redisClient.lRange("Aktuell", 0, 199);
    const feeds = rawItems.map(item => JSON.parse(item));

    // Header za RSS
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    
    // Generišemo osnovu RSS-a
    let rss = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    rss += `<rss version="2.0">\n`;
    rss += `<channel>\n`;
    rss += `  <title>DACH.news RSS</title>\n`;
    rss += `  <link>https://www.dach.news</link>\n`;
    rss += `  <description>Aktuelle Nachrichten aus der DACH-Region, analysiert mit Hilfe von AI</description>\n`;
    rss += `  <language>de</language>\n`;

    // Generišemo <item> za svaku vest
    feeds.forEach(feed => {
      rss += `  <item>\n`;
      rss += `    <title><![CDATA[${feed.title}]]></title>\n`;
      rss += `    <link>${feed.url || ''}</link>\n`;
      rss += `    <enclosure url="${feed.image}" type="image/webp" />\n`;
      rss += `    <description><![CDATA[${feed.content_text || ''}]]></description>\n`;
      rss += `    <category>${feed.category || ''}</category>\n`;
      rss += `    <pubDate>${feed.date_published ? new Date(feed.date_published).toUTCString() : ''}</pubDate>\n`;
      rss += `    <guid isPermaLink="false">${feed.id}</guid>\n`;
      rss += `  </item>\n`;
    });

    rss += `</channel>\n`;
    rss += `</rss>`;

    res.send(rss);
  } catch (error) {
    console.error("[Route /rss] Error generating RSS:", error);
    res.status(500).send("Server error");
  }
});

/**
 * 3) API dokumentacija za lakši pristup
 */
app.get('/api/docs', (req, res) => {
  res.send(`
    <h1>DACH News API</h1>
    <p>Willkommen zur DACH News API. Diese API ermöglicht den Zugriff auf die neuesten Nachrichten.</p>
    <ul>
      <li><a href="/api/rss">/api/rss</a> - JSON RSS-Feed</li>
      <li><a href="/api/feeds-by-category/Sport">/api/feeds-by-category/Sport</a> - Nachrichten nach Kategorie</li>
      <li><a href="/api/latest-news">/api/latest-news</a> - Neueste Nachrichten</li>
    </ul>
  `);
});

/**
 * 4) API za pretragu vesti po ključnoj reči
 */
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Query param is required.");

  try {
    const allFeeds = await getAllFeedsFromRedis();
    const results = allFeeds.filter(feed =>
      feed.title.toLowerCase().includes(query.toLowerCase()) ||
      feed.content_text.toLowerCase().includes(query.toLowerCase())
    );

    res.json({ total: results.length, articles: results });
  } catch (error) {
    console.error("[API] Error searching news:", error);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server running on port ${PORT}`);
});
