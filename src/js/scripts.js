/************************************************
 * scripts.js
 ************************************************/

// Globalna promenljiva
let feeds = [];

// Liste kategorija - moraju odgovarati onima u GPT promptu
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

// Funkcija: Učitavanje svih feedova sa servera
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

// Keširanje u localStorage
function cacheAllFeedsLocally(items) {
  localStorage.setItem('feeds', JSON.stringify(items));
  console.log("[cacheAllFeedsLocally] Sačuvan niz feedova u localStorage:", items.length);
}

// Uklanjanje 'active' klase
function removeActiveClass() {
  const allTabs = document.querySelectorAll('.tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
}

// Kreiranje jedne kartice feeda
function createNewsCard(feed) {
  console.log("[createNewsCard] Kreiramo karticu za:", feed.title);
  const div = document.createElement('div');
  div.className = "news-card";
  div.innerHTML = `
    <h3 class="news-title">${feed.title}</h3>
    <p class="news-category">${feed.category || "Uncategorized"}</p>
    <p class="news-date">
      ${feed.date_published ? new Date(feed.date_published).toLocaleDateString() : ""}
      ${feed.date_published ? new Date(feed.date_published).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ""}
    </p>
    <img class="news-image" src="${feed.image || 'https://via.placeholder.com/150'}" alt="${feed.title}">
    <p class="news-content">${feed.content_text || ""}</p>
    <a class="news-link" href="${feed.url || '#'}" target="_blank">Pročitaj više</a>
  `;
  return div;
}

// Prikaz “Home” – svi feedovi
function displayAllFeeds() {
  console.log("[displayAllFeeds] Prikaz svih feedova...");
  const container = document.getElementById('news-container');
  if (!container) {
    console.error("[displayAllFeeds] #news-container ne postoji!");
    return;
  }
  container.innerHTML = '';

  if (!feeds || feeds.length === 0) {
    container.innerHTML = "<p>Nema vesti.</p>";
    return;
  }

  feeds.forEach(f => {
    const card = createNewsCard(f);
    container.appendChild(card);
  });
}

// Prikaz “Latest” – sortirano po datumu
function displayLatestFeeds() {
  console.log("[displayLatestFeeds] Prikaz feedova po datumu (najnoviji prvi)...");
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  const sorted = [...feeds].sort((a, b) => {
    const aTime = new Date(a.date_published).getTime() || 0;
    const bTime = new Date(b.date_published).getTime() || 0;
    return bTime - aTime;
  });

  if (sorted.length === 0) {
    container.innerHTML = "<p>Nema vesti.</p>";
    return;
  }

  sorted.forEach(f => {
    container.appendChild(createNewsCard(f));
  });
}

// Prikaz feedova po kategoriji
async function displayNewsByCategory(category) {
  console.log("[displayNewsByCategory] Kategorija:", category);
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  // Pogledamo lokalni keš za tu kategoriju
  const cached = localStorage.getItem(`feeds-${category}`);
  let data = [];

  if (cached) {
    console.log(`[displayNewsByCategory] Imamo keš za '${category}', koristimo ga...`);
    data = JSON.parse(cached);
  } else {
    console.log(`[displayNewsByCategory] Nema keša za '${category}', dohvatamo /api/feeds-by-category/${category}...`);
    try {
      const resp = await fetch(`/api/feeds-by-category/${encodeURIComponent(category)}`);
      if (!resp.ok) throw new Error("Greška /feeds-by-category");
      data = await resp.json();
      console.log(`[displayNewsByCategory] Sa servera stiglo:`, data.length);
      // Snimimo u localStorage
      localStorage.setItem(`feeds-${category}`, JSON.stringify(data));
      console.log(`[displayNewsByCategory] Sačuvano u localStorage: feeds-${category}`);
    } catch (err) {
      console.error("[displayNewsByCategory] Greška fetch:", err);
      container.innerHTML = `<p>Greška pri učitavanju kategorije ${category}.</p>`;
      return;
    }
  }

  if (data.length === 0) {
    container.innerHTML = "<p>Nema vesti u ovoj kategoriji.</p>";
    return;
  }

  data.forEach(item => {
    container.appendChild(createNewsCard(item));
  });
}

// "main" funk. se poziva na start stranice
async function main() {
  console.log("[main] Provera localStorage('feeds')...");
  const cachedFeeds = localStorage.getItem("feeds");

  if (cachedFeeds) {
    feeds = JSON.parse(cachedFeeds);
    console.log(`[main] Učitano iz keša: ${feeds.length} feedova`);
    displayAllFeeds();
  } else {
    console.log("[main] Nema keša, dohvatamo /api/feeds...");
    const all = await fetchAllFeedsFromServer();
    feeds = all;
    cacheAllFeedsLocally(all);
    displayAllFeeds();
  }

  // (Opcionalno) Periodično da vidimo ima li novih feedova
  setInterval(async () => {
    console.log("[main - setInterval] Provera novih feedova na /api/feeds...");
    const fresh = await fetchAllFeedsFromServer();
    if (fresh.length > feeds.length) {
      console.log("[main - setInterval] Ima novih feedova, ažuriramo localStorage i prikaz...");
      feeds = fresh; // zamenimo staru listu
      cacheAllFeedsLocally(fresh);
      // Ostajemo na "Home"? Možete se prilagoditi da re-renderuje i tablo ili sl.
      displayAllFeeds();
    } else {
      console.log("[main - setInterval] Nema novih feedova.");
    }
  }, 180000); // npr. svake 3 min
}

// Kad se main završi, dodaćemo event listenere za tabove
main().then(() => {
  console.log("[main.then] Inicijalizacija tabova...");

  // Home i Latest
  const homeTab = document.querySelector('[data-tab="home"]');
  const latestTab = document.querySelector('[data-tab="latest"]');
  const tabsContainer = document.getElementById('tabs-container');

  if (homeTab) {
    homeTab.addEventListener('click', (e) => {
      console.log("[Home Tab] Klik...");
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      displayAllFeeds();
    });
  }

  if (latestTab) {
    latestTab.addEventListener('click', (e) => {
      console.log("[Latest Tab] Klik...");
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      displayLatestFeeds();
    });
  }

  // Dinamički generišemo tabove za preostale kategorije, ako želite
  if (tabsContainer) {
    console.log("[main.then] Generisanje kategorija-dugmića...");
    const skipList = []; // Ako ne želite 'Uncategorized', ubacite ga ovde
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
          console.log(`[Category Tab] Kliknuto na '${cat}'`);
          removeActiveClass();
          ev.target.classList.add('active');
          ev.target.setAttribute('aria-selected', 'true');
          displayNewsByCategory(cat);
        });

        tabsContainer.appendChild(btn);
      });
  }
});
