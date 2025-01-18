/************************************************
 * scripts.js
 ************************************************/

// Globalna promenljiva za feedove (sveukupno)
let feeds = [];

// Definicija kategorija (moraju odgovarati onima koje GPT koristi!)
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

// Funkcija za preuzimanje SVIH feedova (spojenih iz Redis-a) sa servera
async function fetchAllFeedsFromServer() {
    const feedUrl = "/api/feeds";
    console.log("[fetchAllFeedsFromServer] Zahtev ka serveru za sve feedove:", feedUrl);
    try {
        const response = await fetch(feedUrl);
        if (!response.ok) throw new Error("Neuspešno preuzimanje feedova /api/feeds");
        const data = await response.json();
        console.log("[fetchAllFeedsFromServer] Primljeni feedovi:", data);
        return data;
    } catch (error) {
        console.error("[fetchAllFeedsFromServer] Greška:", error);
        return [];
    }
}

// Funkcija za čuvanje feedova u localStorage
function cacheAllFeedsLocally(items) {
    console.log("[cacheAllFeedsLocally] Čuvanje feedova u localStorage...");
    localStorage.setItem('feeds', JSON.stringify(items));
    console.log("[cacheAllFeedsLocally] Sačuvano:", items);
}

// Pomoćna funkcija da uklonimo 'active' klasu sa svih tab dugmića
function removeActiveClass() {
    console.log("[removeActiveClass] Uklanjanje 'active' klase sa svih tabova...");
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
}

