/************************************************
 * feedsService.js
 ************************************************/

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { createClient } from 'redis';
import sharp from 'sharp';
import pLimit from 'p-limit';

// Konstante
const SEVEN_DAYS = 60 * 60 * 24 * 7;
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json"; // Glavni feed
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// Redis konekcija
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379', // Dodali smo fallback vrijednost
});

/**
 * Funkcija za uspostavljanje konekcije na Redis.
 */
export async function initRedis() {
  console.log("[Redis] Pokušaj povezivanja...");
  try {
    await redisClient.connect();
    console.log("[Redis] Konektovan na Redis!");
  } catch (err) {
    console.error("[Redis] Greška pri povezivanju:", err);
  }
}

/**
 * Funkcija koja preuzima glavni RSS feed.
 */
export async function fetchRSSFeed() {
  console.log("[fetchRSSFeed] Preuzimanje RSS feed-a sa:", RSS_FEED_URL);
  try {
    const response = await axios.get(RSS_FEED_URL);
    const items = response.data.items || [];
    console.log(`[fetchRSSFeed] Uspelo, broj vesti: ${items.length}`);
    return items;
  } catch (error) {
    console.error("[fetchRSSFeed] Greška pri preuzimanju RSS feed-a:", error);
    return [];
  }
}

/**
 * Funkcija za slanje batch-a feed stavki GPT API–ju radi kategorizacije.
 * Vraća JSON niz gde je svaki element: { "id": "...", "category": "..." }.
 * Temperatura je postavljena na 0.0.
 */
async function sendBatchToGPTCategorization(feedBatch) {
  console.log("[sendBatchToGPTCategorization] Slanje serije stavki GPT API–ju za kategorizaciju...");

  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: (item.description || item.content_text || "").slice(0, 500)
  }));

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Ti si veštački inteligentni asistent specijalizovan za kategorizaciju vesti za projekat DACH News (nemački jezik). Kategorije:
- Technologie
- Gesundheit
- Sport
- Wirtschaft
- Kultur
- Auto
- Reisen
- Lifestyle
- Panorama
- Politik
- Unterhaltung
- Welt

Ako vest sadrži informacije koje se jasno odnose na neku od ovih kategorija, postavi je u odgovarajuću. Ako vest ne pripada nijednoj kategoriji, svrstaćemo je u "Panorama". 
Molim te vrati isključivo JSON niz gde je svaki element: { "id": "...", "category": "..." }`
      },
      {
        role: "user",
        content: JSON.stringify(combinedContent)
      }
    ],
    max_tokens: 1500,
    temperature: 0.0
  };

  try {
    const response = await axios.post(GPT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    let gptText = response.data.choices?.[0]?.message?.content?.trim() || '';
    if (gptText.startsWith("```json")) {
      gptText = gptText.replace(/^```json\n?/, '').replace(/```$/, '');
    }
    return JSON.parse(gptText);
  } catch (error) {
    console.error("[sendBatchToGPTCategorization] Greška pri pozivu GPT API:", error?.response?.data || error.message);
    return null;
  }
}

/**
 * Funkcija za slanje batch-a feed stavki GPT API–ju radi analize.
 * Vraća JSON niz gde je svaki element: { "id": "...", "analysis": "..." }.
 * Temperatura je postavljena na 0.7; analiza treba da bude analitična i dužine između 500 i 600 karaktera.
 */
