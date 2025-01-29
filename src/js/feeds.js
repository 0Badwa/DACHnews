/************************************************
 * feeds.js
 *
 * - Uklonjene eventualne reference na "Neueste" kategoriju.
 * - Dodati loader i error message (već implementirano u main.js).
 * - Dodatna funkcija za prikaz svih kategorija ("displayAllCategories"),
 *   uklonjena greška "container is not defined".
 * - Ispravljeno ažuriranje kategorije i resetovanje skrola.
 * - Dodano osvežavanje aplikacije kada postane aktivna.
 ************************************************/

import {
  initializeLazyLoading,
  updateCategoryIndicator,
  showLoader,
  hideLoader,
  showErrorMessage
} from './ui.js';

import { openNewsModal } from './newsModal.js';

/**
 * Formatira datum u stil "vor X Minuten/Stunden/Tagen..." (nemački).
 */
function timeAgo(dateString) {
  if (!dateString) return '';
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

/**
 * Dohvata niz skrivenih izvora iz localStorage.
 */
function getHiddenSources() {
  try {
    return JSON.parse(localStorage.getItem('hiddenSources') || '[]');
  } catch {
    return [];
  }
}

/**
 * Dohvata niz skrivenih kategorija iz localStorage.
 */
function getHiddenCategories() {
  try {
    return JSON.parse(localStorage.getItem('hiddenCategories') || '[]');
  } catch {
    return [];
  }
}

/**
 * Proverava da li treba sakriti dati feed na osnovu izvora ili kategorije.
 */
function isHiddenFeed(feed) {
  const hiddenSources = getHiddenSources();
  const hiddenCats = getHiddenCategories();

  // "Ohne Kategorie" tretiramo kao "Sonstiges"
  const cat = (feed.category === "Ohne Kategorie") ? "Sonstiges" : feed.category;

  if (hiddenCats.includes(cat)) return true;
  if (feed.source && hiddenSources.includes(feed.source.toLowerCase())) return true;

  return false;
}

/**
 * Funkcija za preuzimanje do 50 najnovijih feed-ova iz "Aktuell" kategorije,
 * umesto "/api/feeds" poziva "/api/feeds-by-category/Aktuell".
 * Ako ruta ne postoji ili vraća grešku, ispisuje poruku i vraća prazan niz.
 * Dodat je forceRefresh parametar za forsiranje osvežavanja keša.
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  showLoader();
  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';

    // Ako je forceRefresh, obriši keš
    if (forceRefresh) {
      localStorage.removeItem(lastFetchKey);
      localStorage.removeItem(cachedFeedsKey);
    }

    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako nije forceRefresh i cache je mlađi od 10 min, vrati keš.
    if (
      !forceRefresh &&
      lastFetchTime &&
      (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000
    ) {
      const cachedFeeds = localStorage.getItem(cachedFeedsKey);
      if (cachedFeeds) {
        let data = JSON.parse(cachedFeeds);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        data = data.filter(feed => !isHiddenFeed(feed));
        return data.slice(0, 50);
      }
    }

    // U suprotnom, fetchujemo sa servera "Aktuell" kategoriju
    const response = await fetch("/api/feeds");
    if (!response.ok) {
      console.error("[fetchAllFeedsFromServer] Server returned status:", response.status);
      showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
      return [];
    }

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    // Skladištimo u localStorage keš
    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data.slice(0, 50);

  } catch (error) {
    console.error("[fetchAllFeedsFromServer] Greška:", error);
    showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Preuzima do 50 feedova iz odabrane kategorije ("/api/feeds-by-category/..."), keširano 10 min.
 */
export async function fetchCategoryFeeds(category, forceRefresh = false) {
  showLoader();
  try {
    // "Sonstiges" => "Uncategorized" na serveru
    const catForUrl = (category === "Sonstiges") ? "Uncategorized" : category;
    const lastFetchKey = `feeds-${catForUrl}-lastFetch`;
    const cachedFeedsKey = `feeds-${catForUrl}`;
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako nije forceRefresh i cache je mlađi od 10 min, vrati keš.
    if (
      !forceRefresh &&
      lastFetchTime &&
      (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000
    ) {
      const cached = localStorage.getItem(cachedFeedsKey);
      if (cached) {
        let data = JSON.parse(cached);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        data = data.filter(feed => !isHiddenFeed(feed));
        return data.slice(0, 50);
      }
    }

    // Ako nema keša ili je star, fetchujemo...
    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[fetchCategoryFeeds] Server returned status ${response.status} za kategoriju: ${catForUrl}`);
      showErrorMessage(`Fehler: /api/feeds-by-category/${category} konnte nicht geladen werden.`);
      return [];
    }

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    // Čuvamo u keš
    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data.slice(0, 50);

  } catch (error) {
    console.error("[fetchCategoryFeeds] Greška:", error);
    showErrorMessage(`Fehler: /api/feeds-by-category/${category} konnte nicht geladen werden.`);
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Kreira jednu "news card" za prikaz feed-a.
 */
function createNewsCard(feed) {
  const card = document.createElement('div');
  card.className = "news-card";
  card.addEventListener('click', () => {
    openNewsModal(feed);
  });

  const img = document.createElement('img');
  img.className = "news-card-image lazy";
  img.dataset.src = feed.image || 'https://via.placeholder.com/80';
  img.alt = feed.title || 'No title';

  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  const title = document.createElement('h3');
  title.className = "news-title truncated-title";
  title.textContent = feed.title || 'No title';

  const meta = document.createElement('p');
  meta.className = "news-meta";

  const sourceSpan = document.createElement('span');
  sourceSpan.className = "source";
  sourceSpan.textContent = feed.source ? feed.source : 'Unbekannte Quelle';

  const timeSpan = document.createElement('span');
  timeSpan.className = "time";
  const timeString = feed.date_published ? timeAgo(feed.date_published) : '';
  timeSpan.textContent = ` • ${timeString}`;

  meta.appendChild(sourceSpan);
  meta.appendChild(timeSpan);

  contentDiv.appendChild(title);
  contentDiv.appendChild(meta);

  card.appendChild(img);
  card.appendChild(contentDiv);

  return card;
}

/**
 * Prikazuje listu feedova (vesti) u #news-container.
 */
export function displayFeedsList(feedsList, categoryName) {
  const container = document.getElementById('news-container');
  if (!container) return;

// Postavi scrollTop na 0 pre učitavanja sadržaja
container.scrollTop = 0;

  container.innerHTML = '';

  if (!feedsList || feedsList.length === 0) {
    container.innerHTML = `<p>Es gibt keine Nachrichten für die Kategorie: ${categoryName}</p>`;
    updateCategoryIndicator(categoryName);
    return;
  }

  feedsList.sort((a, b) => {
    return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
  });

  feedsList.forEach(feed => {
    const card = createNewsCard(feed);
    container.appendChild(card);
  });

  updateCategoryIndicator(categoryName);
  
  ;
}

/**
 * Prikazuje "Aktuell" feedove (sve najnovije) tako što poziva fetchAllFeedsFromServer().
 */
export async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let allFeeds = await fetchAllFeedsFromServer();
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * Pomoćna funkcija za uzimanje nasumičnih elemenata iz niza.
 */
function pickRandom(array, count) {
  if (array.length <= count) return array;
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Prikaz vesti po kategoriji.
 * "Sonstiges" => "Uncategorized" za fetch na serveru, a nazad prikažemo kao "Sonstiges".
 */
export async function displayNewsByCategory(category) {
  const container = document.getElementById('news-container');
  if (!container) return;

  const validCategories = [
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
    "Sonstiges"
  ];

  // Ako je nepoznata kategorija, prebacujemo se na "Aktuell"
  if (!validCategories.includes(category)) {
    displayAktuellFeeds();
    return;
  }

  let catFeeds = await fetchCategoryFeeds(category);
  displayFeedsList(catFeeds, category);
}

/**
 * Prikazuje sve definisane kategorije (po 4 feed-a svaka) unutar #news-container.
 */
export async function displayAllCategories() {
  const container = document.getElementById('news-container');
  if (!container) return;

  // Kategorije koje želimo da prikažemo
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
    "Sonstiges"
  ];

  // Fetchujemo svaku kategoriju paralelno
  const fetchPromises = categories.map(async (cat) => {
    let catFeeds = await fetchCategoryFeeds(cat);
    return { cat, feeds: catFeeds };
  });

  // Čekamo da se svi fetch-ovi završe
  const results = await Promise.all(fetchPromises);

  // Za svaku kategoriju prikazujemo h2 i najnovija 4 feeda
  results.forEach(({ cat, feeds }) => {
    if (!feeds || feeds.length === 0) return;

    feeds.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    const top4 = feeds.slice(0, 4);

    // Naslov kategorije
    const heading = document.createElement('h2');
    heading.textContent = cat;
    heading.style.backgroundColor = "#000";
    heading.style.color = "var(--primary-color)";
    heading.style.padding = "4px";
    heading.style.marginTop = "0.4rem";
    heading.style.marginBottom = "4px";
    heading.style.fontSize = "1.1rem";
    heading.style.textAlign = "center";
    container.appendChild(heading);

    // Kartice feedova
    top4.forEach(feed => {
      const card = createNewsCard(feed);
      container.appendChild(card);
    });
  });

  // Posle renderisanja, skrol na vrh
  requestAnimationFrame(() => {
    container.scrollTop = 0;
  });
}

/**
 * Dodaje event listener za osvežavanje aplikacije kada postane aktivna.
 */
export function initAppRefreshOnVisibilityChange() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const activeTab = document.querySelector('.tab.active');
      const category = activeTab ? activeTab.getAttribute('data-tab') : 'Aktuell';
      
      // Force refresh with cache bypass
      if (category === 'Aktuell') {
        displayAktuellFeeds(true); // true za force refresh
      } else {
        displayNewsByCategory(category, true);
      }
      
      updateCategoryIndicator(category);
    }
  });
}

/**
 * Inicijalizuje sve potrebne funkcije prilikom učitavanja skripte.
 */
export function initFeeds() {
  // Dodajemo event listener za sve tabove
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      if (tab.classList.contains('active')) return; // Ako je već aktivan, ništa ne radi
      // Ukloni active klasu sa svih tabova
      removeActiveClass();
      // Dodaj active klasu na kliknuti tab
      tab.classList.add('active');
      // Dobavi kategoriju iz data atributa
      const category = tab.getAttribute('data-tab');
      // Prikaži vesti za tu kategoriju
      await displayNewsByCategory(category);
    });
  });

  // Inicijalizujemo osvežavanje aplikacije kada postane aktivna
  initAppRefreshOnVisibilityChange();

  // Prikazujemo početnu kategoriju (npr. Aktuell)
  displayAktuellFeeds();
}

/**
 * Uklanja "active" klasu sa svih tabova.
 */
function removeActiveClass() {
  const allTabs = document.querySelectorAll('.tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
    tab.classList.remove('active-green');
  });
}

// Inicijalizujemo feeds.js kada je DOM spreman
document.addEventListener('DOMContentLoaded', () => {
  initFeeds();
});
