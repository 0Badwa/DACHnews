/**
 * feeds.js
 *
 * Ovde smo uklonili sva ograničenja (slice) da bi se prikazale SVE vesti i samim tim SVI izvori.
 * Sortiranje po datumu (od najnovijih ka starijima) ostaje, ali više ne "sečemo" na 50 rezultata.
 */

import { initializeLazyLoading, updateCategoryIndicator, showLoader, hideLoader, showErrorMessage } from './ui.js';
import { openNewsModal } from './newsModal.js';

/**
 * timeAgo format "vor X Minuten" itd.
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

function getHiddenSources() {
  try {
    return JSON.parse(localStorage.getItem('hiddenSources') || '[]');
  } catch {
    return [];
  }
}

function getHiddenCategories() {
  try {
    return JSON.parse(localStorage.getItem('hiddenCategories') || '[]');
  } catch {
    return [];
  }
}

/**
 * Provera da li je feed sakriven zbog izvora/kategorije.
 * "Ohne Kategorie" tretiramo kao "Sonstiges".
 */
function isHiddenFeed(feed) {
  const hiddenSources = getHiddenSources();
  const hiddenCats = getHiddenCategories();
  const cat = (feed.category === "Ohne Kategorie") ? "Sonstiges" : feed.category;

  if (hiddenCats.includes(cat)) return true;
  if (feed.source && hiddenSources.includes(feed.source.toLowerCase())) return true;
  return false;
}

/**
 * fetchAllFeedsFromServer - uklonili smo slice(0,50).
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  showLoader();
  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Keš 10 minuta
    if (!forceRefresh && lastFetchTime && (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000) {
      const cachedFeeds = localStorage.getItem(cachedFeedsKey);
      if (cachedFeeds) {
        let data = JSON.parse(cachedFeeds);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        data = data.filter(feed => !isHiddenFeed(feed));
        return data; // više ne sečemo
      }
    }

    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data; // vraćamo sve, bez slice
  } catch (error) {
    console.error(error);
    showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * fetchCategoryFeeds - više ne sečemo na 50.
 */
export async function fetchCategoryFeeds(category, forceRefresh = false) {
  showLoader();
  try {
    const catForUrl = (category === "Sonstiges") ? "Uncategorized" : category;
    const lastFetchKey = `feeds-${catForUrl}-lastFetch`;
    const cachedFeedsKey = `feeds-${catForUrl}`;
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    if (!forceRefresh && lastFetchTime && (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000) {
      const cached = localStorage.getItem(cachedFeedsKey);
      if (cached) {
        let data = JSON.parse(cached);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        data = data.filter(feed => !isHiddenFeed(feed));
        return data;
      }
    }

    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Neuspešno preuzimanje kategorije: " + category);

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data;
  } catch (error) {
    console.error(error);
    showErrorMessage(`Fehler: /api/feeds-by-category/${category} konnte nicht geladen werden.`);
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Kreira jednu "news card".
 * font-size se dobija iz var(--card-font-size) (vidi main.js).
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
 * Prikazuje listu vesti.
 */
export function displayFeedsList(feedsList, categoryName) {
  const container = document.getElementById('news-container');
  if (!container) return;

  container.innerHTML = '';
  if (!feedsList || feedsList.length === 0) {
    container.innerHTML = `<p>Nema vesti za kategoriju: ${categoryName}</p>`;
    updateCategoryIndicator(categoryName);
    return;
  }

  // Sortiramo najnovije na vrh
  feedsList.sort((a, b) => {
    return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
  });

  feedsList.forEach(feed => {
    const card = createNewsCard(feed);
    container.appendChild(card);
  });

  updateCategoryIndicator(categoryName);
  initializeLazyLoading();
}

/**
 * "Aktuell" -> sve vesti.
 */
export async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let allFeeds = await fetchAllFeedsFromServer();
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * pickRandom
 */
function pickRandom(array, count) {
  if (array.length <= count) return array;
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * "Neueste" -> 4 nasumične iz poslednjih X sati, + 4 iz svake kategorije
 */
export async function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '';

  let allFeeds = await fetchAllFeedsFromServer();
  const now = Date.now();

  let filtered = allFeeds.filter(feed => {
    if (!feed.date_published) return false;
    return (now - new Date(feed.date_published).getTime()) <= (2 * 60 * 60 * 1000);
  });
  if (filtered.length < 4) {
    filtered = allFeeds.filter(feed => {
      if (!feed.date_published) return false;
      return (now - new Date(feed.date_published).getTime()) <= (4 * 60 * 60 * 1000);
    });
  }
  if (filtered.length < 4) {
    filtered = allFeeds.filter(feed => {
      if (!feed.date_published) return false;
      return (now - new Date(feed.date_published).getTime()) <= (24 * 60 * 60 * 1000);
    });
  }

  const top4Neueste = pickRandom(filtered, 4);
  top4Neueste.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

  top4Neueste.forEach(feed => {
    const card = createNewsCard(feed);
    container.appendChild(card);
  });

  // Ostale kategorije
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

  const fetchPromises = categories.map(async (cat) => {
    let catFeeds = await fetchCategoryFeeds(cat);
    return { cat, feeds: catFeeds };
  });

  const results = await Promise.all(fetchPromises);

  results.forEach(({ cat, feeds }) => {
    if (!feeds || feeds.length === 0) return;

    feeds.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    const top4 = feeds.slice(0, 4);

    const heading = document.createElement('h2');
    heading.textContent = cat;
    heading.style.backgroundColor = "#000";
    heading.style.color = "#fff"; // ili var(--text-color)
    heading.style.padding = "4px";
    heading.style.marginTop = "0.4rem";
    heading.style.marginBottom = "4px";
    heading.style.fontSize = "1.1rem";
    heading.style.textAlign = "center";
    container.appendChild(heading);

    top4.forEach(feed => {
      const card = createNewsCard(feed);
      container.appendChild(card);
    });
  });

  updateCategoryIndicator("Neueste Nachrichten");
  initializeLazyLoading();
}

/**
 * displayNewsByCategory
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
