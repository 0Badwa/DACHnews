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

// Kreiranje HTML kartice za pojedinačni feed
function createNewsCard(feed) {
  console.log("[createNewsCard] Kreiranje kartice za:", feed.title);
  const div = document.createElement('div');
  div.className = "news-card";
  div.innerHTML = `
    <h3 class="news-title">${feed.title}</h3>
    <p class="news-category">${feed.category || 'Uncategorized'}</p>
    <p class="news-date">
      ${
        feed.date_published
          ? new Date(feed.date_published).toLocaleDateString() + " " +
            new Date(feed.date_published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ""
      }
    </p>
    <img class="news-image" src="${feed.image || 'https://via.placeholder.com/150'}" alt="${feed.title}">
    <p class="news-content">${feed.content_text || ''}</p>
    <a class="news-link" href="${feed.url || '#'}" target="_blank">Pročitaj više</a>
  `;
  return div;
}

// Prikaz feedova – *sortiramo* po datumu (najnoviji prvo)
function displayAllFeeds() {
  console.log("[displayAllFeeds] Prikaz svih feedova (sortirano)...");
  const container = document.getElementById('news-container');
  if (!container) {
    console.error("[displayAllFeeds] #news-container ne postoji!");
    return;
  }
  container.innerHTML = '';

  // Sortiramo feedove po date_published (opadajuće)
  const sorted = [...feeds].sort((a, b) => {
    const dateA = new Date(a.date_published).getTime() || 0;
    const dateB = new Date(b.date_published).getTime() || 0;
    return dateB - dateA; // najnoviji prvi
  });

  if (sorted.length === 0) {
    container.innerHTML = "<p>Nema vesti.</p>";
    return;
  }

  sorted.forEach(feed => {
    container.appendChild(createNewsCard(feed));
  });
}

// Prikaz feedova *po kategoriji*
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

  // Sortiramo i ovde, ako želite i po kategoriji da su najnoviji prvi
  const sorted = data.sort((a, b) => {
    const da = new Date(a.date_published).getTime() || 0;
    const db = new Date(b.date_published).getTime() || 0;
    return db - da;
  });

  if (sorted.length === 0) {
    container.innerHTML = "<p>Nema vesti za ovu kategoriju.</p>";
    return;
  }

  sorted.forEach(feed => {
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
