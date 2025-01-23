/**
 * feeds.js
 * 
 * - getAllFeedsFromServer -> sada vraća "4 vesti po kategoriji" (backend logika).
 * - displayNeuesteFeeds -> samo prikazuje /api/feeds rezultat, 
 *   bez stare random + sum logike. Uklonjeno "top4Neueste" itd.
 * - Ako feed nema sliku (feed.image), preskačemo prikaz (ne kreiramo news card).
 */

import { initializeLazyLoading, updateCategoryIndicator, showLoader, hideLoader, showErrorMessage } from './ui.js';
import { openNewsModal } from './newsModal.js';

/**
 * Pomoćna funkcija: "vor X Minuten/Stunden/..." 
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
 * Da li je feed sakriven - provera localStorage (izvor/kategorija)
 */
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
function isHiddenFeed(feed) {
  const hiddenSources = getHiddenSources();
  const hiddenCats = getHiddenCategories();

  // "Ohne Kategorie" -> "Sonstiges"
  const cat = (feed.category === "Ohne Kategorie") ? "Sonstiges" : feed.category;

  if (hiddenCats.includes(cat)) return true;
  if (feed.source && hiddenSources.includes(feed.source.toLowerCase())) return true;
  return false;
}

/**
 * getAllFeedsFromServer - zovemo /api/feeds, koji sada vraća max 4 vesti po kategoriji
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  showLoader();
  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Keš 10 min
    if (!forceRefresh && lastFetchTime && (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000) {
      const cachedFeeds = localStorage.getItem(cachedFeedsKey);
      if (cachedFeeds) {
        let data = JSON.parse(cachedFeeds);
        data = data.filter(feed => !isHiddenFeed(feed) && feed.image); // Bez slika ih preskačemo
        // Sortiramo najnovije prvo
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        return data;
      }
    }

    // Inače dohvat sa servera
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
    let data = await response.json();

    // Filtriramo sakrivene i one bez slike
    data = data.filter(feed => !isHiddenFeed(feed) && feed.image);

    // Sortiramo najnovije prvo
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

    // Čuvamo u keš
    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data;
  } catch (error) {
    console.error(error);
    showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * fetchCategoryFeeds -> ako želite i kategorijski. 
 * (Filtrira sakrivene i vesti bez slike.)
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
        data = data.filter(feed => !isHiddenFeed(feed) && feed.image);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        return data;
      }
    }

    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Neuspešno preuzimanje kategorije: " + category);

    let data = await response.json();
    data = data.filter(feed => !isHiddenFeed(feed) && feed.image);
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

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
 * createNewsCard - napravi .news-card (ali samo ako feed ima image).
 */
function createNewsCard(feed) {
  // Ako feed nema sliku, ne kreiramo karticu
  if (!feed.image) {
    return null;
  }

  const card = document.createElement('div');
  card.className = "news-card";
  card.addEventListener('click', () => {
    openNewsModal(feed);
  });

  const img = document.createElement('img');
  img.className = "news-card-image lazy";
  img.dataset.src = feed.image;
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
 * displayFeedsList -> prikaz vesti
 */
export function displayFeedsList(feedsList, categoryName) {
  const container = document.getElementById('news-container');
  if (!container) return;

  container.innerHTML = '';
  if (!feedsList || feedsList.length === 0) {
    container.innerHTML = `<p>Keine Nachrichten für: ${categoryName}</p>`;
    updateCategoryIndicator(categoryName);
    return;
  }

  // Sortiramo najnovije
  feedsList.sort((a, b) => {
    return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
  });

  // Kreiramo kartice
  feedsList.forEach(feed => {
    const card = createNewsCard(feed);
    if (card) {
      container.appendChild(card);
    }
  });

  updateCategoryIndicator(categoryName);
  initializeLazyLoading();
}

/**
 * displayAktuellFeeds -> prikaz svega
 */
export async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let allFeeds = await fetchAllFeedsFromServer();
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * displayNeuesteFeeds -> 
 * SADA: Uzima /api/feeds (4 vesti po kategoriji), filtrira + prikazuje.
 * Sve ostalo (random top4 + X) je uklonjeno.
 */
export async function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '';

  // Dohvatimo sve (vec max 4 / cat) + ignorisemo one bez slike
  let data = await fetchAllFeedsFromServer();

  // Ovde je data već filtriran (bez slika je izbačen).
  // Samo iscrtavamo
  displayFeedsList(data, "Neueste Nachrichten");
}

/**
 * displayNewsByCategory -> prikaz pojedinacne kategorije
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
