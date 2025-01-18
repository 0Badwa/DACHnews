/************************************************
 * scripts.js
 ************************************************/

// Globalna promenljiva za feedove
let feeds = [];

// URL feed-a
const feedUrl = "/api/feeds";

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
        // Pretpostavljamo da data može biti { items: [...] } ili samo [...]
        const items = data.items || data;
        console.log("Preuzeti feedovi:", items);
        return items;
    } catch (error) {
        console.error("Greška prilikom preuzimanja feedova:", error);
        return [];
    }
}

// Keširanje feedova (Local Storage)
function cacheFeedsLocally(items) {
  localStorage.setItem('feeds', JSON.stringify(items));
  console.log("Sačuvani feedovi u localStorage:", items);
  return items;
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
         ${feed.date_published ? new Date(feed.date_published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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

    container.innerHTML = ''; // Očisti prethodni sadržaj

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

// Glavna funkcija koja koristi localStorage i periodično osvežava podatke
async function main() {
  // Pokušaj učitavanja feedova iz localStorage-a
  const cachedFeeds = localStorage.getItem('feeds');
  if (cachedFeeds) {
    feeds = JSON.parse(cachedFeeds);
    console.log("Učitani feedovi iz localStorage:", feeds);
    displayAllFeeds();
  } else {
    // Ako nema lokalno keširanih feedova, preuzmi ih sa servera
    const freshFeeds = await fetchFeeds();
    console.log("Preuzeti (sveži) feedovi sa servera:", freshFeeds);
    cacheFeedsLocally(freshFeeds);
    feeds = freshFeeds;
    displayAllFeeds();
  }

  // Postavi periodično osvežavanje svakih 15 minuta
  setInterval(async () => {
    const freshFeeds = await fetchFeeds();
    console.log("Periodično preuzeti (sveži) feedovi sa servera:", freshFeeds);
    cacheFeedsLocally(freshFeeds);
    feeds = freshFeeds;
    displayAllFeeds();
  }, 60 * 1000); // 15 minuta u milisekundama
}

// Pokretanje aplikacije i inicijalizacija tabova nakon učitavanja feedova
main().then(() => {
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
