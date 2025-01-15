// Učitaj .env fajl i konfiguraciju iz njega
require('dotenv').config();

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
        const prompt = `U koju kategoriju spada sledeći sadržaj: ${feed.content}`;
        
        try {
            const response = await fetch("https://api.openai.com/v1/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4",  // Koristite validan model prema vašim potrebama
                    prompt: prompt,
                    max_tokens: 50
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
