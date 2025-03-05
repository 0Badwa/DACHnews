/* index.js */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axios from 'axios';

import {
  initRedis,
  redisClient,
  processFeeds,
  getFeedsGenerator,
  getAllFeedsFromRedis,
} from './feedsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware za logovanje botova
app.use((req, res, next) => {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const botRegex = /(Googlebot|Bingbot|YandexBot|DuckDuckBot|Baiduspider|Slurp|Facebot|Twitterbot)/i;

    if (botRegex.test(userAgent)) {
        console.log(`[BOT DETECTED] ${userAgent} - Path: ${req.path}`);
    }

    next();
});

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test konekcije
pool.query('SELECT 1')
  .then(() => console.log('✅ Konekcija uspešna!'))
  .catch(err => console.error('❌ Greška:', err));

export default pool;


/**
 * Čuva vest u PostgreSQL bazi ako ima analizu.
 */
export async function saveNewsToPostgres(newsObj) {
  if (!newsObj.analysis) return; // Preskačemo ako nema analize

  const query = `
    INSERT INTO news (id, title, date_published, url, content_text, category, source, analysis, image)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO NOTHING;
  `;

  const values = [
    newsObj.id,
    newsObj.title,
    newsObj.date_published,
    newsObj.url,
    newsObj.content_text,
    newsObj.category,
    newsObj.source,
    newsObj.analysis,
    newsObj.image || null,
  ];

  try {
    await pool.query(query, values);
    console.log(`[PostgreSQL] Vest ID:${newsObj.id} upisana u bazu.`);
  } catch (error) {
    console.error(`[PostgreSQL] Greška pri upisu vesti ID:${newsObj.id}:`, error);
  }
}



// Služi Bing verifikacioni fajl
app.get('/BingSiteAuth.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'BingSiteAuth.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.use('/favicon.ico', express.static(path.join(__dirname, 'src/icons/favicon.ico')));
app.use('/fonts', express.static(path.join(__dirname, 'src/fonts')));

// Prošireni imgSrc domeni
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'",
        "data:",
        "https://www.dach.news",
        "https://dach.news",
        "https://developnews.onrender.com",  // Dodaj novi domen ovde
        "https://www.exyunews.onrender.com",
        "https://newsdocker-1.onrender.com",
        "https://static.boerse.de",
        "https://p6.focus.de",
        "https://cdn.swp.de",
        "https://media.example.com",
        "https://quadro.burda-forward.de",
        "https://img.burda-forward.de",
        "https://p6.focus.de", // ponovljeno radi potencijalnih grešaka
        "https://cdn.burda-forward.de",
        "https://img.zeit.de",
        "https://cdn.lr-online.de",      // Dodato za lr-online.de
        "https://www.nd-aktuell.de",
        "*.r2.cloudflarestorage.com",
        "https://360f5ba78daf45acb5827f956a445165.r2.cloudflarestorage.com",
        "https://cdn.dach.news"
      ],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
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

// Čuvamo referencu na interval u promenljivoj
const feedInterval = setInterval(processFeeds, 12 * 60 * 1000);

// Slušamo event za gašenje aplikacije kako bismo očistili interval i prekinuli Redis konekciju
process.on('SIGINT', async () => {
  console.log("[Shutdown] Čišćenje intervala i zatvaranje Redis konekcije...");
  clearInterval(feedInterval);
  await redisClient.disconnect();
  process.exit();
});

process.on('exit', async () => {
  console.log("[Exit] Čišćenje intervala i zatvaranje Redis konekcije...");
  clearInterval(feedInterval);
  await redisClient.disconnect();
});



/**
 * Generiše detaljniji HTML sa Open Graph, Twitter tagovima, povezanim eksternim CSS-om
 * i AI sekcijom za analizu ako postoji (ili placeholder ako nema).
 */
