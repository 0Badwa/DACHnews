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
 * Vraća odgovarajući URL za zastavu, na osnovu izvora.
 */
function getCountryFlag(source) {
  const sourceCountryMap = {
    // Austrija
    'DERSTANDARD.AT': 'https://flagcdn.com/at.svg',
    'DER-AUGUSTIN.AT': 'https://flagcdn.com/at.svg',
    'FALTER.AT': 'https://flagcdn.com/at.svg',
    'KURIER.AT': 'https://flagcdn.com/at.svg',
    'PROFIL.AT': 'https://flagcdn.com/at.svg',
    'SALZBURG.COM': 'https://flagcdn.com/at.svg',
    'WIENERZEITUNG.AT': 'https://flagcdn.com/at.svg',

    // Nemačka
    'ZEIT.DE': 'https://flagcdn.com/de.svg',
    'SPIEGEL.DE': 'https://flagcdn.com/de.svg',
    'SUEDDEUTSCHE.DE': 'https://flagcdn.com/de.svg',
    'FAZ.NET': 'https://flagcdn.com/de.svg',
    'TAGESSPIEGEL.DE': 'https://flagcdn.com/de.svg',
    'JUNGLE.WORLD': 'https://flagcdn.com/de.svg',
    'NEUES-DEUTSCHLAND.DE': 'https://flagcdn.com/de.svg',
    'VOLKSSTIMME.DE': 'https://flagcdn.com/de.svg',
    'QUEER.DE': 'https://flagcdn.com/de.svg',
    'DISPLAY-MAGAZIN.DE': 'https://flagcdn.com/de.svg',
    'CRUISERMAGAZIN.DE': 'https://flagcdn.com/de.svg',
    'DU-UND-ICH.NET': 'https://flagcdn.com/de.svg',
    'SIEGESSAEULE.DE': 'https://flagcdn.com/de.svg',
    'SOCIALISTISCHE-ZEITUNG.DE': 'https://flagcdn.com/de.svg',
    'ANALYSE-UND-KRITIK.ORG': 'https://flagcdn.com/de.svg',

    // Švajcarska
    'AARGAUERZEITUNG.CH': 'https://flagcdn.com/ch.svg',
    'BLICK.CH': 'https://flagcdn.com/ch.svg',
    'WOZ.CH': 'https://flagcdn.com/ch.svg',
    'TAGBLATT.CH': 'https://flagcdn.com/ch.svg',
    'PSZEITUNG.CH': 'https://flagcdn.com/ch.svg',
    'TAGESANZEIGER.CH': 'https://flagcdn.com/ch.svg',
    'VORWAERTS.CH': 'https://flagcdn.com/ch.svg',

    // Podrazumevano
    'DEFAULT': 'https://flagcdn.com/un.svg'
  };

  if (!source) return sourceCountryMap['DEFAULT'];
  const normalizedSource = source.toUpperCase().replace(/\s+/g, '');
  return sourceCountryMap[normalizedSource] || sourceCountryMap['DEFAULT'];
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
 * Čita niz blokiranih izvora iz localStorage (ranije "hiddenSources").
 */
function getBlockedSources() {
  try {
    return JSON.parse(localStorage.getItem('blockedSources') || '[]');
  } catch {
    return [];
  }
}

/**
 * Čita niz blokiranih kategorija iz localStorage (ranije "hiddenCategories").
 */
function getBlockedCategories() {
  try {
    return JSON.parse(localStorage.getItem('blockedCategories') || '[]');
  } catch {
    return [];
  }
}

/**
 * Proverava da li je feed sakriven na osnovu blokiranog izvora ili blokirane kategorije.
 */
function isHiddenFeed(feed) {
  const blockedSources = getBlockedSources();
  const blockedCats = getBlockedCategories();
  
  // "Ohne Kategorie" tretiramo kao "Sonstiges"
  const cat = feed.category === "Ohne Kategorie" ? "Sonstiges" : feed.category;
  
  if (blockedCats.includes(cat)) return true;

  if (feed.source) {
    const normalizedSource = feed.source.toUpperCase().replace(/\s+/g, '');
    if (blockedSources.includes(normalizedSource)) return true;
  }

  return false;
}

/**
 * Preuzimanje do 50 najnovijih feed-ova iz "Aktuell" (ruta /api/feeds), keširano ~10 min.
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  showLoader();
  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';

    // Ako je forceRefresh, brišemo keš.
    if (forceRefresh) {
      localStorage.removeItem(lastFetchKey);
      localStorage.removeItem(cachedFeedsKey);
    }

    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako nije forceRefresh i cache je mlađi od 10 min, vraćamo keš
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

    // Inače, fetchujemo sa servera
    const response = await fetch("/api/feeds");
    if (!response.ok) {
      console.error("[fetchAllFeedsFromServer] Server returned status:", response.status);
      showErrorMessage("Fehler: /api/feeds konnte nicht geladen werden.");
      return [];
    }

    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.filter(feed => !isHiddenFeed(feed));

    // Skladištimo u localStorage
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
 * Preuzima do 50 feedova iz date kategorije (ruta /api/feeds-by-category), keširano ~10 min.
 */
export async function fetchCategoryFeeds(category, forceRefresh = false) {
  showLoader();
  try {
    // "Sonstiges" => "Uncategorized" na serveru
    const catForUrl = (category === "Sonstiges") ? "Uncategorized" : category;
    const lastFetchKey = `feeds-${catForUrl}-lastFetch`;
    const cachedFeedsKey = `feeds-${catForUrl}`;
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako cache nije stariji od 10 min, vraćamo keš
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
  
  // Klik na karticu -> otvori modal
  card.onclick = () => {
    // Ukloni 'active' klasu sa svih
    document.querySelectorAll('.news-card').forEach(existingCard => existingCard.classList.remove('active'));
    // Dodaj 'active' ovoj kartici
    card.classList.add('active');
    // Otvori modal
    openNewsModal(feed);
  };

  // Slika (lazy loading)
  const img = document.createElement('img');
  img.className = "news-card-image lazy";
  const BASE_IMAGE_URL = "https://dachnews.onrender.com";
  if (feed.image) {
    img.src = feed.image.startsWith("/")
      ? `${BASE_IMAGE_URL}${feed.image}`
      : feed.image;
  } else {
    img.src = `${BASE_IMAGE_URL}/img/noimg.png`; // Rezervna slika
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

  // Zastava
  const flagImg = document.createElement('img');
  flagImg.className = "flag-icon";
  flagImg.src = getCountryFlag(feed.source);
  flagImg.alt = "flag";
  // Dodajemo zastavu ispred izvora
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
 * Prikazuje "Aktuell" feedove (sve najnovije) pozivom fetchAllFeedsFromServer().
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
 * Prikazuje po 4 feeda za sve kategorije (ako se to uopšte koristi).
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
  // Dodaj listener za sve tabove:
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

  // Osvežavanje kad tab iz pozadine dođe u fokus
  initAppRefreshOnVisibilityChange();

  // Inicijalno prikazujemo 'Aktuell'
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

// Pokrećemo initFeeds kada je DOM spreman
document.addEventListener('DOMContentLoaded', () => {
  initFeeds();
});
