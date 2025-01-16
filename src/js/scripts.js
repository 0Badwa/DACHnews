// URL feed-a
const feedUrl = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";
// Filtriraj feedove po odabranoj kategoriji, ako category nije definisan, koristi "Uncategorized".
const filteredFeeds = feeds.filter(feed => feed.category === category || (!feed.category && category === "Uncategorized"));



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
    "LGBT+"
    "Uncategorized" // Nova kategorija za feedove bez definisane kategorije
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
        console.log("Preuzeti feedovi:", data.items); // Provera preuzetih feedova
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
    console.log("Novi feedovi za keširanje:", newFeeds); // Provera novih feedova za keširanje
    return newFeeds;
}

// Prikaz feedova po kategoriji
function displayNewsCardsByCategory(feeds, category) {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = ''; // Očisti prethodni sadržaj

    // Filtriraj feedove po odabranoj kategoriji
    const filteredFeeds = feeds.filter(feed => feed.category === category || (!feed.category && category === "Uncategorized"));
    console.log("Filtrirani feedovi za kategoriju:", category, filteredFeeds); // Provera filtriranih feedova

    // Generiši kartice
    filteredFeeds.forEach(feed => {
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

    if (filteredFeeds.length === 0) {
        container.innerHTML = '<p>Nema vesti za ovu kategoriju.</p>';
    }
}

// Generisanje tabova
function generateTabs() {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;

    categories.forEach(category => {
        if (category.toLowerCase() === 'home' || category.toLowerCase() === 'latest') {
            return;
        }

        const tabButton = document.createElement('button');
        tabButton.className = 'tab';
        tabButton.setAttribute('data-tab', category.toLowerCase());
        tabButton.textContent = category;
        tabsContainer.appendChild(tabButton);

        tabButton.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            tabButton.classList.add('active');
            displayNewsCardsByCategory(cachedFeeds, category);
        });
    });

    console.log("Tabovi generisani za kategorije:", categories); // Provera kreiranih tabova
}

// Glavna funkcija
let cachedFeeds = [];
async function main() {
    cachedFeeds = await fetchFeeds();
    console.log("Cached feeds:", cachedFeeds); // Provera keširanih feedova
    const newFeeds = cacheFeedsLocally(cachedFeeds);

    if (newFeeds.length > 0) {
        console.log(`Pronađeno ${newFeeds.length} novih feedova.`);
    } else {
        console.log("Nema novih feedova za kategorizaciju.");
    }
    generateTabs();
}

// Pokretanje aplikacije
main();
