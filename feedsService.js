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
const SEVEN_DAYS = 60 * 60 * 24 * 4;
const RSS_FEED_URL = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json"; // Glavni feed
const GPT_API_URL = "https://api.openai.com/v1/chat/completions";

// Redis konekcija
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379', // Dodali smo fallback vrijednost
});

// Hvatanje potencijalnih Redis grešaka
redisClient.on('error', err => {
  console.error('[Redis] Redis Client Error:', err);
  redisClient.disconnect();
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
    process.exit(1); // Prekida aplikaciju ako se ne poveže na Redis
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
        content: `Ti si svetski priznat stručnjak specijalizovan za kategorizaciju vesti. Radimo za projekat DACH News (nemački jezik). Imamo sledeće kategorije:
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

Obavezno dodeli jednu kategoriju svakoj vesti. Ako vest ne pripada nijednoj od ovih kategorija, svrstaćemo je u "Panorama". Ako je vest o saobraćajnim neserećama ili ima pojam kriminal ide u kategoriju Panorama. Molim te, vrati isključivo validan JSON niz bez ikakvog dodatnog teksta, objašnjenja ili markdown oznaka. Svaki element u nizu mora biti objekat sa tačno dva svojstva: "id" (string) i "category" (string). Primer odgovora: [ { "id": "primer1", "category": "Wirtschaft" }, { "id": "primer2", "category": "Panorama" } ]. Tvoj odgovor mora sadržati samo JSON niz, bez dodatnih znakova.`
      },
      {
        role: "user",
        content: JSON.stringify(combinedContent)
      }
    ],
    max_tokens: 5000,
    temperature: 0.2
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
        content: `
Du bist ein analytischer KI-Assistent, der ausschließlich im JSON-Format antwortet.

Deine Aufgabe ist es, jede Nachricht aus einer subtilen Perspektive zu analysieren. Falls die Nachricht keine Katastrophe oder Tragödie ist, füge am Ende einen humorvollen, provokativen Kommentar hinzu, der die Absurdität der Situation aufzeigt.

REGELN
Antwortstruktur (zwingend JSON-Format)

json
Copy code
{
  "id": "{Nachrichten-ID}",
  "analysis": "{Text von300–350 Zeichen, der das Thema subtil analysiert. Falls die Nachricht keine Katastrophe oder Tragödie ist, beende den Text mit einem kurzen, humorvollen Kommentar (max. 200 Zeichen), der die Situation ironisch oder provokativ kommentiert. Der Kommentar beginnt mit dem Zeichen • und wird direkt an die Analyse angehängt.}"
}
Wenn die Nachricht über ein Unglück oder eine Katastrophe spricht, muss der Ton der Analyse professionell, respektvoll und humorlos sein.

Verwende klaren und direkten Sprachgebrauch, vermeide komplexe Begriffe.
Ziel ist ein Flesch-Lesbarkeitsindex von 80 oder höher.
Verwende den aktiven Sprachgebrauch.
Vermeide Adverbien.

"analysis" (Meinung zur Nachricht):
Länge: 300–350 Zeichen (einschließlich Leerzeichen)
Formuliere eine reflektierte Meinung zur Nachricht aus einer subtilen sozialdemokratischen Perspektive, ohne offenes Parteinahme. Erwähne nicht explizit, aus welcher Perspektive du schreibst.
Nutze Fakten, Vergleiche oder rhetorische Fragen zur fundierten Analyse.
Der Ton soll differenziert und direkt, jedoch ohne Moralismus sein.

"kommentar" (Humorvoller Kommentar):
Länge: max. 200 Zeichen
Schreibe einen humorvollen Kommentar zur Nachricht, aber vermeide Wiederholungen (meide das Wort „vielleicht“). Sei kreativer.
Analysiere die folgende Nachricht und erstelle einen kurzen, 
humorvollen Kommentar, der ihre Absurdität, Ironie oder 
unerwartete Seite hervorhebt. Der Kommentar kann Sarkasmus, 
Wortspiele oder einen provokativen Ton enthalten, 
sollte aber im Rahmen des guten Geschmacks bleiben – ohne extreme 
oder beleidigende Inhalte.

Zusätzliche Hinweise:
Gib als Ergebnis ein JSON-Array zurück, in dem jeder Eintrag das Format hat:

json
Copy code
{ "id": "...", "analysis": "..." }
Wenn du den Input erhältst, antworte genau im beschriebenen JSON-Format, ohne zusätzliche Erklärungen oder Markdown.

Schreibe den Output so, dass zuerst der analysis Teil kommt und dann der humorvolle Kommentar. Am Anfang des Kommentars sollte das Zeichen • (alt+0149) stehen.
Gib mir die Analyse und den Kommentar unbedingt in einem einzigen Absatz zurück.`
},
      {
        role: "user",
        content: JSON.stringify(combinedContent)
      }
    ],
    max_tokens: 15000,
    temperature: 0.7,  
    top_p: 0.9,        
    frequency_penalty: 0.3,  
    presence_penalty: 0.2  
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

    // Ograničavamo veličinu slike na maksimalno 5MB
    const buffer = Buffer.from(response.data.slice(0, 5 * 1024 * 1024));

    // Nakon obrade, oslobađamo memoriju
    response.data = null;

    const sizes = {
      "news-card": { width: 80, height: 80, fit: "cover" },
      "news-modal": { width: 320, height: 240, fit: "inside" }
    };

    for (const [key, { width, height, fit }] of Object.entries(sizes)) {
      const resizedImage = await sharp(buffer)
        .resize(width, height, { fit })
        .webp({ quality: 80 })
        .toBuffer();

      console.log(`[storeImageInRedis] Kreirana verzija ${key} za ID:${id} (dimenzije: ${width}x${height})`);
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


// Provera da li je uređaj mobilni
//const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

// Provera da li je navigator definisan; ako nije, pretpostavljamo da uređaj nije mobilan
const isMobile = (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) || false;


// Postavljanje limita u zavisnosti od uređaja
const limit = pLimit(isMobile ? 2 : 4);

/**
 * Normalizuje izvor da bi se koristio glavni naziv umesto alternativnih domena.
 */
function normalizeSource(source) {
  let normalizedSource = source.toLowerCase();

  // Mapiraj alternativne domene na glavni naziv izvora
  for (let mainSource in sourceAliases) {
    if (sourceAliases[mainSource].includes(normalizedSource)) {
      return mainSource;
    }
  }
  return normalizedSource;
}

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

  // Čuvanje u PostgreSQL samo ako vest ima analizu
  if (analysis) {
    await saveNewsToPostgres(newsObj);
  }

  console.log(`[addItemToRedis] Upisano ID:${item.id}, category:${category}`);
}