async function sendBatchToGPTAnalysis(feedBatch) {
  console.log("[sendBatchToGPTAnalysis] Slanje serije stavki GPT API–ju za analizu...");

  const combinedContent = feedBatch.map((item) => ({
    id: item.id,
    title: item.title,
    description: (item.description || item.content_text || "").slice(0, 500)
  }));

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Du bist ein analytischer KI-Assistent, der ausschließlich im JSON-Format antwortet. 
Deine Aufgabe ist es, jede Nachricht aus einer subtil sozialdemokratischen Perspektive zu analysieren. Falls die Nachricht keine Katastrophe oder Tragödie ist, füge am Ende eine humorvolle, provokante Bemerkung hinzu, die die Absurdität der Situation aufzeigt.

### REGELN

1. **Antwortstruktur (zwingend JSON-Format)**  
{
  "id": "{Nachrichten-ID}",
  "analysis": "{Text mit 500–700 Zeichen, der das Thema subtil aus sozialdemokratischer Perspektive analysiert. Falls die Nachricht keine Katastrophe oder Tragödie ist, beende den Text mit einem kurzen, humorvollen Kommentar (max. 200 Zeichen), der die Situation ironisch oder provokant kommentiert.}"
}

Falls die Nachricht von Unglücken oder Katastrophen handelt, muss der Ton der Analyse professionell, respektvoll und frei von Humor sein.

2. **"analysis" (Meinung zur Nachricht):**  
- Länge: **500–700 Zeichen (inkl. Leerzeichen)**  
- Verfasse eine reflektierte Meinung zur Nachricht. Subtil sozialdemokratische Perspektive, ohne offene Parteinahme  
- Nutze Fakten, Vergleiche oder rhetorische Fragen, um eine fundierte Einschätzung zu geben  
- Falls nötig, gib konkrete Beispiele oder Statistiken zur Unterstützung deiner Argumentation an  
- Betone Aspekte wie Arbeiterrechte, öffentliche Dienstleistungen, soziale Gerechtigkeit und gesellschaftliche Gleichheit  
- Der Ton soll differenziert, aber pointiert sein, ohne Moralisierung  
- Falls die Nachricht keine Katastrophe oder Tragödie ist, beende den Text mit einer kurzen, humorvollen Bemerkung (max. 200 Zeichen), die ironisch oder provokant auf die Situation eingeht.

3. **Zusätzliche Hinweise:**  
- Gib als Ergebnis ein JSON Array zurück, in dem jeder Eintrag das Format { "id": "...", "analysis": "..." } hat.  
- Wenn du den folgenden Input erhältst, antworte **exakt im beschriebenen JSON-Format**, ohne zusätzliche Erklärungen oder Markdown.`
      },
      {
        role: "user",
        content: JSON.stringify(combinedContent)
      }
    ],
    max_tokens: 1500,
    temperature: 0.7
  };



  try {
    const response = await axios.post(GPT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    console.log("[sendBatchToGPTAnalysis] GPT API response data:", response.data);
  
    let gptText = response.data.choices?.[0]?.message?.content?.trim() || '';
    if (gptText.startsWith("```json")) {
      gptText = gptText.replace(/^```json\n?/, '').replace(/```$/, '');
    }
    console.log("[sendBatchToGPTAnalysis] GPT text after cleanup:", gptText);
    
    return JSON.parse(gptText);
  } catch (error) {
    console.error("[sendBatchToGPTAnalysis] Greška pri pozivu GPT API:", error?.response?.data || error.message);
    return null;
  }
}

/**
 * Funkcija za smanjivanje slike (rezanje na 240px, kvalitet 80%) pomoću Sharp.
 */
async function smanjiSliku(buffer) {
  try {
    return await sharp(buffer)
      .resize(240, null, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error("[smanjiSliku] Greška pri resize-u:", error);
    return null;
  }
}

/**
 * Čuva smanjenu sliku u Redis u Base64 formatu (pod ključem "img:<id>").
 */
async function storeImageInRedis(imageUrl, id) {
  if (!imageUrl) return false;
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const sizes = {
      "news-card": { width: 80, height: 80, fit: "cover" },
      "news-modal": { width: 320, height: 240, fit: "inside" }
    };

    for (const [key, { width, height, fit }] of Object.entries(sizes)) {
      const resizedImage = await sharp(buffer)
        .resize(width, height, { fit })
        .webp({ quality: 80 })
        .toBuffer();
      await redisClient.set(`img:${id}:${key}`, resizedImage.toString('base64'));
    }

    console.log(`[storeImageInRedis] Kreirane verzije za ID:${id} (80x80, 320x240)`);
    return true;
  } catch (error) {
    console.error(`[storeImageInRedis] Greška pri optimizaciji slike za ID:${id}:`, error);
    return false;
  }
}

/**
 * Izvlačenje domena iz URL-a.
 */
function extractSource(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return "unknown";
  }
}

const limit = pLimit(3);

/**
 * Dodavanje jedne vesti u Redis, sa smanjenom slikom (ako postoji).
 * Sada funkcija prima i dodatni parametar 'analysis' koji sadrži AI analizu vesti.
 */
export async function addItemToRedis(item, category, analysis = null) {
  // Kreiramo objekat za vest
  const newsObj = {
    id: item.id,
    title: item.title,
    date_published: item.date_published || null,
    url: item.url || null,
    content_text: item.content_text || "",
    category,
    source: (item.authors && item.authors.length > 0)
      ? item.authors[0].name
      : extractSource(item.url),
    analysis: analysis // čuvamo i analizu vesti
  };

  // Ako ima sliku, pokušaj optimizacije
  if (item.image) {
    const success = await storeImageInRedis(item.image, item.id);
    newsObj.image = success ? `/image/${item.id}` : item.image;
  } else {
    newsObj.image = null;
  }

  // Dodavanje u odgovarajuću kategoriju
  const redisKey = `category:${category}`;
  await redisClient.rPush(redisKey, JSON.stringify(newsObj));
  await redisClient.expire(redisKey, SEVEN_DAYS);

  // Obeležimo ID kao obrađen
  await redisClient.sAdd("processed_ids", item.id);
  await redisClient.expire("processed_ids", SEVEN_DAYS);

  // Dodavanje vesti u listu "Aktuell" (poslednjih 200 vesti)
  await redisClient.lPush("Aktuell", JSON.stringify(newsObj));
  await redisClient.lTrim("Aktuell", 0, 199);

  // Dodavanje vesti u SEO hash (bez TTL) za statičke SEO stranice, uključujući analizu
  await redisClient.hSet("seo:news", item.id, JSON.stringify(newsObj));

  console.log(`[addItemToRedis] Upisano ID:${item.id}, category:${category}`);
}

/**
 * Vraća sve vesti iz Redis-a (spaja iz svih "category:*" listi) i deduplira ih po feed.id.
 */
