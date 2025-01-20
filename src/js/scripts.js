/************************************************
 * scripts.js
 ************************************************/

document.addEventListener("DOMContentLoaded", () => {
  // Globalna promenljiva
  let feeds = [];

  // Kategorije (iste kao u GPT promptu + "Uncategorized")
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

  // Pomoćna funkcija za prikaz vremena od objave u nemačkom formatu
  function timeAgo(dateString) {
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

  async function fetchAllFeedsFromServer() {
    console.log("[fetchAllFeedsFromServer] /api/feeds...");
    try {
      const response = await fetch("/api/feeds");
      if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
      const data = await response.json();
      console.log("[fetchAllFeedsFromServer] Primljeno:", data.length, "vesti");
      return data;
    } catch (error) {
      console.error("[fetchAllFeedsFromServer] Greška:", error);
      return [];
    }
  }

  function cacheAllFeedsLocally(items) {
    localStorage.setItem('feeds', JSON.stringify(items));
    console.log("[cacheAllFeedsLocally] Sačuvano:", items.length, "vesti u localStorage");
  }

  function removeActiveClass() {
    console.log("[removeActiveClass] Uklanjam 'active' sa svih tabova...");
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
  }

  // Funkcija kreiranja kartice sa mogućnošću lazy loading-a
  function createNewsCard(feed, useLazy = false) {
    console.log(`Kreiram karticu: ${feed.title} u kategoriji: ${feed.category}`);
    
    const card = document.createElement('div');
    card.className = "news-card";

    const img = document.createElement('img');
    if (useLazy) {
      img.className = "news-card-image lazy"; 
      img.dataset.src = feed.image || 'https://via.placeholder.com/150';
    } else {
      img.className = "news-card-image";
      img.src = feed.image || 'https://via.placeholder.com/150';
    }
    img.alt = feed.title;

    const contentDiv = document.createElement('div');
    contentDiv.className = "news-card-content";

    const title = document.createElement('h3');
    title.className = "news-title";
    title.textContent = feed.title;

    const source = document.createElement('p');
    source.className = "news-meta";
    const sourceName = feed.source || 'Nepoznat izvor';
    const timeString = feed.date_published ? timeAgo(feed.date_published) : '';
    source.textContent = `${sourceName} • ${timeString}`;

    contentDiv.appendChild(title);
    contentDiv.appendChild(source);
    card.appendChild(img);
    card.appendChild(contentDiv);

    return card;
  }

  function displayAllFeeds() {
    console.log("[displayAllFeeds] Prikaz svih feedova (sortirano)...");
    const container = document.getElementById('news-container');
    if (!container) {
      console.error("[displayAllFeeds] #news-container ne postoji!");
      return;
    }
    container.innerHTML = '';

    const sorted = [...feeds].sort((a, b) => {
      const dateA = new Date(a.date_published).getTime() || 0;
      const dateB = new Date(b.date_published).getTime() || 0;
      return dateB - dateA;
    });

    const uniqueFeedsMap = new Map();
    sorted.forEach(feed => {
      if (!uniqueFeedsMap.has(feed.id)) {
        uniqueFeedsMap.set(feed.id, feed);
      }
    });
    const uniqueFeeds = Array.from(uniqueFeedsMap.values());

    if (uniqueFeeds.length === 0) {
      container.innerHTML = "<p>Nema vesti.</p>";
      return;
    }

    uniqueFeeds.forEach(feed => {
      // Na Home stranici ne koristimo lazy loading
      container.appendChild(createNewsCard(feed, false));
    });
  }

  async function displayNewsByCategory(category) {
    if (category.toLowerCase() === 'lgbt' || category.toLowerCase() === 'lgbt+') {
      category = 'LGBT+';
    }
    
    console.log("[displayNewsByCategory] Kategorija:", category);
    const container = document.getElementById('news-container');
    container.innerHTML = '';

    const cached = localStorage.getItem(`feeds-${category}`);
    let data = [];

    if (cached) {
      console.log(`[displayNewsByCategory] Koristimo keširane feedove za '${category}'...`);
      data = JSON.parse(cached);
    } else {
      console.log(`[displayNewsByCategory] Nema keša, povlačimo /api/feeds-by-category/${category}`);
      try {
        const resp = await fetch(`/api/feeds-by-category/${encodeURIComponent(category)}`);
        if (!resp.ok) throw new Error("Greška u fetch-u /feeds-by-category");
        data = await resp.json();
        console.log(`[displayNewsByCategory] Primljeno:`, data.length, "vesti");
        localStorage.setItem(`feeds-${category}`, JSON.stringify(data));
      } catch (error) {
        console.error("[displayNewsByCategory] Greška:", error);
        container.innerHTML = `<p>Greška pri učitavanju kategorije ${category}.</p>`;
        return;
      }
    }

    const uniqueMap = {};
    data.forEach(item => uniqueMap[item.id] = item);
    data = Object.values(uniqueMap);
    console.log(`[displayNewsByCategory] Nakon uklanjanja duplikata: ${data.length} vesti`);

    const sorted = data.sort((a, b) => {
      const da = new Date(a.date_published).getTime() || 0;
      const db = new Date(b.date_published).getTime() || 0;
      return db - da;
    });

    if (sorted.length === 0) {
      container.innerHTML = "<p>Nema vesti za ovu kategoriju.</p>";
      return;
    }

    sorted.forEach(newsItem => {
      // Koristimo lazy loading za slike u ostalim kategorijama
      const card = createNewsCard(newsItem, true);
      container.appendChild(card);
    });

    // Inicijalizacija IntersectionObserver-a za slike u ovoj kategoriji
    const lazyImages = container.querySelectorAll('img.lazy');
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
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
      lazyImages.forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove("lazy");
      });
    }
  }

  async function main() {
    console.log("[main] Provera localStorage('feeds')...");
    const cachedFeeds = localStorage.getItem('feeds');

    if (cachedFeeds) {
      feeds = JSON.parse(cachedFeeds);
      console.log(`[main] Učitano ${feeds.length} feedova iz localStorage`);
      displayAllFeeds();
    } else {
      console.log("[main] Nema 'feeds' u localStorage, dohvatamo sa servera...");
      const fresh = await fetchAllFeedsFromServer();
      feeds = fresh;
      cacheAllFeedsLocally(fresh);
      displayAllFeeds();
    }

    setInterval(async () => {
      console.log("[main - setInterval] Provera novih feedova na serveru...");
      const fresh = await fetchAllFeedsFromServer();
      if (fresh.length > feeds.length) {
        console.log("[main - setInterval] Ima novih feedova, ažuriramo localStorage i prikaz...");
        feeds = fresh;
        cacheAllFeedsLocally(feeds);
        displayAllFeeds();
      } else {
        console.log("[main - setInterval] Nema novih feedova.");
      }
    }, 500000);
  }

  main().then(() => {
    console.log("[main.then] Inicijalizacija tabova...");

    const homeTab = document.querySelector('[data-tab="home"]');
    const tabsContainer = document.getElementById('tabs-container');

    if (homeTab) {
      homeTab.addEventListener('click', (e) => {
        console.log("[Home Tab] Kliknuto...");
        removeActiveClass();
        e.target.classList.add('active');
        e.target.setAttribute('aria-selected', 'true');
        displayAllFeeds();
      });
    }

    if (tabsContainer) {
      console.log("[main.then] Generišemo tabove za kategorije...");
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
            console.log(`[Category Tab] Klik na '${cat}'`);
            removeActiveClass();
            ev.target.classList.add('active');
            ev.target.setAttribute('aria-selected', 'true');
            displayNewsByCategory(cat);
          });

          tabsContainer.appendChild(btn);
        });
    }
  });

  /************************************************
   * Settings Menu funkcionalnost
   ************************************************/

  // Otvaranje i zatvaranje Settings modala
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

  // Promena teme
  const root = document.documentElement;
  function toggleTheme() {
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = newTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
    localStorage.setItem('theme', newTheme);
  }

  // Promena veličine fonta
  function changeFontSize(delta) {
    const body = document.body;
    const currentSize = parseInt(window.getComputedStyle(body).fontSize);
    const newSize = currentSize + delta;
    if (newSize >= 12 && newSize <= 24) {
      body.style.fontSize = newSize + 'px';
      localStorage.setItem('fontSize', newSize);
    }
  }

  // Event listeneri za Settings meni
  document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    const closeSettingsButton = document.getElementById('close-settings');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const fontIncreaseButton = document.getElementById('font-increase');
    const fontDecreaseButton = document.getElementById('font-decrease');
    const blockSourcesButton = document.getElementById('block-sources');
    const blockCategoriesButton = document.getElementById('block-categories');
    const rearrangeTabsButton = document.getElementById('rearrange-tabs');

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

    if (blockSourcesButton) {
      blockSourcesButton.addEventListener('click', () => {
        closeSettingsModal();
        openBlockSourcesModal();
      });
    }
    if (blockCategoriesButton) {
      blockCategoriesButton.addEventListener('click', () => {
        closeSettingsModal();
        openBlockCategoriesModal();
      });
    }
    if (rearrangeTabsButton) {
      rearrangeTabsButton.addEventListener('click', () => {
        closeSettingsModal();
        openRearrangeModal();
      });
    }

    // Inicijalizacija teme i font veličine
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      document.body.style.fontSize = savedFontSize + 'px';
    }
    const savedTheme = localStorage.getItem('theme') || 'dark';
    root.setAttribute('data-theme', savedTheme);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = savedTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
  });

  console.log('Script loaded');

  // Lazy Loading implementacija
  document.addEventListener("DOMContentLoaded", function() {
    const lazyImages = document.querySelectorAll('img.lazy');

    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
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
      lazyImages.forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove("lazy");
      });
    }
  });
});
