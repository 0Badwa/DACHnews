/************************************************
 * scripts.js
 ************************************************/

// Globalna promenljiva za feedove (neka ostane na vrhu)
let feeds = [];

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
    "LGBT+",
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
        if (!response.ok) throw new Error("Neuspešno preuzimanje feedova.");
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

// Glavna funkcija
async function main() {
    feeds = await fetchFeeds(); // Učitaj feedove i sačuvaj u globalnoj varijabli
    console.log("Keširani feedovi:", feeds);
    const newFeeds = cacheFeedsLocally(feeds);

    if (newFeeds.length > 0) {
        console.log(`Pronađeno ${newFeeds.length} novih feedova.`);
    } else {
        console.log("Nema novih feedova za kategorizaciju.");
    }
}

// Funkcija koja generiše HTML karticu za pojedinačan feed
// (koristimo je unutar funkcija displayAllFeeds, displayNewsCardsByCategory, displayLatestFeeds itd.)
function createNewsCard(feed) {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    newsCard.innerHTML = `
        <h3 class="news-title">${feed.title}</h3>
        <p class="news-category">${feed.category || 'Uncategorized'}</p>
        <p class="news-date">
          ${feed.date_published ? new Date(feed.date_published).toLocaleDateString() : 'N/A'}
        </p>
        <img class="news-image" src="${feed.image || 'https://via.placeholder.com/150'}" alt="${feed.title}">
        <p class="news-content">${feed.content_text || ''}</p>
        <a class="news-link" href="${feed.url}" target="_blank">Pročitaj više</a>
    `;
    return newsCard;
}

// Prikaz feedova po kategoriji
function displayNewsCardsByCategory(category) {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = ''; // Očisti prethodni sadržaj

    // Filtriraj feedove po odabranoj kategoriji
    const filteredFeeds = feeds.filter(feed => {
        // Ako feed ima kategoriju i poklapa se sa prosleđenom,
        // ili feed nema kategoriju, a tražena je "Uncategorized"
        return (feed.category === category) || (!feed.category && category === "Uncategorized");
    });

    console.log("Filtrirani feedovi za kategoriju:", category, filteredFeeds);

    // Generiši kartice
    filteredFeeds.forEach(feed => {
        const newsCard = createNewsCard(feed);
        container.appendChild(newsCard);
    });

    if (filteredFeeds.length === 0) {
        container.innerHTML = '<p>Nema vesti za ovu kategoriju.</p>';
    }
}

// Prikaz svih feedova (za "Home")
function displayAllFeeds() {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = ''; // Očisti prethodni sadržaj

    // Prikaži sve feedove
    feeds.forEach(feed => {
        const newsCard = createNewsCard(feed);
        container.appendChild(newsCard);
    });

    if (feeds.length === 0) {
        container.innerHTML = '<p>Nema vesti za prikaz.</p>';
    }
}

// Prikaz feedova sortiranih po datumu (za "Latest")
function displayLatestFeeds() {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = ''; // Očisti prethodni sadržaj

    // Sortiramo kopiju niza feedova po datumu objave (opadajući)
    const sortedFeeds = [...feeds].sort((a, b) => {
        const dateA = new Date(a.date_published).getTime() || 0;
        const dateB = new Date(b.date_published).getTime() || 0;
        return dateB - dateA;
    });

    sortedFeeds.forEach(feed => {
        const newsCard = createNewsCard(feed);
        container.appendChild(newsCard);
    });

    if (sortedFeeds.length === 0) {
        container.innerHTML = '<p>Nema vesti za prikaz.</p>';
    }
}

// Pokretanje aplikacije
// Pozvaćemo prvo main() da učita feedove, pa nakon toga prikažemo sve feedove (Home).
main().then(() => {
    // Odmah nakon što su feedovi učitani i keširani, prikaži sve feedove:
    displayAllFeeds();

    // Event listener za klik na "Home" tab
    const homeTab = document.querySelector('[data-tab="home"]');
    if (homeTab) {
        homeTab.addEventListener('click', () => {
            // Aktiviraj "Home" prikaz
            displayAllFeeds();
        });
    }

    // Event listener za klik na "Latest" tab
    const latestTab = document.querySelector('[data-tab="latest"]');
    if (latestTab) {
        latestTab.addEventListener('click', () => {
            // Aktiviraj "Latest" prikaz
            displayLatestFeeds();
        });
    }
});
