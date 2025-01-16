// URL feed-a
const feedUrl = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";

// Definicija kategorija
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

// Preuzimanje feedova
async function fetchFeeds() {
    try {
        const response = await fetch(feedUrl);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Greška prilikom preuzimanja feedova:", error);
        return [];
    }
}

// Keširanje feedova (Local Storage)
function cacheFeedsLocally(items) {
    const cachedFeeds = JSON.parse(localStorage.getItem('feeds') || '[]');
    const newFeeds = items.filter(item => !cachedFeeds.some(cached => cached.id === item.id));
    localStorage.setItem('feeds', JSON.stringify([...cachedFeeds, ...newFeeds]));
    return newFeeds;
}

// Prikaz feedova po kategoriji
function displayNewsCardsByCategory(feeds, category) {
    const container = document.getElementById(`${category}-feed`);
    if (!container) return;

    container.innerHTML = '';
    feeds
        .filter(feed => feed.category === category)
        .forEach(feed => {
            const newsCard = document.createElement('div');
            newsCard.className = 'news-card';
            newsCard.innerHTML = `
                <h3 class="news-title">${feed.title}</h3>
                <p class="news-category">${feed.category}</p>
                <p class="news-date">${new Date(feed.date_published).toLocaleDateString()}</p>
                <img class="news-image" src="${feed.image || 'https://via.placeholder.com/150'}" alt="${feed.title}">
                <p class="news-content">${feed.content_text}</p>
                <a class="news-link" href="${feed.url}" target="_blank">Pročitaj više</a>
            `;
            container.appendChild(newsCard);
        });
}

// Glavna funkcija
async function main() {
    const feeds = await fetchFeeds();
    const newFeeds = cacheFeedsLocally(feeds);

    if (newFeeds.length > 0) {
        console.log(`Pronađeno ${newFeeds.length} novih feedova.`);

        try {
            const response = await fetch("/api/categorize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feeds: newFeeds })
            });

            if (!response.ok) {
                throw new Error(`API greška: ${response.status} ${response.statusText}`);
            }

            const categorizedFeeds = await response.json();

            // Učitaj kategorije iz Local Storage-a
            const loadedCategories = loadCategories();

            // Prikaži feedove po kategorijama
            loadedCategories.forEach(category => {
                displayNewsCardsByCategory(categorizedFeeds, category);
            });
        } catch (error) {
            console.error("Greška prilikom slanja feedova na OpenAI API:", error);
        }
    } else {
        console.log("Nema novih feedova za kategorizaciju.");
    }
}

// Pokretanje aplikacije
main();
