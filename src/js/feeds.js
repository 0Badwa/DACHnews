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

/**
 * Parsira domain ili ime izvora da bismo lakše pronašli zastavu.
 * Uklanja http(s)://, www., završne "/" itd.
 */
function parseDomain(source) {
  if (!source) return '';
  let s = source.trim().toLowerCase();

  // Ukloni protokol
  s = s.replace(/^https?:\/\//, '');
  // Ukloni "www."
  s = s.replace(/^www\./, '');
  // Ukloni sve posle prvog '/' (ukoliko postoji path, npr: domain.com/vesti/...)
  s = s.split('/')[0];
  // Ukloni razmake
  s = s.replace(/\s+/g, '');

  return s;
}

/**
 * Vraća URL zastave, zavisno od domena ili ključne reči.
 */
function getCountryFlag(source) {
  if (!source) return 'https://flagcdn.com/un.svg'; // ako je undefined/prazno

  // Parsiramo domain ili naziv
  const domain = parseDomain(source);

  // Primer mape koja obuhvata i delimične ključeve i tačne domene
  // Ključ je string koji očekujemo u "domain", a vrednost je URL do svg zastave
  const sourceCountryMap = {
    // Austrija (AT)
    'derstandard.at': 'https://flagcdn.com/at.svg',
    'falter.at': 'https://flagcdn.com/at.svg',
    'kurier.at': 'https://flagcdn.com/at.svg',
    'profil.at': 'https://flagcdn.com/at.svg',
    'wienerzeitung.at': 'https://flagcdn.com/at.svg',
    'salzburg.com': 'https://flagcdn.com/at.svg',
    'augustin': 'https://flagcdn.com/at.svg',          // npr. "der-augustin.at"

    // Nemačka (DE)
    'zeit.de': 'https://flagcdn.com/de.svg',
    'spiegel.de': 'https://flagcdn.com/de.svg',
    'sueddeutsche.de': 'https://flagcdn.com/de.svg',
    'faz.net': 'https://flagcdn.com/de.svg',
    'tagesspiegel.de': 'https://flagcdn.com/de.svg',
    'jungel.world': 'https://flagcdn.com/de.svg',
    'neues-deutschland.de': 'https://flagcdn.com/de.svg',
    'volksstimme.de': 'https://flagcdn.com/de.svg',
    'queer.de': 'https://flagcdn.com/de.svg',
    'display-magazin.de': 'https://flagcdn.com/de.svg',
    'cruisermagazin.de': 'https://flagcdn.com/de.svg',
    'du-und-ich.net': 'https://flagcdn.com/de.svg',
    'siegessaeule.de': 'https://flagcdn.com/de.svg',
    'analyse-und-kritik.org': 'https://flagcdn.com/de.svg',
    'bild': 'https://flagcdn.com/de.svg',              // "bild.de" ili samo "BILD"
    'heise': 'https://flagcdn.com/de.svg',             // "heise.de"
    'taz.de': 'https://flagcdn.com/de.svg',            // "taz.de"
    'freitag.de': 'https://flagcdn.com/de.svg',        // "freitag.de"

    // Švajcarska (CH)
    'aargauerzeitung.ch': 'https://flagcdn.com/ch.svg',
    'blick.ch': 'https://flagcdn.com/ch.svg',
    'woz.ch': 'https://flagcdn.com/ch.svg',
    'tagblatt.ch': 'https://flagcdn.com/ch.svg',
    'pszeitung.ch': 'https://flagcdn.com/ch.svg',
    'tagesanzeiger.ch': 'https://flagcdn.com/ch.svg',
    'vorwaerts.ch': 'https://flagcdn.com/ch.svg',

    // Podrazumevano
    '_default': 'https://flagcdn.com/un.svg'
  };

  // Prolazimo kroz mapu i tražimo da li domain sadrži ključ
  // npr. "sueddeutsche.de" includes "sueddeutsche.de" -> true
  // ili "bild" includes "bild" -> true
  for (const key in sourceCountryMap) {
    if (key !== '_default' && domain.includes(key)) {
      return sourceCountryMap[key];
    }
  }

  // ako ne pronađe, vrati default
  return sourceCountryMap['_default'];
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
 * Proverava da li je feed sakriven (blokiran) na osnovu izvora ili kategorije.
 */
function isHiddenFeed(feed) {
  const blockedSources = getBlockedSources();
  const blockedCats = getBlockedCategories();
  
  // "Ohne Kategorie" tretiramo kao "Sonstiges"
  const cat = (feed.category === "Ohne Kategorie") ? "Sonstiges" : feed.category;
  if (blockedCats.includes(cat)) return true;

  if (feed.source) {
    const normalizedSource = feed.source.toUpperCase().replace(/\s+/g, '');
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
  img.className = "news-card-image lazy";
  const BASE_IMAGE_URL = "https://dachnews.onrender.com";
  if (feed.image) {
    img.src = feed.image.startsWith("/")
      ? `${BASE_IMAGE_URL}${feed.image}`
      : feed.image;
  } else {
    img.src = `${BASE_IMAGE_URL}/img/noimg.png`;
  }
  img.alt = feed.title || 'No title';

  // Sadržaj
  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  const title = document.createElement('h3');
  title.className = "news-title truncated-title";
  title.textContent = feed.title || 'No title';

  const meta = document.createElement('p');
  meta.className = "news-meta";

  // Izvor
  const sourceSpan = document.createElement('span');
  sourceSpan.className = "source";
  const normalizedSource = feed.source
    ? feed.source.toUpperCase().replace(/\s+/g, '')
    : 'UNBEKANNTEQUELLE';
  sourceSpan.textContent = normalizedSource;

  // Zastava (visina 1.5rem)
  const flagImg = document.createElement('img');
  flagImg.className = "flag-icon";
  flagImg.style.height = "1.5rem";
  flagImg.src = getCountryFlag(feed.source);
  flagImg.alt = "flag";
  sourceSpan.prepend(flagImg);

  // Vreme
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

  // Pre punjenja sadržaja, skrol na vrh
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

  // Ako je nepoznata, prebacujemo se na "Aktuell"
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

      // Force refresh
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
  // Listener za sve tabove
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

  // Osvežavanje kad se vrati iz pozadine
  initAppRefreshOnVisibilityChange();

  // Inicijalni prikaz => "Aktuell"
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

// Pokreće se kad je DOM spreman
document.addEventListener('DOMContentLoaded', () => {
  initFeeds();
});