/**
 * Generator funkcija koja vraća vesti iz Redis-a u paginaciji.
 * Smanjuje memorijski pritisak koristeći SCAN i LRange za dohvat po delovima.
 */
async function* getFeedsGenerator() {
  let cursor = 0;
  do {
    // Skeniramo Redis ključeve u batch-evima
    const { cursor: newCursor, keys } = await redisClient.scan(cursor, {
      MATCH: 'category:*',
      COUNT: 10
    });
    
    cursor = newCursor;

    for (const key of keys) {
      const items = await redisClient.lRange(key, 0, -1);
      yield items.map(item => JSON.parse(item)); // Emitujemo parsirane vesti
    }
  } while (cursor !== "0"); // Nastavljamo dok ne pređemo ceo Redis
}

/**
 * Vraća sve vesti iz Redis-a (spaja iz svih "category:*" listi) i deduplira ih po feed.id.
 * Koristi strimovanje da ne akumulira previše podataka u memoriji.
 */
export async function getAllFeedsFromRedis() {
  let all = [];

  let blockedSources = [];
  try {
    const stored = await redisClient.get("blockedSources");
    blockedSources = stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("[Redis] Greška pri čitanju blokiranih izvora:", err);
  }

  console.log("[getAllFeedsFromRedis] Počinjemo strimovanje feed-ova iz Redis-a...");

  for await (const batch of getFeedsGenerator()) {
    let filteredBatch = batch.filter(item => !blockedSources.includes(item.source));
    all = all.concat(filteredBatch);
  }

  // Dedupliciranje vesti po ID-ju
  const uniqueFeeds = {};
  all.forEach(feed => {
    uniqueFeeds[feed.id] = feed;
  });

  console.log(`[getAllFeedsFromRedis] Ukupno dohvaceno: ${Object.keys(uniqueFeeds).length} unikatnih vesti.`);
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

export { getFeedsGenerator };


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

  if (newItems.length < 10) {
    console.log("[processFeeds] Manje od 10 novih vesti, preskačemo GPT za sada.");
    return;
  }

  const BATCH_SIZE = 10;
  for (let i = 0; i + BATCH_SIZE <= newItems.length; i += BATCH_SIZE) {
    const batch = newItems.slice(i, i + BATCH_SIZE);
    console.log(`[processFeeds] Šaljem batch od ${batch.length} vesti na GPT API.`);
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
 * Čisti SEO keš (hash "seo:news") od vesti starijih od 7 dana.
 */
export async function cleanupSeoCache() {
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  try {
    const keys = await redisClient.hKeys("seo:news");
    for (const key of keys) {
      const itemStr = await redisClient.hGet("seo:news", key);
      if (itemStr) {
        let item;
        try {
          item = JSON.parse(itemStr);
        } catch (err) {
          // Ako parsiranje ne uspe, obriši zapis
          await redisClient.hDel("seo:news", key);
          continue;
        }
        if (item.date_published) {
          const publishedTime = new Date(item.date_published).getTime();
          if (now - publishedTime > SEVEN_DAYS_MS) {
            await redisClient.hDel("seo:news", key);
          }
        }
      }
    }
    console.log("[cleanupSeoCache] SEO keš očišćen.");
  } catch (error) {
    console.error("[cleanupSeoCache] Greška pri čišćenju SEO keša:", error);
  }
}


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
