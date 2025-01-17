/************************************************
 * scripts.js
 ************************************************/

// Globalna promenljiva za feedove
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
    // Pokušaj učitavanja feedova iz localStorage
    const storedFeeds = localStorage.getItem('feeds');
    if (storedFeeds) {
        feeds = JSON.parse(storedFeeds);
        console.log("Učitani feedovi iz localStorage:", feeds);
    } else {
        // Ako nema u localStorage, preuzmi sa servera
        feeds = await fetchFeeds();
        console.log("Preuzeti feedovi:", feeds);
        const newFeeds = cacheFeedsLocally(feeds);

        if (newFeeds.length > 0) {
            console.log(`Pronađeno ${newFeeds.length} novih feedova.`);
        } else {
            console.log("Nema novih feedova za kategorizaciju.");
        }
        // Sačuvaj preuzete feedove u localStorage
        localStorage.setItem('feeds', JSON.stringify(feeds));
    }
}

// Pomoćna funkcija da uklonimo 'active' klasu sa svih tabova
function removeActiveClass() {
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
}

// Funkcija koja generiše HTML karticu za pojedinačan feed
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

// Ažurirana funkcija za prikazivanje vesti po kategoriji sa lokalnim keširanjem
async function displayNewsCardsByCategory(category) {
    const container = document.getElementById('news-container');
    if (!container) return;
                               console.log("Filtrirani feedovi za kategoriju:", category, parsedItems);

    container.innerHTML = ''; // Očisti prethodni sadržaj

    // Provera lokalnog keša za datu kategoriju
    const cachedCategory = localStorage.getItem(`feeds-${category}`);
    let parsedItems = [];

    if (cachedCategory) {
        parsedItems = JSON.parse(cachedCategory);
        console.log("Korišćenje keširanih feedova za kategoriju:", category, parsedItems);
    } else {
        try {
            const response = await fetch(`/api/feeds-by-category/${encodeURIComponent(category)}`);
            parsedItems = await response.json();
            console.log("Filtrirani feedovi za kategoriju:", category, parsedItems);

            // Sačuvaj preuzete podatke u localStorage
            localStorage.setItem(`feeds-${category}`, JSON.stringify(parsedItems));
        } catch (error) {
            console.error(`Greška pri preuzimanju vesti za kategoriju ${category}:`, error);
            container.innerHTML = '<p>Greška pri učitavanju vesti.</p>';
            return;
        }
    }

    if(parsedItems.length === 0) {
        container.innerHTML = '<p>Nema vesti za ovu kategoriju.</p>';
    } else {
        parsedItems.forEach(feed => {
            const newsCard = createNewsCard(feed);
            container.appendChild(newsCard);
        });
    }
}

// Prikaz svih feedova (za "Home")
function displayAllFeeds() {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = ''; // Očisti prethodni sadržaj

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

    // Sortiramo kopiju niza feedova po datumu objave (opadajuće)
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
main().then(() => {
    // Kad se feedovi preuzmu i keširaju, prikažemo "Home" (sve feedove) i markiramo Home tab
    displayAllFeeds();

    // Selektujemo statičke tabove
    const homeTab = document.querySelector('[data-tab="home"]');
    const latestTab = document.querySelector('[data-tab="latest"]');

    // Klik na Home
    if (homeTab) {
        homeTab.addEventListener('click', (e) => {
            removeActiveClass();
            e.target.classList.add('active');
            e.target.setAttribute('aria-selected', 'true');
            displayAllFeeds();
        });
    }

    // Klik na Latest
    if (latestTab) {
        latestTab.addEventListener('click', (e) => {
            removeActiveClass();
            e.target.classList.add('active');
            e.target.setAttribute('aria-selected', 'true');
            displayLatestFeeds();
        });
    }

    // Dinamičko dodavanje tabova za ostale kategorije
    const tabsContainer = document.getElementById('tabs-container');
    if (tabsContainer) {
        const dynamicCategories = categories;
        const skipList = ["Uncategorized"];

        dynamicCategories
            .filter(cat => !skipList.includes(cat))
            .forEach(cat => {
                const btn = document.createElement('button');
                btn.classList.add('tab');
                btn.setAttribute('data-tab', cat);
                btn.setAttribute('role', 'tab');
                btn.setAttribute('aria-selected', 'false');
                btn.textContent = cat;

                btn.addEventListener('click', (e) => {
                    removeActiveClass();
                    e.target.classList.add('active');
                    e.target.setAttribute('aria-selected', 'true');
                    displayNewsCardsByCategory(cat);
                });

                tabsContainer.appendChild(btn);
            });
    }
});
