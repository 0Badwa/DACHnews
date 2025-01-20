/************************************************
 * scripts.js
 ************************************************/

document.addEventListener("DOMContentLoaded", () => {
  // --------------------------------------------
  // Globalne promenljive i inicijalne vrednosti
  // --------------------------------------------
  let feeds = [];
  let firstSwipeOccurred = false; // Praćenje prvog swipa (za zeleni pravougaonik)
  // Ovo su kategorije koje će biti generisane dinamički (bez "home" i "latest")
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
    "Uncategorized"
  ];

  // Element za prikaz trenutne kategorije iznad vesti
  const categoryIndicator = document.createElement('div');
  categoryIndicator.className = "category-indicator";
  // Postavljamo categoryIndicator iznad #news-container
  document.body.insertBefore(categoryIndicator, document.getElementById('news-container'));

  // --------------------------------------------
  // Pomoćne funkcije za formatiranje
  // --------------------------------------------
  function timeAgo(dateString) {
    // Pretpostavka: dateString je ISO string za datum objavljivanja
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

  function removeActiveClass() {
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
      tab.classList.remove('active-green'); // Uklanja zeleni okvir
    });
  }

  function showGreenRectangle() {
    // Prikazuje zeleni pravougaonik oko aktivnog taba
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      activeTab.classList.add('active-green');
    }
  }

  function hideGreenRectangle() {
    // Sklanja zeleni pravougaonik sa "Latest" taba prilikom inicijalnog učitavanja
    const homeTab = document.querySelector('.tab[data-tab="latest"]');
    if (homeTab) {
      homeTab.classList.remove('active-green');
    }
  }

  // --------------------------------------------
  // Funkcije za dohvat i prikaz feedova
  // --------------------------------------------
  async function fetchAllFeedsFromServer() {
    // Dohvata sve vesti (npr. za home/latest)
    try {
      const response = await fetch("/api/feeds");
      if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async function fetchCategoryFeeds(category) {
    // Dohvata vesti za odabranu kategoriju
    try {
      const url = `/api/feeds-by-category/${encodeURIComponent(category)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Neuspešno preuzimanje ${url}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function cacheAllFeedsLocally(items) {
    localStorage.setItem('feeds', JSON.stringify(items));
  }

  function createNewsCard(feed) {
    const card = document.createElement('div');
    card.className = "news-card";

    const img = document.createElement('img');
    img.className = "news-card-image";
    // Lazy loading nije potrebno ako se dohvata direktno
    // Ako želiš lazy, koristi data-src i klasu "lazy"
    img.src = feed.image || 'https://via.placeholder.com/150';
    img.alt = feed.title || 'No title';

    const contentDiv = document.createElement('div');
    contentDiv.className = "news-card-content";

    const title = document.createElement('h3');
    title.className = "news-title";
    title.textContent = feed.title || 'No title';

    const source = document.createElement('p');
    source.className = "news-meta";
    const sourceName = feed.source || 'Nepoznat izvor';
    const timeString = feed.date_published ? timeAgo(feed.date_published) : '';
    source.textContent = `${sourceName} • ${timeString}`;

    // Sklopi karticu
    contentDiv.appendChild(title);
    contentDiv.appendChild(source);
    card.appendChild(img);
    card.appendChild(contentDiv);

    return card;
  }

  function updateCategoryIndicator(categoryName) {
    // Prikazuje naziv kategorije u categoryIndicator
    if (categoryIndicator) {
      categoryIndicator.textContent = categoryName;
      categoryIndicator.classList.add('fade-out');
      setTimeout(() => {
        categoryIndicator.classList.remove('fade-out');
        categoryIndicator.classList.add('fade-in');
        setTimeout(() => {
          categoryIndicator.classList.remove('fade-in');
        }, 300);
      }, 300);
    }
  }

  async function displayAllFeeds() {
    // Prikazuje sve feedove (home / latest)
    const container = document.getElementById('news-container');
    if (!container) return;
    container.innerHTML = '';

    let local = localStorage.getItem('feeds');
    if (local) {
      // Ako već imamo feeds u localStorage
      feeds = JSON.parse(local);
    } else {
      // Ako nemamo, dohvatamo
      feeds = await fetchAllFeedsFromServer();
      cacheAllFeedsLocally(feeds);
    }

    if (!feeds || feeds.length === 0) {
      container.innerHTML = '<p>No news.</p>';
      return;
    }

    // Sortiranje od najnovijih
    feeds.sort((a, b) => {
      return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
    });

    feeds.forEach(feed => {
      const card = createNewsCard(feed);
      container.appendChild(card);
    });
    updateCategoryIndicator("Latest");
  }

  async function displayNewsByCategory(category) {
    console.log(`Prikaz vesti za kategoriju: ${category}`);

    // Poseban keš za svaku kategoriju
    let localKey = `feeds-${category}`;
    let local = localStorage.getItem(localKey);
    let catFeeds = [];

    if (local) {
      catFeeds = JSON.parse(local);
    } else {
      catFeeds = await fetchCategoryFeeds(category);
      localStorage.setItem(localKey, JSON.stringify(catFeeds));
    }

    const container = document.getElementById('news-container');
    if (!container) return;
    container.innerHTML = '';

    if (!catFeeds || catFeeds.length === 0) {
      container.innerHTML = `<p>Nema vesti za kategoriju: ${category}</p>`;
      return;
    }

    // Sortiramo i prikazujemo
    catFeeds.sort((a, b) => {
      return new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
    });

    catFeeds.forEach(item => {
      const card = createNewsCard(item);
      container.appendChild(card);
    });

    updateCategoryIndicator(category);
  }

  // --------------------------------------------
  // Glavni tok - main() + interval za osvežavanje
  // --------------------------------------------
  async function main() {
    // Proveri localStorage('feeds'), ako postoji, prikaži. U suprotnom dohvatimo
    const cachedFeeds = localStorage.getItem('feeds');
    if (cachedFeeds) {
      feeds = JSON.parse(cachedFeeds);
      displayAllFeeds();
    } else {
      let fresh = await fetchAllFeedsFromServer();
      feeds = fresh;
      cacheAllFeedsLocally(feeds);
      displayAllFeeds();
    }

    // Periodična provera novih feedova
    setInterval(async () => {
      let fresh = await fetchAllFeedsFromServer();
      if (fresh.length > feeds.length) {
        feeds = fresh;
        cacheAllFeedsLocally(feeds);
        displayAllFeeds();
      }
    }, 300000); // 5 minuta
  }

  // --------------------------------------------
  // Inicijalizacija nakon main() - tabovi i swipe
  // --------------------------------------------
  main().then(() 