export async function getAllFeedsFromRedis() {
  const keys = await redisClient.keys("category:*");
  let all = [];

  let blockedSources = [];
  try {
    const stored = await redisClient.get("blockedSources");
    blockedSources = stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("[Redis] Greška pri čitanju blokiranih izvora:", err);
  }

  for (const key of keys) {
    const items = await redisClient.lRange(key, 0, -1);
    let parsed = items.map(x => JSON.parse(x));
    parsed = parsed.filter(item => !blockedSources.includes(item.source));
    all = all.concat(parsed);
  }

  const uniqueFeeds = {};
  all.forEach(feed => {
    uniqueFeeds[feed.id] = feed;
  });
  return Object.values(uniqueFeeds);
}

/**
 * Vraća sve SEO vesti iz Redis hash "seo:news"
 */
export async function getSeoFeedsFromRedis() {
  try {
    const data = await redisClient.hGetAll("seo:news");
    // Redis vraća objekat gde su ključevi ID-jevi, a vrednosti JSON stringovi.
    const feeds = Object.values(data).map(item => JSON.parse(item));
    return feeds;
  } catch (error) {
    console.error("[getSeoFeedsFromRedis] Greška pri dohvaćanju SEO vesti:", error);
    return [];
  }
}

/**
 * Glavna funkcija za obradu feed-ova.
 * Ova funkcija preuzima nove vesti, eliminiše duplikate i šalje ih GPT API–ju
 * u dva poziva – jedan za kategorizaciju (temperatura 0.0) i jedan za analizu (temperatura 0.7).
 * Rezultati se kombinuju i čuvaju u Redis, uključujući u SEO hash za statičke SEO stranice.
 */
export async function processFeeds() {
  console.log("[processFeeds] Počinje procesiranje feed-ova...");

  const allItems = await fetchRSSFeed();
  console.log(`[processFeeds] Ukupno preuzeto ${allItems.length} feedova.`);

  if (allItems.length === 0) {
    console.log("[processFeeds] Nema feedova za obradu, prekid.");
    return;
  }

  let newItems = [];
  for (const item of allItems) {
    const alreadyProcessed = await redisClient.sIsMember("processed_ids", item.id);
    if (!alreadyProcessed) {
      newItems.push(item);
    }
  }

  newItems = [...new Map(newItems.map(item => [item.id, item])).values()];

  const titleMap = new Map();
  for (const it of newItems) {
    const existing = titleMap.get(it.title);
    if (!existing) {
      titleMap.set(it.title, it);
    } else {
      const itTime = (it.date_published) ? new Date(it.date_published).getTime() : 0;
      const existingTime = (existing.date_published) ? new Date(existing.date_published).getTime() : 0;
      if (itTime > existingTime) {
        titleMap.set(it.title, it);
      }
    }
  }
  newItems = Array.from(titleMap.values());

  if (newItems.length === 0) {
    console.log("[processFeeds] Sve vesti su već obrađene posle dupl. provere.");
    return;
  }
  console.log(`[processFeeds] Posle dupl. provere ostalo ${newItems.length} vesti.`);

  if (newItems.length < 2) {
    console.log("[processFeeds] Manje od 2 nove vesti, preskačemo GPT za sada.");
    return;
  }

  const BATCH_SIZE = 20;
  for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
    const batch = newItems.slice(i, i + BATCH_SIZE);
    // Paralelno pozovi GPT API za kategorizaciju i analizu
    const [catResponse, analysisResponse] = await Promise.all([
      sendBatchToGPTCategorization(batch),
      sendBatchToGPTAnalysis(batch)
    ]);

    if (!catResponse || !Array.isArray(catResponse) || !analysisResponse || !Array.isArray(analysisResponse)) {
      console.error("[processFeeds] GPT odgovor nevalidan. Sve ide u Uncategorized bez analize.");
      for (const item of batch) {
        await limit(() => addItemToRedis(item, "Uncategorized"));
      }
      continue;
    }

    await Promise.all(
      batch.map(item => {
        const catObj = catResponse.find(c => c.id === item.id);
        const analysisObj = analysisResponse.find(a => a.id === item.id);
        const cat = (catObj && catObj.category) ? catObj.category : "Uncategorized";
        const analysis = (analysisObj && analysisObj.analysis) ? analysisObj.analysis : null;
        return limit(() => addItemToRedis(item, cat, analysis));
      })
    );
  }

  console.log("[processFeeds] Završeno dodavanje novih feedova u Redis.");
}

console.log("[DEBUG] Debugging message for feedsService.js");

/**
 * Dohvata sve izvore iz Redis-a.
 */
export async function getAllSourcesFromRedis() {
  try {
    const keys = await redisClient.keys("source:*");
    const sources = [];
    for (const key of keys) {
      const source = await redisClient.get(key);
      if (source) {
        sources.push(JSON.parse(source));
      }
    }
    return sources;
  } catch (error) {
    console.error("[getAllSourcesFromRedis] Greška pri dohvaćanju izvora iz Redis-a:", error);
    return [];
  }
}