// Pomoćna funkcija za kreiranje jedne kartice (HTML) feed vesti
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
        <p class="news-content">${feed.content_text || feed.description || ''}</p>
        <a class="news-link" href="${feed.url || '#'}" target="_blank">Pročitaj više</a>
    `;
    return newsCard;
}

// Prikaz svih feedova (HOME)
function displayAllFeeds() {
    console.log("[displayAllFeeds] Prikaz svih feedova u globalnom nizu 'feeds'...");
    const container = document.getElementById('news-container');
    if (!container) {
        console.log("[displayAllFeeds] Ne postoji #news-container u DOM-u!");
        return;
    }

    container.innerHTML = ''; // očistimo prethodni prikaz

    if (feeds.length === 0) {
        console.log("[displayAllFeeds] Nema feedova za prikaz.");
        container.innerHTML = '<p>Nema vesti za prikaz.</p>';
        return;
    }

    feeds.forEach(feed => {
        const card = createNewsCard(feed);
        container.appendChild(card);
    });
}

// Prikaz feedova sortiranih po datumu (LATEST)
function displayLatestFeeds() {
    console.log("[displayLatestFeeds] Sortiranje feedova po datumu (novije prvo)...");
    const container = document.getElementById('news-container');
    if (!container) {
        console.log("[displayLatestFeeds] Ne postoji #news-container!");
        return;
    }

    container.innerHTML = '';

    if (feeds.length === 0) {
        container.innerHTML = '<p>Nema vesti za prikaz.</p>';
        return;
    }

    // Sortiramo po date_published (opadajuće)
    const sorted = [...feeds].sort((a, b) => {
        const aTime = new Date(a.date_published).getTime() || 0;
        const bTime = new Date(b.date_published).getTime() || 0;
        return bTime - aTime;
    });

    sorted.forEach(feed => {
        const card = createNewsCard(feed);
        container.appendChild(card);
    });
}

// Prikaz feedova po kategoriji (tražimo od servera *ili* localStorage)
async function displayNewsByCategory(category) {
    console.log("[displayNewsByCategory] Kategorija:", category);
    const container = document.getElementById('news-container');
    if (!container) {
        console.log("[displayNewsByCategory] #news-container ne postoji!");
        return;
    }
    container.innerHTML = '';

    // Proverimo localStorage kes za tu kategoriju
    const cached = localStorage.getItem(`feeds-${category}`);
    let items = [];

    if (cached) {
        console.log(`[displayNewsByCategory] Koristimo keširane stavke za kategoriju '${category}'...`);
        items = JSON.parse(cached);
    } else {
        console.log(`[displayNewsByCategory] Nema lokalnog keša za '${category}', povlačimo sa servera...`);
        try {
            const response = await fetch(`/api/feeds-by-category/${encodeURIComponent(category)}`);
            if (!response.ok) throw new Error("Greška pri fetchu /api/feeds-by-category");
            items = await response.json();
            console.log("[displayNewsByCategory] Preuzete stavke sa servera:", items);
            localStorage.setItem(`feeds-${category}`, JSON.stringify(items));
            console.log(`[displayNewsByCategory] Sačuvane u localStorage: feeds-${category}`);
        } catch (error) {
            console.error("[displayNewsByCategory] Greška:", error);
            container.innerHTML = `<p>Greška pri učitavanju vesti za kategoriju ${category}.</p>`;
            return;
        }
    }

    if (!items || items.length === 0) {
        console.log("[displayNewsByCategory] Nema stavki za prikaz.");
        container.innerHTML = '<p>Nema vesti za ovu kategoriju.</p>';
        return;
    }

    items.forEach(feed => {
        const card = createNewsCard(feed);
        container.appendChild(card);
    });
}

// Inicijalna funkcija, učitava feedove iz localStorage ili sa servera
async function main() {
    console.log("[main] Početna provera localStorage za 'feeds'...");
    const cachedFeeds = localStorage.getItem('feeds');
    if (cachedFeeds) {
        // Ako imamo keš, radimo sa njim
        feeds = JSON.parse(cachedFeeds);
        console.log("[main] Učitani feedovi iz localStorage:", feeds);
        displayAllFeeds();
    } else {
        // Nema keša, povlačimo sve feedove sa servera
        console.log("[main] Nema lokalnog 'feeds', povlačimo /api/feeds...");
        const fresh = await fetchAllFeedsFromServer();
        feeds = fresh;
        // Snimimo u localStorage
        cacheAllFeedsLocally(fresh);
        displayAllFeeds();
    }

    // Opciono, možemo postaviti periodično osvežavanje i klijentski,
    // ali server to sam radi. Dodatno, ako hoćete da klijent automatski
    // povremeno povlači nove feedove, uradite recimo svake 2-3 minute:
    setInterval(async () => {
        console.log("[main - setInterval] Provera ima li novih feedova na serveru...");
        const fresh = await fetchAllFeedsFromServer();
        console.log("[main - setInterval] Preuzeto sveže:", fresh.length);

        // Proverimo ima li *novih* feedova po ID-u
        const cachedMap = {};
        for (const cf of feeds) {
            cachedMap[cf.id] = true;
        }
        let hasNew = false;
        for (const f of fresh) {
            if (!cachedMap[f.id]) {
                // Ovaj feed nismo imali
                feeds.push(f);
                hasNew = true;
            }
        }

        if (hasNew) {
            console.log("[main - setInterval] Nađeni su novi feedovi, ažuriramo localStorage i prikaz...");
            cacheAllFeedsLocally(feeds);
            // Ostanemo na istom prikazu (Home ili Category?), ovde je "Home" primer:
            displayAllFeeds();
        } else {
            console.log("[main - setInterval] Nema novih feedova na serveru.");
        }
    }, 3 * 60 * 1000); // npr. 3 minuta

}

// Tek kad se main završi, dodamo event listenere za tabove
main().then(() => {
    console.log("[main.then] Povezujemo tab dugmiće...");

    const homeTab = document.querySelector('[data-tab="home"]');
    const latestTab = document.querySelector('[data-tab="latest"]');
    const tabsContainer = document.getElementById('tabs-container');

    if (homeTab) {
        homeTab.addEventListener('click', (e) => {
            console.log("[Home Tab] Kliknuto...");
            removeActiveClass();
            e.target.classList.add('active');
            e.target.setAttribute('aria-selected', 'true');
            displayAllFeeds();
        });
    }
    if (latestTab) {
        latestTab.addEventListener('click', (e) => {
            console.log("[Latest Tab] Kliknuto...");
            removeActiveClass();
            e.target.classList.add('active');
            e.target.setAttribute('aria-selected', 'true');
            displayLatestFeeds();
        });
    }

    if (tabsContainer) {
        console.log("[main.then] Generisanje kategorija-dugmića (sem 'Uncategorized')...");
        const skipList = ["Uncategorized"];
        categories
          .filter(cat => !skipList.includes(cat))
          .forEach(cat => {
            const btn = document.createElement('button');
            btn.classList.add('tab');
            btn.setAttribute('data-tab', cat);
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', 'false');
            btn.textContent = cat;

            btn.addEventListener('click', (ev) => {
                console.log(`[Category Tab] Kliknuto na '${cat}'...`);
                removeActiveClass();
                ev.target.classList.add('active');
                ev.target.setAttribute('aria-selected', 'true');
                displayNewsByCategory(cat);
            });

            tabsContainer.appendChild(btn);
        });
    }
});
