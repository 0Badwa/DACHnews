/************************************************
 * scripts.js
 ************************************************/

// Globalna promenljiva
let feeds = [];

// Kategorije (iste kao u GPT promptu + "Uncategorized")
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

// Pomoćna funkcija za prikaz vremena od objave u nemačkom formatu
function timeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const seconds = Math.floor((now - past) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `vor ${interval} Jahr${interval > 1 ? 'en' : ''}`;

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `vor ${interval} Monat${interval > 1 ? 'en' : ''}`;

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `vor ${interval} Tag${interval > 1 ? 'en' : ''}`;

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `vor ${interval} Stunde${interval > 1 ? 'n' : ''}`;

  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `vor ${interval} Minute${interval > 1 ? 'n' : ''}`;

  return `gerade eben`;
}

// Učitavanje SVIH feedova sa servera (spojenih iz Redis-a)
async function fetchAllFeedsFromServer() {
  console.log("[fetchAllFeedsFromServer] /api/feeds...");
  try {
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
    const data = await response.json();
    console.log("[fetchAllFeedsFromServer] Primljeno:", data.length, "vesti");
    return data;
  } catch (error) {
    console.error("[fetchAllFeedsFromServer] Greška:", error);
    return [];
  }
}

// Čuvanje feedova u localStorage
function cacheAllFeedsLocally(items) {
  localStorage.setItem('feeds', JSON.stringify(items));
  console.log("[cacheAllFeedsLocally] Sačuvano:", items.length, "vesti u localStorage");
}

