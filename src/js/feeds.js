/************************************************
 * feeds.js
 *
 * - Uklonjene eventualne reference na "Neueste" kategoriju.
 * - Dodati loader i error message (već implementirano u main.js).
 * - Dodatna funkcija za prikaz svih kategorija ("displayAllCategories"),
 *   uklonjena greška "container is not defined".
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
if (feed.source) {
  const normalizedSource = feed.source.trim().toLowerCase();
  if (hiddenSources.map(s => s.trim().toLowerCase()).includes(normalizedSource)) return true;
}

  return false;
}

/**
 * Fetch 50 najnovijih feed-ova ("/api/feeds"), keširano 10 minuta.
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  showLoader();

  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako nije forceRefresh i imamo keš kraći od 10 min, vrati iz localStorage
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

    // Inače fetchujemo sa servera
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    // Skladištimo u keš
    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data.slice(0, 50);

  } catch (error) {
    console.error(error);
    showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Fetch 50 najnovijih feedova za kategoriju, keširano 10 minuta.
 */
export async function fetchCategoryFeeds(category, forceRefresh = false) {
  showLoader();

  try {
    // "Sonstiges" => "Uncategorized" na serveru
    const catForUrl = (category === "Sonstiges") ? "Uncategorized" : category;
    const lastFetchKey = `feeds-${catForUrl}-lastFetch`;
    const cachedFeedsKey = `feeds-${catForUrl}`;
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako nije forceRefresh i imamo keš kraći od 10 min, vrati iz localStorage
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

    // Inače, fetchujemo za tu kategoriju
    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Neuspešno preuzimanje kategorije: " + category);

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    // Skladištimo u keš
    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data.slice(0, 50);

  } catch (error) {
    console.error(error);
    showErrorMessage(`Fehler: /api/feeds-by-category/${category} konnte nicht geladen werden.`);
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Kreira jednu "news card" za prikaz.
 */
function createNewsCard(feed) {
  const card = document.createElement('div');
  card.className = "news-card";
  
  // Corrected the variable reference from 'newsCard' to 'card'
  card.onclick = () => {
    // Remove 'active' class from all news cards
    document.querySelectorAll('.news-card').forEach(card => card.classList.remove('active'));
    
    // Add 'active' class to the clicked card
    card.classList.add('active');
    
    // Open the modal with the feed details
    openNewsModal(feed);
  };

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
 * Prikazuje listu feedova (vesti) unutar #news-container.
 */
export function displayFeedsList(feedsList, categoryName) {
  const container = document.getElementById('news-container');
  if (!container) return;

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
  initializeLazyLoading();

  // Posle renderovanja, vrati scrollTop na 0
  requestAnimationFrame(() => {
    container.scrollTop = 0;
  });
}

/**
 * Prikazuje "Aktuell" feedove (sve najnovije).
 */
export async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let allFeeds = await fetchAllFeedsFromServer();
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * Uzima nasumične elemente iz niza.
 */
function pickRandom(array, count) {
  if (array.length <= count) return array;
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Prikaz vesti po kategoriji, "Sonstiges" umesto "Ohne Kategorie".
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

  if (!validCategories.includes(category)) {
    displayAktuellFeeds();
    return;
  }

  let catFeeds = await fetchCategoryFeeds(category);
  displayFeedsList(catFeeds, category);
}

/**
 * Prikazuje sve definisane kategorije (po 4 feed-a) unutar #news-container.
 * Može se prilagoditi po želji (npr. za stranicu "Home" ili slično).
 */
export async function displayAllCategories() {
  const container = document.getElementById('news-container');
  if (!container) return;

  // Definišemo koje kategorije želimo
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

  // Za svaku kategoriju, prikazujemo h2 i 4 najnovije vesti
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

  // Posle renderovanja, vrati scrollTop na 0
  requestAnimationFrame(() => {
    container.scrollTop = 0;
  });
}
