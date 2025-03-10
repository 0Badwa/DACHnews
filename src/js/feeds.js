/************************************************
 * feeds.js
 ************************************************/

import {
  initializeLazyLoading,
  updateCategoryIndicator,
  showLoader,
  hideLoader,
  showErrorMessage
} from './ui.js';

import { openNewsModal } from './newsModal.js';

// Uvoz brandMap i sourceAliases iz sourcesConfig.js
import { brandMap, sourceAliases, sourceDisplayNames } from './sourcesConfig.js';

// Dodajte globalne promenljive za keširanje blokiranih izvora i kategorija
let blockedSourcesCache = [];
let blockedCategoriesCache = [];

/**
 * Funkcija koja ažurira keš iz localStorage.
 */
function updateBlockedCache() {
  try {
    blockedSourcesCache = JSON.parse(localStorage.getItem('blockedSources') || '[]');
    blockedCategoriesCache = JSON.parse(localStorage.getItem('blockedCategories') || '[]');
  } catch (e) {
    blockedSourcesCache = [];
    blockedCategoriesCache = [];
  }
}

/**
 * Helper funkcija koja uklanja TLD-ove .CH, .DE, .AT iz prosleđenog stringa.
 */
function removeTLD(source) {
  return source.replace(/\.(ch|de|at)$/i, '');
}

/**
 * Parsira domain ili ime izvora da bismo lakše pronašli zastavu.
 */