function generateHtmlForNews(news) {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
<title>${news.title.length > 70 ? news.title.substring(0, 67) + '...' : news.title} - DACH.news</title>
      <meta name="description" content="${news.content_text ? news.content_text.substring(0, 160) : ''}">
      <link rel="canonical" href="${new URL('/news/' + news.id, 'https://www.dach.news').href}">

      <!-- Open Graph Meta Tags -->
      <meta property="og:type" content="article">
      <meta property="og:title" content="${news.title}">
      <meta property="og:description" content="${news.content_text ? news.content_text.substring(0, 160) : ''}">
      <meta property="og:url" content="https://www.dach.news/news/${news.id}">
      <meta property="og:image" content="${news.image || 'https://www.dach.news/default-image.jpg'}">
      <meta property="og:site_name" content="DACH.news">

      <!-- Twitter Card Meta Tags -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${news.title}">
      <meta name="twitter:description" content="${news.content_text ? news.content_text.substring(0, 160) : ''}">
      <meta name="twitter:image" content="${news.image || 'https://www.dach.news/default-image.jpg'}">

      <!-- Link to external CSS -->
      <link rel="stylesheet" href="https://www.dach.news/src/css/styles.css">

      <!-- Structured Data (JSON-LD) -->
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "${news.title}",
        "datePublished": "${news.date_published ? new Date(news.date_published).toISOString() : new Date().toISOString()}",
        "dateModified": "${news.date_published ? new Date(news.date_published).toISOString() : new Date().toISOString()}",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://www.dach.news/news/${news.id}"
        },
        "image": "${news.image || 'https://www.dach.news/default-image.jpg'}",
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
        "description": "${news.content_text ? news.content_text.substring(0, 160) : ''}",
        "articleBody": "${news.content_text.replace(/"/g, '\\"')}"
      }
      </script>
    </head>
    <body>
      <h1>${news.title}</h1>
      <h2>${news.category} - ${news.source}</h2>
      <p><em>${news.date_published ? new Date(news.date_published).toLocaleString() : ''}</em></p>
      ${news.image ? `<img src="${news.image}" alt="${news.title}">` : ''}
      <div>${news.content_text}</div>
      <p>Source: ${news.source}</p>
      <p>Category: ${news.category}</p>

      <!-- KI-Perspektive: Meinung & Kommentar -->
      <section>
        <h2>KI-Perspektive: Meinung &amp; Kommentar</h2>
        <p>${news.analysis ? news.analysis : 'Keine AI-Analyse verfügbar.'}</p>
      </section>
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
 * Podržava varijante preko "id:variant" forme (ili default "news-card").
 */
app.get('/image/:id', async (req, res) => {
  // Razdvajanje id i varijante (npr. "news-card" ili "news-modal")
  const param = req.params.id;
  let id, variant;
  if (param.includes(':')) {
    [id, variant] = param.split(':');
  } else {
    id = param;
    variant = 'news-card';
  }
  const imgKey = `img:${id}:${variant}`;
  try {
    const base64 = await redisClient.get(imgKey);
    if (base64) {
      const buffer = Buffer.from(base64, 'base64');
      res.setHeader('Content-Type', 'image/webp');
      return res.send(buffer);
    } else {
      // Ako slika nije pronađena u Redis, pokušaj fallback na Cloudflare URL
      const r2Key = `r2url:${id}:${variant}`;
      const cloudflareUrl = await redisClient.get(r2Key);
      if (cloudflareUrl) {
        console.log(`[Route /image/:id] Fallback na Cloudflare URL za ključ: ${r2Key}`);
        return res.redirect(cloudflareUrl);
      } else {
        console.log(`[Route /image/:id] No image found for key: ${imgKey} and no fallback r2url`);
        return res.status(404).send("Image not found.");
      }
    }
  } catch (error) {
    console.error("[Route /image/:id] Error:", error);
    res.status(500).send("Server error");
  }
});



/**
 * API ruta za pojedinačnu vest u JSON formatu.
 * Ako vest nije pronađena u "Aktuell" ili kategorijama, koristi se fallback – dohvat sa neon.tech API-ja i
 * korišćenje Cloudflare fallback URL-a za sliku.
 */
app.get('/api/news/:id', async (req, res) => {
  const newsId = req.params.id;
  let news = null;

  try {
    console.log(`[API] Traženje vesti ID: ${newsId} u "Aktuell"...`);

    // Pretražujemo "Aktuell" listu
    const aktuellRaw = await redisClient.lRange("Aktuell", 0, -1);
    const aktuellNews = aktuellRaw.map(item => JSON.parse(item));
    news = aktuellNews.find(item => item.id === newsId);

    // Ako vest nije pronađena u "Aktuell", pretražujemo kategorijske ključeve
    if (!news) {
      console.log(`[API] Vest ID: ${newsId} nije pronađena u "Aktuell", pretražujem kategorije...`);
      const categoryKeys = await redisClient.keys("category:*");
      for (const key of categoryKeys) {
        const rawItems = await redisClient.lRange(key, 0, -1);
        const categoryNews = rawItems.map(item => JSON.parse(item));
        news = categoryNews.find(item => item.id === newsId);
        if (news) break;
      }
    }

    // Ako vest nije pronađena u Redis-kešu, koristimo fallback sa neon.tech API-ja
    if (!news) {
      console.log(`[API] Vest ID: ${newsId} nije pronađena u kešu, pozivam neon.tech API...`);
      const neonResponse = await axios.get(`https://neon.tech/api/news/${newsId}`);
      if (neonResponse.status === 200 && neonResponse.data) {
        news = neonResponse.data;
        // Pokušavamo da dohvatimo Cloudflare URL za sliku kao fallback
        const r2Key = `r2url:${newsId}:news-card`;
        const cloudflareUrl = await redisClient.get(r2Key);
        if (cloudflareUrl) {
          news.image = cloudflareUrl;
        }
      }
    }

    if (!news) {
      console.log(`[API] Vest ID: ${newsId} nije pronađena ni u kešu ni putem neon.tech fallback-a.`);
      return res.status(404).send("News not found");
    }

    console.log(`[API] Vest ID: ${newsId} pronađena, vraćam JSON...`);
    res.json(news);
  } catch (error) {
    console.error(`[API] Greška pri dohvaćanju vesti ${newsId}:`, error);
    res.status(500).send("Server error");
  }
});





