/************************************************
 * scripts.js
 ************************************************/

// Globalna promenljiva za feedove
let feeds = [];

// URL feed-a
const feedUrl = "/api/feeds";

// Definicija kategorija (možete menjati po želji)
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
    "Uncategorized" 
];

// Funkcija za čuvanje kategorija u Local Storage
function saveCategories() {
    console.log("[saveCategories] Čuvanje kategorija u localStorage...");
    localStorage.setItem('categories', JSON.stringify(categories));
    console.log("[saveCategories] Kategorije su sačuvane lokalno:", categories);
}

function loadCategories() {
    console.log("[loadCategories] Pokušaj učitavanja kategorija iz localStorage...");
    const savedCategories = localStorage.getItem('categories');
    if (savedCategories) {
        console.log("[loadCategories] Učitane kategorije iz localStorage:", JSON.parse(savedCategories));
        return JSON.parse(savedCategories);
    } else {
        console.log("[loadCategories] Nema sačuvanih kategorija. Koristimo podrazumevane.");
        saveCategories();
        return categories;
    }
}

function addCategory(newCategory) {
    console.log("[addCategory] Pokušaj dodavanja nove kategorije:", newCategory);
    const currentCategories = loadCategories();
    if (!currentCategories.includes(newCategory)) {
        currentCategories.push(newCategory);
        localStorage.setItem('categories', JSON.stringify(currentCategories));
        console.log(`[addCategory] Kategorija '${newCategory}' je uspešno dodata.`);
    } else {
        console.log(`[addCategory] Kategorija '${newCategory}' već postoji.`);
    }
}

function removeCategory(category) {
    console.log("[removeCategory] Pokušaj brisanja kategorije:", category);
    const currentCategories = loadCategories();
    const index = currentCategories.indexOf(category);
    if (index > -1) {
        currentCategories.splice(index, 1);
        localStorage.setItem('categories', JSON.stringify(currentCategories));
        console.log(`[removeCategory] Kategorija '${category}' je obrisana.`);
    } else {
        console.log(`[removeCategory] Kategorija '${category}' ne postoji.`);
    }
}

// Preuzimanje feedova sa servera
async function fetchFeeds() {
    console.log("[fetchFeeds] Pokušaj preuzimanja feedova sa servera:", feedUrl);
    try {
        const response = await fetch(feedUrl);
        if (!response.ok) throw new Error("Neuspešno preuzimanje feedova.");
        const data = await response.json();
        console.log("[fetchFeeds] RSS App JSON preuzet:", data);

        // Ako je data = { items: [...] } ili samo [...]
        const items = data.items || data;
        console.log("[fetchFeeds] Extraktovani feed items:", items);

        return items;
    } catch (error) {
        console.error("[fetchFeeds] Greška prilikom preuzimanja feedova:", error);
        return [];
    }
}

// Keširanje feedova u localStorage
function cacheFeedsLocally(items) {
  console.log("[cacheFeedsLocally] Keširanje feedova u localStorage...");
  localStorage.setItem('feeds', JSON.stringify(items));
  console.log("[cacheFeedsLocally] Sačuvani feedovi u localStorage:", items);
  return items;
}

