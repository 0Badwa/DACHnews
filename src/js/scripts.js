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
  main().then(() => {
    const homeTab = document.querySelector('.tab[data-tab="home"]');
    const latestTab = document.querySelector('.tab[data-tab="latest"]');
    const tabsContainer = document.getElementById('tabs-container');

    // Sakrij zeleni pravougaonik pri učitavanju (za "latest")
    hideGreenRectangle();

    // Ručni klik na Home tab => prikaži "home" feed (isto što i latest)
    if (homeTab) {
      homeTab.addEventListener('click', (e) => {
        removeActiveClass();
        e.target.classList.add('active');
        e.target.setAttribute('aria-selected', 'true');
        // Home tab se ponaša isto kao i Latest
        displayAllFeeds();
        showGreenRectangle();
      });
    }

    // Ručni klik na Latest tab => prikaži "latest" feed
    if (latestTab) {
      latestTab.addEventListener('click', (e) => {
        removeActiveClass();
        e.target.classList.add('active');
        e.target.setAttribute('aria-selected', 'true');
        displayAllFeeds();
        showGreenRectangle();
      });
    }

    // Generišemo tabove za ostale kategorije
    if (tabsContainer) {
      // Možeš da isključiš neke kategorije iz generate ako želiš
      const skipList = [];

      categories
        .filter(cat => !skipList.includes(cat))
        .forEach(cat => {
          const btn = document.createElement('button');
          btn.classList.add('tab');
          btn.setAttribute('data-tab', cat);
          btn.setAttribute('role', 'tab');
          btn.setAttribute('aria-selected', 'false');
          btn.textContent = cat;

          btn.addEventListener('click', (ev) => {
            removeActiveClass();
            ev.target.classList.add('active');
            ev.target.setAttribute('aria-selected', 'true');
            showGreenRectangle();

            displayNewsByCategory(cat);
          });

          tabsContainer.appendChild(btn);
        });
    }

    // -------------------------------
    // Swipe detekcija za promenu kategorija
    // -------------------------------
    const swipeContainer = document.getElementById('news-container');
    let touchstartX = 0;
    let touchendX = 0;
    const swipeThreshold = 50;

    function handleGesture() {
      if (!firstSwipeOccurred) {
        firstSwipeOccurred = true;
        showGreenRectangle();
      }
      if (touchendX < touchstartX - swipeThreshold) {
        showNextCategory();
      } else if (touchendX > touchstartX + swipeThreshold) {
        showPreviousCategory();
      }
    }

    if (swipeContainer) {
      swipeContainer.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
      });

      swipeContainer.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleGesture();
      });
    }

    // Pravimo listu svih kategorija za swipe redom: home, latest, pa ostale
    const fullCategoryList = ["home", "latest", ...categories];

    function showNextCategory() {
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let currentIdx = fullCategoryList.indexOf(currentCat.toLowerCase());
      if (currentIdx < 0) currentIdx = 0; // ako iz nekog razloga ne postoji
      if (currentIdx < fullCategoryList.length - 1) {
        currentIdx++;
        const nextCat = fullCategoryList[currentIdx];
        // Pronađi tab i klikni ga
        const nextTab = document.querySelector(`.tab[data-tab="${nextCat}"]`);
        if (nextTab) nextTab.click();
      }
    }

    function showPreviousCategory() {
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let currentIdx = fullCategoryList.indexOf(currentCat.toLowerCase());
      if (currentIdx < 0) currentIdx = 0;
      if (currentIdx > 0) {
        currentIdx--;
        const prevCat = fullCategoryList[currentIdx];
        const prevTab = document.querySelector(`.tab[data-tab="${prevCat}"]`);
        if (prevTab) prevTab.click();
      }
    }
  });

  // --------------------------------------------
  // Settings Menu funkcionalnost
  // --------------------------------------------
  function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'flex';
    }
  }

  function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'none';
    }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Ako postoji dugme za promenu teme, ažuriraj njegov tekst
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = newTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
  }

  function changeFontSize(delta) {
    const body = document.body;
    const currentSize = parseInt(window.getComputedStyle(body).fontSize);
    const newSize = currentSize + delta;
    if (newSize >= 12 && newSize <= 24) {
      body.style.fontSize = newSize + 'px';
      localStorage.setItem('fontSize', newSize);
    }
  }

  // Inicijalizacija Settings menija
  document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    const closeSettingsButton = document.getElementById('close-settings');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const fontIncreaseButton = document.getElementById('font-increase');
    const fontDecreaseButton = document.getElementById('font-decrease');

    if (menuButton) {
      menuButton.addEventListener('click', openSettingsModal);
    }
    if (closeSettingsButton) {
      closeSettingsButton.addEventListener('click', closeSettingsModal);
    }
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
        closeSettingsModal();
      });
    }
    if (fontIncreaseButton) {
      fontIncreaseButton.addEventListener('click', () => changeFontSize(1));
    }
    if (fontDecreaseButton) {
      fontDecreaseButton.addEventListener('click', () => changeFontSize(-1));
    }

    // Učitaj prethodno sačuvana podešavanja teme i fonta
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      document.body.style.fontSize = savedFontSize + 'px';
    }
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = savedTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
  });

  console.log('Script loaded');

  // --------------------------------------------
  // Lazy Loading (opciono, ako slike imaju klasu .lazy)
  // --------------------------------------------
  document.addEventListener("DOMContentLoaded", function() {
    const lazyImages = document.querySelectorAll('img.lazy');
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src; // Kopira data-src u src
            img.classList.remove("lazy");
            img.classList.add("loaded");
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: "0px 0px 50px 0px",
        threshold: 0.01
      });

      lazyImages.forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback ako IntersectionObserver nije podržan
      lazyImages.forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove("lazy");
      });
    }
  });
});