function parseDomain(source) {
  if (!source) return '';
  let s = source.trim().toLowerCase();

  s = s.replace(/^https?:\/\//, '');
  s = s.replace(/^www\./, '');
  s = s.split('/')[0];
  s = s.replace(/\s+/g, '');

  return s;
}

/**
 * Vraća URL zastave zasnovan na brendovima ili TLD-u (".de", ".at", ".ch").
 */
function getCountryFlag(source) {
  let normalizedSource = parseDomain(source).toLowerCase();

  for (let mainSource in sourceAliases) {
    if (sourceAliases[mainSource].includes(normalizedSource)) {
      normalizedSource = mainSource;
      break;
    }
  }

  if (brandMap[normalizedSource]) {
    return `src/icons/flags/${brandMap[normalizedSource]}.svg`;
  }

  if (normalizedSource.endsWith('.de')) {
    return 'src/icons/flags/de.svg';
  } else if (normalizedSource.endsWith('.at')) {
    return 'src/icons/flags/at.svg';
  } else if (normalizedSource.endsWith('.ch')) {
    return 'src/icons/flags/ch.svg';
  }

  return 'src/icons/flags/un.svg';
}

/**
 * Vraća string tipa "vor X Minuten/Stunden/Tagen...", na nemačkom.
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

  return 'gerade eben';
}

/**
 * Čita niz blokiranih izvora iz localStorage.
 */
function getBlockedSources() {
  try {
    return JSON.parse(localStorage.getItem('blockedSources') || '[]');
  } catch {
    return [];
  }
}

/**
 * Čita niz blokiranih kategorija iz localStorage.
 */
function getBlockedCategories() {
  try {
    return JSON.parse(localStorage.getItem('blockedCategories') || '[]');
  } catch {
    return [];
  }
}

/**
 * Proverava da li je feed sakriven (blokiran).
 */
function isHiddenFeed(feed) {
  if (!feed.image) {
    // console.log(`[isHiddenFeed] Feed sakriven: Nema slike, ID: ${feed.id}`);
    // Ako hoćemo da filtriramo sve bez slike - ostaje vaš izbor
    // return true;
  }

  if (feed.date_published) {
    const publishedDate = new Date(feed.date_published);
    const now = new Date();
    if (publishedDate > now) {
      console.log(`[isHiddenFeed] Feed sakriven: Datum u budućnosti, ID: ${feed.id}`);
      return true;
    }
  }

  const blockedSources = blockedSourcesCache;
  const blockedCats = blockedCategoriesCache;

  const cat = (feed.category === "Ohne Kategorie") ? "Sonstiges" : feed.category;
  if (blockedCats.includes(cat)) {
    console.log(`[isHiddenFeed] Feed sakriven zbog blokirane kategorije: ${cat}, ID: ${feed.id}`);
    return true;
  }

  if (feed.source) {
    const normalizedSource = normalizeSourceForDisplay(feed.source);
    if (!normalizedSource) {
      console.log(`[isHiddenFeed] Feed sakriven: Nepoznat izvor, Raw: ${feed.source}, ID: ${feed.id}`);
      return true;
    }
    const blockedSourceCheck = removeTLD(normalizedSource.toUpperCase().replace(/\s+/g, ''));
    if (blockedSources.includes(blockedSourceCheck)) {
      console.log(`[isHiddenFeed] Feed sakriven zbog blokiranog izvora: ${blockedSourceCheck}, ID: ${feed.id}`);
      return true;
    }
  }

  return false;
}

/**
 * Proverava da li postoji keširan feed u localStorage i vraća ga ako je validan.
 * Ako postoje novi feedovi, dodaje ih u postojeći keš.
 */
function getCachedFeeds(lastFetchKey, cachedFeedsKey, newFeeds = []) {
  const now = Date.now();
  const cachedRaw = localStorage.getItem(cachedFeedsKey);
  let cachedData = cachedRaw ? JSON.parse(cachedRaw) : null;
  
  if (cachedData && cachedData.expiry && cachedData.expiry < now) {
    localStorage.removeItem(cachedFeedsKey);
    cachedData = null;
  }
  
  if (cachedData && Array.isArray(cachedData.data)) {
    let existingFeeds = cachedData.data;
    const existingFeedIds = new Set(existingFeeds.map(feed => feed.id));
    const filteredNewFeeds = newFeeds.filter(feed => !existingFeedIds.has(feed.id));

    if (filteredNewFeeds.length > 0) {
      existingFeeds = [...filteredNewFeeds, ...existingFeeds];
      existingFeeds = existingFeeds.slice(0, 100);
      localStorage.setItem(cachedFeedsKey, JSON.stringify({
        data: existingFeeds,
        expiry: now + 600000
      }));
      localStorage.setItem(lastFetchKey, new Date().toISOString());
      console.log(`[CACHE] Dodato ${filteredNewFeeds.length} novih feedova u keš.`);
    } else {
      console.log("[CACHE] Nema novih feedova, koristimo postojeći keš.");
    }
    return existingFeeds;
  }
  
  if (newFeeds.length > 0) {
    localStorage.setItem(cachedFeedsKey, JSON.stringify({
      data: newFeeds,
      expiry: now + 600000
    }));
    localStorage.setItem(lastFetchKey, new Date().toISOString());
    console.log(`[CACHE] Keširan prvi set feedova (${newFeeds.length} feedova).`);
    return newFeeds;
  }
  
  return null;
}

/**
 * Fetch do 50 najnovijih feed-ova iz "Aktuell" (ruta /api/feeds), keš ~10 min.
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  showLoader();
  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';

    if (forceRefresh) {
      localStorage.removeItem(lastFetchKey);
      localStorage.removeItem(cachedFeedsKey);
    }

    let cachedData = getCachedFeeds(lastFetchKey, cachedFeedsKey, []);
    if (cachedData) return cachedData;

    const response = await fetch("/api/feeds");
    if (!response.ok) {
      console.error("[fetchAllFeedsFromServer] Server returned status:", response.status);
      showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
      return [];
    }

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data.slice(0, 100);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn("[fetchAllFeedsFromServer] Fetch aborted.");
      return [];
    }
    console.error("[fetchAllFeedsFromServer] Greška:", error);
    showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Fetch do 100 feedova iz određene kategorije (keš ~10 min).
 */
export async function fetchCategoryFeeds(category, forceRefresh = false) {
  showLoader();
  try {
    const catForUrl = (category === "Sonstiges") ? "Uncategorized" : category;
    const lastFetchKey = `feeds-${catForUrl}-lastFetch`;
    const cachedFeedsKey = `feeds-${catForUrl}`;

    if (forceRefresh) {
      localStorage.removeItem(lastFetchKey);
      localStorage.removeItem(cachedFeedsKey);
    }
    let cachedData = getCachedFeeds(lastFetchKey, cachedFeedsKey, []);
    if (cachedData) return cachedData;

    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data.slice(0, 100);

  } catch (error) {
    console.error("[fetchCategoryFeeds] Greška:", error);
    showErrorMessage(`Fehler: /api/feeds-by-category/${category} konnte nicht geladen werden.`);
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Normalizuje izvor za prikaz.
 */
function normalizeSourceForDisplay(source) {
  if (!source) return null;
  let normalized = source.trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '').replace(/^www\./, '');
  normalized = removeTLD(normalized.split('/')[0]);

  // Ručna mapiranja
  if (normalized === 'sn') return 'SALZBURGER-NACHRICHTEN';
  if (normalized === 'fr') return 'FRANKFURTER-RUNDSCHAU';
  if (normalized === 'spiegel') return 'DER-SPIEGEL';
  if (normalized === 'freitag') return 'DER-FREITAG';
  if (normalized === 'tagesschau' || normalized === 'ardmediathek' || normalized === 'watson') return 'ZDF';
  if (normalized === 'tagblatt') return 'ST-GALLER-TAGBLATT';
  if (normalized === 'thurgauerzeitung') return 'ST-GALLER-TAGBLATT';

  for (let mainSource in sourceAliases) {
    if (sourceAliases[mainSource].includes(normalized)) {
      return mainSource.toUpperCase();
    }
  }

  if (brandMap[normalized]) {
    return normalized.toUpperCase();
  }

  const upperSource = source.toUpperCase().replace(/\s+/g, '');
  if (sourceDisplayNames[upperSource]) {
    return upperSource;
  }

  console.log("Nepoznat izvor, filtriraće se:", normalized);
  return null;
}

/**
 * Kreira jednu "news card" za prikaz feed-a.
 * 
 * // CHANGED: Proširili smo potpis: (feed, feedArray, index).
 */
function createNewsCard(feed, feedArray, index) {
  const card = document.createElement('div');
  card.className = "news-card";

  card.addEventListener('click', function (e) {
    const existingRipple = card.querySelector('.ripple');
    if (existingRipple) {
      existingRipple.remove();
    }
    const rect = card.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    card.appendChild(ripple);
    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });

    document.querySelectorAll('.news-card').forEach(existingCard => existingCard.classList.remove('active'));
    card.classList.add('active');

    // CHANGED: Prosledimo feedList i index
    openNewsModal(feed, feedArray, index);
  });

  // CHANGED START
  const img = document.createElement('img');
  img.className = "news-card-image lazy news-image";
  img.alt = feed.title ? feed.title : 'Nachrichtenbild';
  img.width = 80;
  img.height = 80;
  img.style.objectFit = "cover";
  img.style.display = "block";

  img.onerror = function () {
    this.onerror = null;
    this.src = `src/icons/no-image.png`;
  };

  if (feed.image) {
    // Ako feed.image == true, formiramo /image/<ID>:news-card
    img.src = `${window.location.origin}/image/${feed.id}:news-card`;
  } else {
    img.src = `src/icons/no-image.png`;
  }
  // CHANGED END

  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  const maxTitleLength = 70;
  const title = document.createElement('h3');
  title.className = "news-title truncated-title";
  title.textContent = feed.title 
    ? (feed.title.length > maxTitleLength 
        ? feed.title.substring(0, maxTitleLength - 1) + '…' 
        : feed.title) 
    : 'No title';
  
  const meta = document.createElement('p');
  meta.className = "news-meta";

  const sourceSpan = document.createElement('span');
  sourceSpan.className = "source";
  const normalizedSource = normalizeSourceForDisplay(feed.source);
  sourceSpan.textContent = sourceDisplayNames[normalizedSource] || normalizedSource;

  const flagImg = document.createElement('img');
  flagImg.className = "flag-icon";
  flagImg.style.height = "19px";
  flagImg.style.width = "13px";
  flagImg.style.marginRight = "5px";
  flagImg.src = getCountryFlag(feed.source);
  flagImg.alt = "flag";
  sourceSpan.prepend(flagImg);

  const timeSpan = document.createElement('span');
  timeSpan.className = "time";
  timeSpan.textContent = ` • ${timeAgo(feed.date_published) || ''}`;

  meta.appendChild(sourceSpan);
  meta.appendChild(timeSpan);
  contentDiv.appendChild(title);
  contentDiv.appendChild(meta);

  card.appendChild(img);
  card.appendChild(contentDiv);

  return card;
}