// Uklanjanje 'active' klase sa tab dugmića
function removeActiveClass() {
  console.log("[removeActiveClass] Uklanjam 'active' sa svih tabova...");
  const allTabs = document.querySelectorAll('.tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
}

// Kreiranje HTML kartice za pojedinačni feed prema novim specifikacijama
function createNewsCard(feed) {
  console.log("[createNewsCard] Kreiranje kartice za:", feed.title);
  
  const card = document.createElement('div');
  card.className = "news-card";

  // Kreiranje elementa za sliku
  const img = document.createElement('img');
  img.className = "news-card-image";
  img.src = feed.image || 'https://via.placeholder.com/150';
  img.alt = feed.title;

  // Kreiranje kontejnera za sadržaj kartice
  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  // Naslov vesti
  const title = document.createElement('h3');
  title.className = "news-title";
  title.textContent = feed.title;

  // Izvor i vreme od objave
  const source = document.createElement('p');
  source.className = "news-meta";
  // Pretpostavljamo da feed ima polje 'source'; ako ne, zamenite sa odgovarajućim izvorom.
  const sourceName = feed.source || 'Nepoznat izvor';
  const timeString = feed.date_published ? timeAgo(feed.date_published) : '';
  source.textContent = `${sourceName} • ${timeString}`;

  // Sastavljanje sadržaja kartice
  contentDiv.appendChild(title);
  contentDiv.appendChild(source);

  // Dodavanje slike i sadržaja u glavnu karticu
  card.appendChild(img);
  card.appendChild(contentDiv);

  return card;
}

// Prikaz feedova – *sortiramo* po datumu (najnoviji prvo) i uklanjamo duplikate
function displayAllFeeds() {
  console.log("[displayAllFeeds] Prikaz svih feedova (sortirano)...");
  const container = document.getElementById('news-container');
  if (!container) {
    console.error("[displayAllFeeds] #news-container ne postoji!");
    return;
  }
  container.innerHTML = '';

  // Sortiranje feedova po date_published (opadajuće)
  const sorted = [...feeds].sort((a, b) => {
    const dateA = new Date(a.date_published).getTime() || 0;
    const dateB = new Date(b.date_published).getTime() || 0;
    return dateB - dateA; // najnoviji prvi
  });

  // Filtriranje duplikata na osnovu 'id'
  const uniqueFeedsMap = new Map();
  sorted.forEach(feed => {
    if (!uniqueFeedsMap.has(feed.id)) {
      uniqueFeedsMap.set(feed.id, feed);
    }
  });
  const uniqueFeeds = Array.from(uniqueFeedsMap.values());

  if (uniqueFeeds.length === 0) {
    container.innerHTML = "<p>Nema vesti.</p>";
    return;
  }

  uniqueFeeds.forEach(feed => {
    container.appendChild(createNewsCard(feed));
  });
}

// Prikaz feedova *po kategoriji* uz uklanjanje duplikata
async function displayNewsByCategory(category) {
  console.log("[displayNewsByCategory] Kategorija:", category);
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  // Pogledamo da li imamo keš za tu kategoriju
  const cached = localStorage.getItem(`feeds-${category}`);
  let data = [];

  if (cached) {
    console.log(`[displayNewsByCategory] Koristimo keširane feedove za '${category}'...`);
    data = JSON.parse(cached);
  } else {
    console.log(`[displayNewsByCategory] Nema keša, povlačimo /api/feeds-by-category/${category}`);
    try {
      const resp = await fetch(`/api/feeds-by-category/${encodeURIComponent(category)}`);
      if (!resp.ok) throw new Error("Greška u fetch-u /feeds-by-category");
      data = await resp.json();
      console.log(`[displayNewsByCategory] Primljeno:`, data.length, "vesti");
      // Sačuvamo u localStorage
      localStorage.setItem(`feeds-${category}`, JSON.stringify(data));
    } catch (error) {
      console.error("[displayNewsByCategory] Greška:", error);
      container.innerHTML = `<p>Greška pri učitavanju kategorije ${category}.</p>`;
      return;
    }
  }

  // Sortiramo po datumu opadajuće
  const sorted = data.sort((a, b) => {
    const da = new Date(a.date_published).getTime() || 0;
    const db = new Date(b.date_published).getTime() || 0;
    return db - da;
  });

  // Filtriranje duplikata na osnovu 'id'
  const uniqueFeedsMap = new Map();
  sorted.forEach(feed => {
    if (!uniqueFeedsMap.has(feed.id)) {
      uniqueFeedsMap.set(feed.id, feed);
    }
  });
  const uniqueFeeds = Array.from(uniqueFeedsMap.values());

  if (uniqueFeeds.length === 0) {
    container.innerHTML = "<p>Nema vesti za ovu kategoriju.</p>";
    return;
  }

  uniqueFeeds.forEach(feed => {
    container.appendChild(createNewsCard(feed));
  });
}

// main inicijalna funkcija
async function main() {
  console.log("[main] Provera localStorage('feeds')...");
  const cachedFeeds = localStorage.getItem('feeds');

  if (cachedFeeds) {
    feeds = JSON.parse(cachedFeeds);
    console.log(`[main] Učitano ${feeds.length} feedova iz localStorage`);
    displayAllFeeds(); // prikažemo sortirano
  } else {
    console.log("[main] Nema 'feeds' u localStorage, dohvatamo sa servera...");
    const fresh = await fetchAllFeedsFromServer();
    feeds = fresh;
    cacheAllFeedsLocally(fresh);
    displayAllFeeds();
  }

  // (Opcionalno) Periodično da vidimo ima li NOVIH feedova
  setInterval(async () => {
    console.log("[main - setInterval] Provera novih feedova na serveru...");
    const fresh = await fetchAllFeedsFromServer();
    if (fresh.length > feeds.length) {
      console.log("[main - setInterval] Ima novih feedova, ažuriramo localStorage i prikaz...");
      feeds = fresh;
      cacheAllFeedsLocally(feeds);
      displayAllFeeds();
    } else {
      console.log("[main - setInterval] Nema novih feedova.");
    }
  }, 180000); // npr. svake 3 min
}

// Kada se main završi, dodelimo event listenere tabova
main().then(() => {
  console.log("[main.then] Inicijalizacija tabova...");

  const homeTab = document.querySelector('[data-tab="home"]');
  const tabsContainer = document.getElementById('tabs-container');

  if (homeTab) {
    homeTab.addEventListener('click', (e) => {
      console.log("[Home Tab] Kliknuto...");
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      displayAllFeeds(); // Najnoviji prvi
    });
  }

  // Generišemo dugmiće/tabove za svaku kategoriju
  if (tabsContainer) {
    console.log("[main.then] Generišemo tabove za kategorije...");
    const skipList = []; // ovde biste npr. ubacili "Uncategorized" ako ne želite prikaz

    categories
      .filter(cat => !skipList.includes(cat))
      .forEach(cat => {
        // Kreiramo dugme
        const btn = document.createElement('button');
        btn.classList.add('tab');
        btn.setAttribute('data-tab', cat);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.textContent = cat;

        btn.addEventListener('click', (ev) => {
          console.log(`[Category Tab] Klik na '${cat}'`);
          removeActiveClass();
          ev.target.classList.add('active');
          ev.target.setAttribute('aria-selected', 'true');
          displayNewsByCategory(cat);
        });

        tabsContainer.appendChild(btn);
      });
  }
});
