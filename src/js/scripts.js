// scripts.js

// URL feed-a (možeš ostaviti kako jeste ili menjati)
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

// -----------------------------------------------------------------------------------
// Funkcija za slanje feed-ova ka serveru radi kategorizacije (umesto direktno GPT API).
// -----------------------------------------------------------------------------------
async function categorizeFeeds(feeds) {
    try {
        // Pozivamo našu Express rutu na serveru: "/api/categorize"
        const response = await fetch("/api/categorize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ feeds })  // šaljemo {feeds: [ ... ]}
        });

        if (!response.ok) {
            throw new Error(`API greška: ${response.status} ${response.statusText}`);
        }

        // Rezultat će biti niz objekata { id, category }
        const results = await response.json();

        // Loguj rezultate, ili uradi nešto drugo sa njima
        results.forEach(result => {
            console.log(`Stavka '${result.id}' spada u kategoriju: ${result.category}`);
        });
    } catch (error) {
        console.error("Greška prilikom slanja feedova na OpenAI API (server-side):", error);
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


// ---------------------------------------------------------
// Ostatak koda za rad sa kategorijama (Local Storage):
// ---------------------------------------------------------
const categories = [
    "Technologie",
    "Gesundheit",
    "Sport",
    "Wirtschaft",
    "Kultur",
    "Auto",
    "Reisen",
    "Lifestyle",
    "Panorama",
    "Politik",
    "Unterhaltung",
    "Welt",
    "LGBT"
];

// Funkcija za čuvanje kategorija u Local Storage
function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
    console.log("Kategorije su sačuvane lokalno.");
}

// Funkcija za učitavanje kategorija iz Local Storage-a
function loadCategories() {
    const savedCategories = localStorage.getItem('categories');
    if (savedCategories) {
        console.log("Učitane kategorije:", JSON.parse(savedCategories));
        return JSON.parse(savedCategories);
    } else {
        console.log("Nema sačuvanih kategorija. Koristimo podrazumevane.");
        saveCategories();
        return categories;
    }
}

// Funkcija za dodavanje novih kategorija
function addCategory(newCategory) {
    const currentCategories = loadCategories();
    if (!currentCategories.includes(newCategory)) {
        currentCategories.push(newCategory);
        localStorage.setItem('categories', JSON.stringify(currentCategories));
        console.log(`Kategorija '${newCategory}' je dodata.`);
    } else {
        console.log(`Kategorija '${newCategory}' već postoji.`);
    }
}

// Funkcija za brisanje kategorije
function removeCategory(category) {
    const currentCategories = loadCategories();
    const index = currentCategories.indexOf(category);
    if (index > -1) {
        currentCategories.splice(index, 1);
        localStorage.setItem('categories', JSON.stringify(currentCategories));
        console.log(`Kategorija '${category}' je obrisana.`);
    } else {
        console.log(`Kategorija '${category}' ne postoji.`);
    }
}

// Pokrećemo inicijalno učitavanje kategorija
const loadedCategories = loadCategories();
console.log("Sve kategorije:", loadedCategories);
