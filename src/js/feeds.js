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

// Uvoz brandMap iz sourcesConfig.js
import { brandMap } from './sourcesConfig.js';

/**
 * Helper funkcija koja uklanja TLD-ove .CH, .DE, .AT iz prosleđenog stringa.
 */
function removeTLD(source) {
  return source.replace(/\.(ch|de|at)$/i, '');
}

/**
 * Parsira domain ili ime izvora da bismo lakše pronašli zastavu.
 * Uklanja "http(s)://", "www.", završne "/" i sve razmake.
 */
function parseDomain(source) {
  if (!source) return '';
  let s = source.trim().toLowerCase();

  // Ukloni protokol (http:// ili https://)
  s = s.replace(/^https?:\/\//, '');
  // Ukloni "www."
  s = s.replace(/^www\./, '');
  // Ukloni sve posle prvog '/', ako postoji
  s = s.split('/')[0];
  // Ukloni razmake
  s = s.replace(/\s+/g, '');

  return s;
}

/**
 * Vraća URL zastave zasnovan na brendovima ili TLD-u (".de", ".at", ".ch").
 */
function getCountryFlag(source) {
  const domain = parseDomain(source);

// 1) Proveri brend iz brandMap i učitaj lokalne zastave
for (const brand in brandMap) {
  if (domain.includes(brand)) {
    return `src/icons/flags/${brandMap[brand]}.svg`;
  }
}


  // 2) Ako nije prepoznat brend, proveri TLD
  if (domain.endsWith('.de')) {
    return 'src/icons/flags/de.svg';
  } else if (domain.endsWith('.at')) {
    return 'src/icons/flags/at.svg';
  } else if (domain.endsWith('.ch')) {
    return 'src/icons/flags/ch.svg';
  }

  // 3) Podrazumevano
  return 'src/icons/flags/un.svg'; // Dodaj default zastavu ako ne postoji
}

/**
 * Vraća string tipa "vor X Minuten/Stunden/Tagen...", na nemačkom jeziku.
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
 * Proverava da li je feed sakriven (blokiran) na osnovu izvora, kategorije
 * i da li je datum objavljivanja u budućnosti (u tom slučaju se takođe sakriva).
 */
function isHiddenFeed(feed) {
  // NE PRIKAZUJ vesti sa datumom sutra ili u budućnosti
  if (feed.date_published) {
    const publishedDate = new Date(feed.date_published);
    const now = new Date();
    if (publishedDate > now) return true;
  }

  const blockedSources = getBlockedSources();
  const blockedCats = getBlockedCategories();
  
  // "Ohne Kategorie" tretiramo kao "Sonstiges"
  const cat = (feed.category === "Ohne Kategorie") ? "Sonstiges" : feed.category;
  if (blockedCats.includes(cat)) return true;

  if (feed.source) {
    const normalizedSource = removeTLD(feed.source.toUpperCase().replace(/\s+/g, ''));
    if (blockedSources.includes(normalizedSource)) {
      return true;
    }
  }

  return false;
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

    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako cache nije stariji od 10 min, vraćamo keš
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
        return data.slice(0, 100);
      }
    }

    // Inače, fetchujemo
    const response = await fetch("/api/feeds");
    if (!response.ok) {
      console.error("[fetchAllFeedsFromServer] Server returned status:", response.status);
      showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
      return [];
    }

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    // U localStorage
    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());

    return data.slice(0, 50);

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
 * Fetch do 50 feedova iz određene kategorije, keširano ~10 min (/api/feeds-by-category).
 */
export async function fetchCategoryFeeds(category, forceRefresh = false) {
  showLoader();
  try {
    // "Sonstiges" => "Uncategorized" na serveru
    const catForUrl = (category === "Sonstiges") ? "Uncategorized" : category;
    const lastFetchKey = `feeds-${catForUrl}-lastFetch`;
    const cachedFeedsKey = `feeds-${catForUrl}`;
    const lastFetchTime = localStorage.getItem(lastFetchKey);

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
  
  // Klik na karticu -> otvori modal
  card.onclick = () => {
    document.querySelectorAll('.news-card').forEach(existingCard => existingCard.classList.remove('active'));
    card.classList.add('active');
    openNewsModal(feed);
  };
  
  // Slika
  const img = document.createElement('img');
  img.className = "news-card-image lazy news-image";

  const BASE_IMAGE_URL = window.location.hostname.includes("dach.news")
  ? "https://www.dach.news"
  : window.location.hostname.includes("localhost")
  ? "http://localhost:3001"
  : "https://dachnews.onrender.com";

  if (feed.image && feed.image.startsWith("/")) {
    img.src = `${BASE_IMAGE_URL}${feed.image}`;
  } else if (feed.image) {
    img.src = feed.image;
  } else {
    img.src = `${BASE_IMAGE_URL}/img/noimg.png`;
  }

  // Sadržaj
  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  const title = document.createElement('h3');
  title.className = "news-title truncated-title";
  title.textContent = feed.title || 'No title';

  const meta = document.createElement('p');
  meta.className = "news-meta";

  const sourceSpan = document.createElement('span');
  sourceSpan.className = "source";
  const normalizedSource = feed.source
    ? removeTLD(feed.source.toUpperCase().replace(/\s+/g, ''))
    : 'UNBEKANNTEQUELLE';
  sourceSpan.textContent = normalizedSource;

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
}

/**
 * Prikazuje "Aktuell" feedove (poziva fetchAllFeedsFromServer).
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