/**
 * Ruta za generisanje XML sitemap-a koristeći "Aktuell" keš.
 */
app.get('/sitemap.xml', async (req, res) => {
  try {
    // Preuzimamo vesti iz "Aktuell" liste
    const rawItems = await redisClient.lRange("Aktuell", 0, -1);
    const allFeeds = rawItems.map(item => JSON.parse(item));
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const news of allFeeds) {
      const lastmod = news.date_published 
        ? new Date(news.date_published).toISOString() 
        : new Date().toISOString();
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

/**
 * Debug ruta: Prikazuje Redis ključeve za "Aktuell".
 */
app.get('/api/debug/html-keys', async (req, res) => {
  try {
    const keys = await redisClient.keys('Aktuell');
    res.json(keys);
  } catch (error) {
    console.error("Error fetching Redis keys:", error);
    res.status(500).json({ error: error.toString() });
  }
});


// Pokrećemo proces vesti na svakih 12 minuta
setInterval(processFeeds, 12 * 60 * 1000);
processFeeds();

// Pokreće čišćenje SEO keša svakih 6 sati
// setInterval(cleanupSeoCache, 6 * 60 * 60 * 1000);


/**
 * Blokiranje izvora
 */
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

/**
 * Deblokiranje izvora
 */
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

// Redirekcija za nevažeće ili istekao URL-ove sa newsId parametrom
app.get('/news/:id', async (req, res) => {
  const newsId = req.params.id;
  const userAgent = req.headers['user-agent'] || '';

  // Ako zahtev NIJE od jednog od SEO botova (Googlebot, Bingbot, YandexBot, DuckDuckBot, Yahoo! Slurp),
  // preusmeravamo korisnika na glavnu stranicu gde se otvara modal
  const allowedBots = ['googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp'];
  if (!allowedBots.some(bot => userAgent.toLowerCase().includes(bot))) {
    return res.redirect(302, '/?newsId=' + newsId);
  }

  let news = null;

  try {
    console.log(`[Redirect] Traženje vesti ID: ${newsId} pomoću strimovanja...`);

    // Strimujemo feedove i tražimo vest sa newsId
    for await (const batch of getFeedsGenerator()) {
      news = batch.find(item => item.id === newsId);
      if (news) break;
    }

   // Ako vest nije pronađena, pretražujemo sve kategorije
if (!news) {
  console.log(`[Redirect] Vest ID: ${newsId} nije pronađena u kategorijama, pretražujem sve kategorije...`);
  const categoryKeys = await redisClient.keys("category:*");
  for (const key of categoryKeys) {
    const items = await redisClient.lRange(key, 0, -1);
    news = items.map(item => JSON.parse(item)).find(item => item.id === newsId);
    if (news) break;
  }
}


    // Ako vest i dalje nije pronađena, pokušavamo dohvat sa neon.tech API
    if (!news) {
      console.log(`[Redirect] Vest ID: ${newsId} nije pronađena u kešu, pokušavam dohvat sa neon.tech...`);
      try {
        const neonResponse = await axios.get(`https://neon.tech/api/news/${newsId}`);
        if (neonResponse.status === 200 && neonResponse.data) {
          news = neonResponse.data;
         // Ako vest nema definisanu sliku, konstrušemo URL za Cloudflare R2.
         if (!news.image) {
          const bucket = process.env.CLOUDFLARE_R2_BUCKET;
          const fileName = `${news.id}-news-card.webp`; // Ili neka druga logika za generisanje imena fajla
          news.image = `${process.env.CLOUDFLARE_R2_ENDPOINT}/${bucket}/${fileName}`;
        }
        

        }
      } catch (err) {
        console.error(`[Redirect] Greška pri dohvaćanju vesti sa neon.tech:`, err);
      }
    }

    if (!news) {
      console.log(`[Redirect] Vest ID: ${newsId} nije pronađena. Preusmeravam na početnu stranicu.`);
      return res.redirect(301, 'https://www.dach.news');
    }

    console.log(`[Redirect] Vest ID: ${newsId} pronađena, generišem HTML...`);
    res.send(generateHtmlForNews(news));
  } catch (error) {
    console.error(`[Error] Fetching news ${newsId}:`, error);
    res.redirect(301, 'https://www.dach.news');
  }
});


// Redirekcija ako se sajt otvori na starom hostu
app.use((req, res, next) => {
  if (req.headers.host === 'newsdocker-1.onrender.com') {
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

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server running on port ${PORT}`);
});

/**
 * Na kraju, osiguravamo uredno zatvaranje Redis konekcije
 */
process.on('exit', async () => {
  await redisClient.disconnect();
});
