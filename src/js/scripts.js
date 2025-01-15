// scripts.js

// import dotenv from 'dotenv';
// dotenv.config();

// Uvezi potrebne module
const fetch = require('node-fetch');

// Preuzmi API ključ iz okruženja
const apiKey = process.env.OPENAI_API_KEY;
console.log('API ključ učitan iz .env:', apiKey);

// URL feed-a
const feedUrl = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";

// Preuzimanje feedova
async function fetchFeeds() {
    try {
        const response = await fetch(feedUrl);
        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error("Greška prilikom preuzimanja feedova:", error);
        return [];
    }
}

// Proveravanje i keširanje feedova u memoriji (imitacija Redis keša na klijentskoj strani)
const cache = new Map();

function cacheFeeds(items) {
    const newItems = items.filter(item => !cache.has(item.id));
    newItems.forEach(item => {
        cache.set(item.id, item); // Simulacija keširanja
    });
    return newItems;
}

// Slanje feedova na OpenAI API
async function categorizeFeeds(feeds) {
    for (const feed of feeds) {
        const prompt = `
Kao stručnjak za kategorizaciju vesti, analiziraj RSS feedove iz ulaznog JSON-a i za svaki feed precizno odredi jednu od sledećih kategorija:
"Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur", "Auto", "Reisen", "Lifestyle", "Panorama", "Politik", "Unterhaltung", "Welt", "LGBT".

Odaberi kategoriju koja najbolje odgovara temi vesti. Vrati JSON sa podacima.

Primeri ulaznog feed-a:
{
  "id": "${feed.id}",
  "content": "${feed.content}"
}

Rezultat:
{
  "id": "${feed.id}", "kategorija": "Odabrana kategorija"
}

Pobrini se da svaka vest dobije tačnu kategoriju.
        `;

        try {
            const response = await fetch("https://api.openai.com/v1/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",  // Koristi validan model
                    prompt: prompt,
                    max_tokens: 100
                })
            });

            if (!response.ok) {
                throw new Error(`API greška: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const category = result.choices?.[0]?.text?.trim() || "Nepoznata kategorija";
            console.log(`Stavka '${feed.title}' spada u kategoriju: ${category}`);
        } catch (error) {
            console.error("Greška prilikom slanja feedova na OpenAI API:", error);
        }
    }
}

// Glavna funkcija
async function main() {
    const feeds = await fetchFeeds();
    const newFeeds = cacheFeeds(feeds);
    if (newFeeds.length > 0) {
        console.log(`Pronađeno ${newFeeds.length} novih feedova.`);
        await categorizeFeeds(newFeeds);
    } else {
        console.log("Nema novih feedova za kategorizaciju.");
    }
}

// Pokreni glavnu funkciju
main();


// Funkcija za prikaz kartice (news-card)
async function displayNewsCard(news) {
  const newsCard = document.getElementById('news-card');
  
  // Popunjavanje kartice podacima
  const titleElement = newsCard.querySelector('.news-title');
  const categoryElement = newsCard.querySelector('.news-category');
  const dateElement = newsCard.querySelector('.news-date');
  const imageElement = newsCard.querySelector('.news-image');
  const contentElement = newsCard.querySelector('.news-content');
  const linkElement = newsCard.querySelector('.news-link');

  titleElement.textContent = news.title;
  categoryElement.textContent = news.category;
  dateElement.textContent = new Date(news.date).toLocaleDateString();
  imageElement.src = news.image || 'placeholder.jpg'; // Ako nema slike, koristi placeholder
  imageElement.alt = news.title;
  contentElement.textContent = news.content;
  linkElement.href = news.url;
}

// Primer poziva sa dobijenim podacima od API-ja
const exampleNews = {
  title: "Primer naslova vesti",
  category: "Technologie",
  date: "2025-01-15T10:00:00Z",
  image: "https://example.com/news-image.jpg",
  content: "Ovo je sadržaj vesti koji je generisan.",
  url: "https://example.com/full-article"
};

// Prikazivanje primera
displayNewsCard(exampleNews);
