/**
 * feeds.js
 * 
 * Ovaj fajl sadrži sve što je vezano za rad sa feedovima na frontendu:
 * - fetchAllFeedsFromServer, fetchCategoryFeeds
 * - displayFeedsList, displayNeuesteFeeds, displayAktuellFeeds, displayNewsByCategory
 * - pomoćne funkcije: timeAgo, pickRandom, createNewsCard
 */

import { initializeLazyLoading, updateCategoryIndicator } from './ui.js';
import { openNewsModal } from './newsModal.js';

/**
 * Funkcija za formatiranje vremena u stilu "vor X Minuten/Stunden/Tagen..."
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
 * Pomoćna funkcija koja dohvata 50 najnovijih feed-ova sa servera ("/api/feeds") i vraća ih.
 * Uz keširanje u localStorage na 10 minuta (osim ako se zatraži forceRefresh).
 */
export async function fetchAllFeedsFromServer(forceRefresh = false) {
  try {
    const lastFetchKey = 'feeds-Aktuell-lastFetch';
    const cachedFeedsKey = 'feeds-Aktuell';
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    // Ako nije forceRefresh i ako je fetch rađen u poslednjih 10 min -> koristimo keš
    if (!forceRefresh && lastFetchTime && (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000) {
      const cachedFeeds = localStorage.getItem(cachedFeedsKey);
      if (cachedFeeds) {
        const data = JSON.parse(cachedFeeds);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        return data.slice(0, 50);
      }
    }

    // Inače, pravimo novi poziv ka serveru
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
    const data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

    // Čuvamo u localStorage i beležimo vreme
    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());
    return data.slice(0, 50);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Funkcija koja dohvata 50 najnovijih feed-ova za određenu kategoriju
 * ("/api/feeds-by-category/<cat>") i vraća ih, uz keširanje.
 */
export async function fetchCategoryFeeds(category, forceRefresh = false) {
  const catForUrl = (category === "Ohne Kategorie") ? "Uncategorized" : category;
  try {
    const lastFetchKey = `feeds-${catForUrl}-lastFetch`;
    const cachedFeedsKey = `feeds-${catForUrl}`;
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    if (!forceRefresh && lastFetchTime && (Date.now() - new Date(lastFetchTime).getTime()) < 10 * 60 * 1000) {
      const cached = localStorage.getItem(cachedFeedsKey);
      if (cached) {
        let data = JSON.parse(cached);
        data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
        return data.slice(0, 50);
      }
    }

    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Neuspešno preuzimanje ${url}`);
    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

    localStorage.setItem(cachedFeedsKey, JSON.stringify(data));
    localStorage.setItem(lastFetchKey, new Date().toISOString());
    return data.slice(0, 50);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Funkcija koja kreira jednu "news card" za prikaz vesti,
 * skraćuje naslov na max 3 reda, bez hifenacije.
 * Klik na karticu -> otvara modal (newsModal.js).
 */
function createNewsCard(feed) {
  const card = document.createElement('div');
  card.className = "news-card";

  // Dodajemo event listener za otvaranje modala
  card.addEventListener('click', () => {
    openNewsModal(feed);
  });

  // Slika
  const img = document.createElement('img');
  img.className = "news-card-image lazy";
  img.dataset.src = feed.image || 'https://via.placeholder.com/80';
  img.alt = feed.title || 'No title';

  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  // Naslov skraćen
  const title = document.createElement('h3');
  title.className = "news-title truncated-title";
  title.textContent = feed.title || 'No title';

  // meta
  const meta = document.createElement('p');
  meta.className = "news-meta";

  const sourceSpan = document.createElement('span');
  sourceSpan.className = "source";
  const sourceName = feed.source || 'Unbekannte Quelle';
  sourceSpan.textContent = sourceName;

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
 * Funkcija koja prikazuje listu vesti i ažurira indikator kategorije.
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
 * Funkcija koja prikazuje "Aktuell" feed (sve vesti).
 */
export async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let allFeeds = await fetchAllFeedsFromServer();
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * Funkcija za uzimanje slučajnih elemenata iz niza.
 */
function pickRandom(array, count) {
  if (array.length <= count) return array;
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Funkcija koja prikazuje "Neueste":
 *  1) Pronalazi 4 vesti objavljene prvo u poslednja 2 sata,
 *     ako nema dovoljno, onda poslednja 4 sata,
 *     ako i dalje nema dovoljno, do 1 dana.
 *  2) Više NE dodajemo drugi naslov "Neueste Nachrichten" unutar kontejnera;
 *     ostaje samo category indicator (updateCategoryIndicator).
 *  3) Te 4 vesti sortiramo od najnovije ka najstarijoj i prikazujemo.
 *  4) Zatim po 4 vesti iz svake kategorije (osim Aktuell).
 */
export async function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '';

  // Dohvatimo sve feedove
  let allFeeds = await fetchAllFeedsFromServer();
  const now = Date.now();

  // Prvo probamo 2 sata
  let filtered = allFeeds.filter(feed => {
    if (!feed.date_published) return false;
    return (now - new Date(feed.date_published).getTime()) <= (2 * 60 * 60 * 1000);
  });

  // Ako ima < 4, probamo 4 sata
  if (filtered.length < 4) {
    filtered = allFeeds.filter(feed => {
      if (!feed.date_published) return false;
      return (now - new Date(feed.date_published).getTime()) <= (4 * 60 * 60 * 1000);
    });
  }

  // Ako i dalje ima < 4, uzimamo do 1 dana
  if (filtered.length < 4) {
    filtered = allFeeds.filter(feed => {
      if (!feed.date_published) return false;
      return (now - new Date(feed.date_published).getTime()) <= (24 * 60 * 60 * 1000);
    });
  }

  // 4 random, zatim sortiramo (najnovija prva)
  const top4Neueste = pickRandom(filtered, 4);
  top4Neueste.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

  // Prvo prikažemo te 4
  top4Neueste.forEach(feed => {
    const card = createNewsCard(feed);
    container.appendChild(card);
  });

  // 2) Ostale kategorije (osim Aktuell)
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
    "Ohne Kategorie"
  ];

  // Paralelno dohvatamo feedove
  const fetchPromises = categories.map(async (cat) => {
    let catFeeds = await fetchCategoryFeeds(cat);
    return { cat, feeds: catFeeds };
  });

  const results = await Promise.all(fetchPromises);

  // Za svaku kategoriju prikazujemo po 4 vesti
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

  // Indikator umesto "Aktuell" -> "Neueste Nachrichten"
  updateCategoryIndicator("Neueste Nachrichten");
  initializeLazyLoading();
}

/**
 * Funkcija koja prikazuje vesti za određenu kategoriju.
 * Ako kategorija ne postoji, prikazuje "Aktuell".
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
    "LGBT+",
    "Ohne Kategorie"
  ];

  // Ako nije validna -> Aktuell
  if (!validCategories.includes(category)) {
    displayAktuellFeeds();
    return;
  }

  let catFeeds = await fetchCategoryFeeds(category);
  displayFeedsList(catFeeds, category);
}