// Pomoćna funkcija za uklanjanje 'active' klasa
function removeActiveClass() {
  console.log("[removeActiveClass] Uklanjanje 'active' klase sa svih tabova...");
  const allTabs = document.querySelectorAll('.tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
}

// Generisanje pojedinačne kartice feeda
function createNewsCard(feed) {
    console.log("[createNewsCard] Kreiranje kartice za feed:", feed.title);
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    newsCard.innerHTML = `
        <h3 class="news-title">${feed.title}</h3>
        <p class="news-category">${feed.category || 'Uncategorized'}</p>
        <p class="news-date">
         ${feed.date_published ? new Date(feed.date_published).toLocaleDateString() : 'N/A'} 
         ${feed.date_published ? new Date(feed.date_published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
        <img class="news-image" src="${feed.image || 'https://via.placeholder.com/150'}" alt="${feed.title}">
        <p class="news-content">${feed.content_text || ''}</p>
        <a class="news-link" href="${feed.url}" target="_blank">Pročitaj više</a>
    `;
    return newsCard;
}

// Prikaz vesti po kategoriji
async function displayNewsCardsByCategory(category) {
    console.log("[displayNewsCardsByCategory] Prikaz vesti za kategoriju:", category);
    const container = document.getElementById('news-container');
    if (!container) {
        console.log("[displayNewsCardsByCategory] container #news-container ne postoji na stranici.");
        return;
    }

    container.innerHTML = ''; // Očisti prethodni sadržaj

    // Prvo proveravamo da li postoji lokalni keš za tu kategoriju
    const cachedCategory = localStorage.getItem(`feeds-${category}`);
    let parsedItems = [];

    if (cachedCategory) {
        console.log(`[displayNewsCardsByCategory] Korišćenje keširanih feedova za kategoriju '${category}'...`);
        parsedItems = JSON.parse(cachedCategory);
        console.log(`[displayNewsCardsByCategory] Keširani feedovi:`, parsedItems);
    } else {
        console.log(`[displayNewsCardsByCategory] Nema lokalnog keša za kategoriju '${category}'. Preuzimamo sa servera...`);
        try {
            const response = await fetch(`/api/feeds-by-category/${encodeURIComponent(category)}`);
            parsedItems = await response.json();
            console.log("[displayNewsCardsByCategory] Feedovi preuzeti sa servera:", parsedItems);
            localStorage.setItem(`feeds-${category}`, JSON.stringify(parsedItems));
            console.log(`[displayNewsCardsByCategory] Feedovi sačuvani u localStorage za kategoriju '${category}'.`);
        } catch (error) {
            console.error(`[displayNewsCardsByCategory] Greška pri preuzimanju vesti za kategoriju ${category}:`, error);
            container.innerHTML = '<p>Greška pri učitavanju vesti.</p>';
            return;
        }
    }

    if(parsedItems.length === 0) {
        console.log("[displayNewsCardsByCategory] Nema vesti za prikaz.");
        container.innerHTML = '<p>Nema vesti za ovu kategoriju.</p>';
    } else {
        parsedItems.forEach(feed => {
            const newsCard = createNewsCard(feed);
            container.appendChild(newsCard);
        });
    }
}

// Prikaz svih feedova (Home tab)
function displayAllFeeds() {
    console.log("[displayAllFeeds] Prikaz svih feedova u globalnom nizu 'feeds'...");
    const container = document.getElementById('news-container');
    if (!container) {
        console.log("[displayAllFeeds] container #news-container ne postoji.");
        return;
    }

    container.innerHTML = '';

    feeds.forEach(feed => {
        const newsCard = createNewsCard(feed);
        container.appendChild(newsCard);
    });

    if (feeds.length === 0) {
        console.log("[displayAllFeeds] Nema feedova za prikaz.");
        container.innerHTML = '<p>Nema vesti za prikaz.</p>';
    }
}

// Prikaz feedova sortiranih po datumu (Latest)
function displayLatestFeeds() {
    console.log("[displayLatestFeeds] Sortiranje feedova po datumu objave...");
    const container = document.getElementById('news-container');
    if (!container) {
        console.log("[displayLatestFeeds] container #news-container ne postoji.");
        return;
    }

    container.innerHTML = '';

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
        console.log("[displayLatestFeeds] Nema feedova za prikaz.");
        container.innerHTML = '<p>Nema vesti za prikaz.</p>';
    }
}

// Glavna funkcija
async function main() {
  console.log("[main] Inicijalna provera lokalno keširanih feedova...");
  const cachedFeeds = localStorage.getItem('feeds');
  if (cachedFeeds) {
    feeds = JSON.parse(cachedFeeds);
    console.log("[main] Učitani feedovi iz localStorage:", feeds);
    displayAllFeeds();
  } else {
    console.log("[main] Nema feedova u localStorage. Preuzimamo sveže feedove sa servera...");
    const freshFeeds = await fetchFeeds();
    console.log("[main] Preuzeti (sveži) feedovi sa servera:", freshFeeds);
    cacheFeedsLocally(freshFeeds);
    feeds = freshFeeds;
    displayAllFeeds();
  }

  // Periodično osvežavanje na 15 minuta (možete menjati)
  setInterval(async () => {
    console.log("[main - setInterval] Vreme za periodično osvežavanje feedova...");
    const freshFeeds = await fetchFeeds();
    console.log("[main - setInterval] Ponovo preuzeti (sveži) feedovi sa servera:", freshFeeds);
    cacheFeedsLocally(freshFeeds);
    feeds = freshFeeds;
    displayAllFeeds();
  }, 15 * 60 * 1000); 
}

main().then(() => {
    console.log("[main.then] Inicijalizacija tabova (Home, Latest, i kategorije)...");
    const homeTab = document.querySelector('[data-tab="home"]');
    const latestTab = document.querySelector('[data-tab="latest"]');

    if (homeTab) {
        homeTab.addEventListener('click', (e) => {
            console.log("[Home Tab] Kliknuto na Home tab...");
            removeActiveClass();
            e.target.classList.add('active');
            e.target.setAttribute('aria-selected', 'true');
            displayAllFeeds();
        });
    }

    if (latestTab) {
        latestTab.addEventListener('click', (e) => {
            console.log("[Latest Tab] Kliknuto na Latest tab...");
            removeActiveClass();
            e.target.classList.add('active');
            e.target.setAttribute('aria-selected', 'true');
            displayLatestFeeds();
        });
    }

    // Dinamičko dodavanje tabova
    const tabsContainer = document.getElementById('tabs-container');
    if (tabsContainer) {
        console.log("[main.then] Generisanje dugmića/tabova za sve kategorije osim 'Uncategorized'...");
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
                    console.log(`[Category Tab] Kliknuto na kategoriju '${cat}'.`);
                    removeActiveClass();
                    e.target.classList.add('active');
                    e.target.setAttribute('aria-selected', 'true');
                    displayNewsCardsByCategory(cat);
                });

                tabsContainer.appendChild(btn);
            });
    }
});