/**
 * Preprocesira feedove, grupiše ih po izvoru, isključuje blokirane izvore.
 */
function preprocessFeeds(feedsList) {
  const feedsBySource = new Map();

  feedsList.forEach(feed => {
    const normalized = normalizeSourceForDisplay(feed.source);
    if (!normalized) return;
    if (!feedsBySource.has(normalized)) {
      feedsBySource.set(normalized, []);
    }
    feedsBySource.get(normalized).push(feed);
  });

  const blockedSet = new Set(blockedSourcesCache);
  const allowedFeeds = [];
  feedsBySource.forEach((feeds, sourceKey) => {
    if (blockedSet.has(sourceKey.toUpperCase())) return;
    allowedFeeds.push(...feeds);
  });

  return allowedFeeds;
}

/**
 * Prikazuje listu feedova (vesti) u #news-container.
 */
export function displayFeedsList(feedsList, categoryName) {
  updateBlockedCache();
  const container = document.getElementById('news-container');
  if (!container) return;

  let uniqueFeeds = Array.from(new Map(feedsList.map(feed => [feed.id, feed])).values());
  uniqueFeeds = preprocessFeeds(uniqueFeeds);
  
  container.innerHTML = '';

  if (!uniqueFeeds || uniqueFeeds.length === 0) {
    container.innerHTML = `<p>Es gibt keine Nachrichten für die Kategorie: ${categoryName}</p>`;
    updateCategoryIndicator(categoryName);

    requestAnimationFrame(() => {
      container.scrollTop = 0;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    return;
  }

  uniqueFeeds.sort((a, b) => 
    new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
  );

  // CHANGED: Prosleđujemo i indeks (i)
  uniqueFeeds.forEach((feed, i) => {
    const card = createNewsCard(feed, uniqueFeeds, i);
    container.appendChild(card);
  });

  updateCategoryIndicator(categoryName);

  requestAnimationFrame(() => {
    container.scrollTop = 0;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    setTimeout(() => {
      container.scrollTop = 0;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 60);

    setTimeout(() => {
      container.scrollTop = 0;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 120);
  });
}

/**
 * Prikazuje "Aktuell" feedove.
 */
export async function displayAktuellFeeds(forceRefresh = false) {
  const container = document.getElementById('news-container');
  if (!container) return;

  let allFeeds = await fetchAllFeedsFromServer(forceRefresh);
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * Prikaz vesti po kategoriji.
 */
export async function displayNewsByCategory(category, forceRefresh = false) {
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

  let catFeeds = await fetchCategoryFeeds(category, forceRefresh);
  displayFeedsList(catFeeds, category);
}

/**
 * (Opcionalno) prikazuje sve kategorije, po 4 feed-a.
 */
export async function displayAllCategories() {
  const container = document.getElementById('news-container');
  if (!container) return;

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
    heading.style.color = "var(--primary-color)";
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

  requestAnimationFrame(() => {
    container.scrollTop = 0;
  });
}

/**
 * Dodaje event listener za osvežavanje aplikacije kada ponovo postane aktivna (vidljiva).
 */
export function initAppRefreshOnVisibilityChange() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const activeTab = document.querySelector('.tab.active');
      const category = activeTab ? activeTab.getAttribute('data-tab') : 'Aktuell';

      if (category === 'Aktuell') {
        displayAktuellFeeds(true);
      } else {
        displayNewsByCategory(category, true);
      }
      updateCategoryIndicator(category);
    }
  });
}

/**
 * Inicijalizuje rad sa feedovima.
 */
export function initFeeds() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      if (tab.classList.contains('active')) return;
      removeActiveClass();
      tab.classList.add('active');
      const category = tab.getAttribute('data-tab');
      await displayNewsByCategory(category);
    });
  });

  initAppRefreshOnVisibilityChange();
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

/**
 * Funkcija za blokiranje izvora.
 */
export function blockSource(src) {
  const blockedSources = getBlockedSources();
  const cleanedSource = removeTLD(src.toUpperCase().replace(/\s+/g, ''));
  if (!blockedSources.includes(cleanedSource)) {
    blockedSources.push(cleanedSource);
    localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
  }
}

/**
 * Funkcija za odblokiranje izvora.
 */
export function unblockSource(src) {
  const cleanedSource = removeTLD(src.toUpperCase().replace(/\s+/g, ''));
  let blockedSources = getBlockedSources();
  blockedSources = blockedSources.filter(s => s !== cleanedSource);
  localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
};

// Event delegation za sve kartice vesti
document.getElementById('news-container').addEventListener('click', function(e) {
  const card = e.target.closest('.news-card');
  if (card) {
    const newsId = card.getAttribute('data-news-id'); 
    if (newsId) {
      openNewsModal({ id: newsId });
    }
  }
});
