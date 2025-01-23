/**
 * feeds.js
 * 
 * - displayNewsByCategory je sada strogo asinkrona, 
 *   i tek nakon što se vesti učitaju i prikažu, 
 *   poziva se scrollIntoView (sa malim delay).
 * - Ostale funkcije ostaju kako su bile.
 */

import { initializeLazyLoading, updateCategoryIndicator, showLoader, hideLoader, showErrorMessage } from './ui.js';
import { openNewsModal } from './newsModal.js';

/**
 * Pomoćna funkcija za format vremena
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
 * Dohvata listu sakrivenih izvora/kategorija
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

/**
 * Proverava da li je feed sakriven (po izvoru ili kategoriji)
 */
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
 * fetchAllFeedsFromServer
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  showLoader();
  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako nije forceRefresh i unutar 10 min, uzmi keš
    if (!forceRefresh && lastFetchTime && (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000) {
      const cachedFeeds = localStorage.getItem(cachedFeedsKey);
      if (cachedFeeds) {
        let data = JSON.parse(cachedFeeds);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        data = data.filter(feed => !isHiddenFeed(feed));
        return data;
      }
    }

    // U suprotnom, dohvatimo sve vesti
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");

    let data = await response.json();
    // sortiramo najnovije
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    // filtriramo sakrivene
    data = data.filter(feed => !isHiddenFeed(feed));

    // Keširamo
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
 * fetchCategoryFeeds
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
    if (!response.ok) throw new Error(`Neuspešno preuzimanje kategorije: ${category}`);

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
 * createNewsCard
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
  sourceSpan.textContent = feed.source || 'Unbekannte Quelle';

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
 * displayFeedsList
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

  feedsList.sort((a, b) => {
    return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
  });

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
 * displayAktuellFeeds
 */
export async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let data = await fetchAllFeedsFromServer();
  displayFeedsList(data, "Aktuell");
}

/**
 * displayNeuesteFeeds
 */
export async function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '';

  let data = await fetchAllFeedsFromServer();
  displayFeedsList(data, "Neueste Nachrichten");
}

/**
 * KLJUČNA FUNKCIJA -> displayNewsByCategory (asinhrona)
 *  - Čeka fetch, pa prikazuje
 *  - Tek nakon toga scrollIntoView
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
    await displayAktuellFeeds();
    return;
  }

  // 1) Dohvatimo vesti
  const catFeeds = await fetchCategoryFeeds(category);

  // 2) Prikaz
  displayFeedsList(catFeeds, category);

  // 3) Sada je DOM ažuriran, tab je (najverovatnije) postavljen u .active iz main.js
  //   Ako želimo da tab scrolIntoView -> malo sačekamo
  setTimeout(() => {
    const activeTab = document.querySelector(`.tab[data-tab="${category}"]`);
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 100);
}
