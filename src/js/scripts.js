/************************************************
 * scripts.js
 ************************************************/

document.addEventListener("DOMContentLoaded", () => {
  // Globalna promenljiva
  let feeds = [];
  let currentIndex = 0; // Koristi se u displayAllFeeds(), ali nije promenjen za swipe kategorija
  const itemsPerPage = 5; // Broj vesti prikazanih po jednom "listanju" (ne koristi se direktno za kategorije)

  // Uključujemo i "Aktuell" u niz kategorija, da bi swipe i tabs radili ispravno
  const categories = [
    "Aktuell",
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

  /**
   * Pomoćna funkcija za formatiranje vremena ("vor X Tagen...")
   */
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

  /**
   * Dohvata sve feed-ove sa servera ("/api/feeds")
   */
  async function fetchAllFeedsFromServer() {
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

  /**
   * Čuvanje feedova u localStorage
   */
  function cacheAllFeedsLocally(items) {
    localStorage.setItem('feeds', JSON.stringify(items));
    console.log("[cacheAllFeedsLocally] Sačuvano:", items.length, "vesti u localStorage");
  }

  /**
   * Uklanja 'active' klasu sa svih tabova
   */
  function removeActiveClass() {
    console.log("[removeActiveClass] Uklanjam 'active' sa svih tabova...");
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
  }

  /**
   * Kreira DOM element za jednu vest
   */
  function createNewsCard(feed, useLazy = false) {
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

  /**
   * Osvetljava (pravi 'active') tab prema datoj kategoriji
   */
  function setActiveTab(cat) {
    removeActiveClass();
    const tabBtn = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (tabBtn) {
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Prikazuje feedove u #news-container (sortirano)
   */
  function displayAllFeeds() {
    console.log("[displayAllFeeds] Prikaz svih feedova...");
    const container = document.getElementById('news-container');
    if (!container) {
      console.error("[displayAllFeeds] #news-container ne postoji!");
      return;
    }
    container.innerHTML = '';

    // Sortiramo feedove najnovije prvo
    const sorted = [...feeds].sort((a, b) => {
      const dateA = new Date(a.date_published).getTime() || 0;
      const dateB = new Date(b.date_published).getTime() || 0;
      return dateB - dateA;
    });

    // Uklanjanje duplikata
    const uniqueFeedsMap = new Map();
    sorted.forEach(feed => {
      if (!uniqueFeedsMap.has(feed.id)) {
        uniqueFeedsMap.set(feed.id, feed);
      }
    });
    feeds = Array.from(uniqueFeedsMap.values());

    if (feeds.length === 0) {
      container.innerHTML = "<p>No news.</p>";
      return;
    }

    // Prikaz
    feeds.forEach(feed => {
      const card = createNewsCard(feed, true);
      container.appendChild(card);
    });

    // Lazy load
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

  /**
   * Prikaz feedova iz date kategorije (sortirano, lazy load)
   * Ako cat == "Aktuell", prikaz 50 najnovijih (bez uklanjanja dupl.)
   */
  async function displayNewsByCategory(category) {
    const container = document.getElementById('news-container');
    container.innerHTML = '';

    // Poseban slučaj: "Aktuell" -> prikaz 50 najnovijih
    // => fetchAllFeedsFromServer, NE koristimo keš
    if (category === "Aktuell") {
      console.log("[displayNewsByCategory] Kategorija je 'Aktuell' -> 50 najnovijih...");
      const allFeedsServer = await fetchAllFeedsFromServer();
      if (allFeedsServer.length === 0) {
        container.innerHTML = "<p>No news.</p>";
        return;
      }
      // ne uklanjamo duplikate, samo sort
      allFeedsServer.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));

      allFeedsServer.slice(0, 50).forEach(feed => {
        const card = createNewsCard(feed, true);
        container.appendChild(card);
      });
      setActiveTab("Aktuell");

      // Lazy load
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
      return;
    }

    // Za ostale kategorije (osim "Aktuell")
    console.log("[displayNewsByCategory] Kategorija:", category);
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

    // sortiramo
    data.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));

    if (data.length === 0) {
      container.innerHTML = "<p>Nema vesti za ovu kategoriju.</p>";
      return;
    }

    // Prikaz
    data.forEach(newsItem => {
      const card = createNewsCard(newsItem, true);
      container.appendChild(card);
    });

    setActiveTab(category);

    // Lazy load
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

  /**
   * Pokreće se pri učitavanju: ako imamo 'feeds' u localStorage, prikažemo,
   * inače fetch sa servera, pa prikaz
   */
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

    // Periodično osvežavanje
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

  // Pozivamo main
  main().then(() => {
    console.log("[main.then] Inicijalizacija tabova...");

    // Ako postoji "home" tab, tretiramo ga kao "Aktuell" ili uklonimo?
    // Možemo ga tretirati kao "Aktuell" ako želimo.
    // Ovde samo primer, ako hoćemo "Aktuell" da bude default:
    const aktuellTab = document.querySelector('[data-tab="home"]'); 
    // Ako zapravo želimo da data-tab="Aktuell" postoji u HTML
    // onda bi radilo slično, ali pošto je stari kod, prilagođavamo se.
    if (aktuellTab) {
      aktuellTab.addEventListener('click', (e) => {
        console.log("[Aktuell Tab] Kliknuto...");
        removeActiveClass();
        e.target.classList.add('active');
        e.target.setAttribute('aria-selected', 'true');
        displayNewsByCategory("Aktuell"); 
      });
    }

    const tabsContainer = document.getElementById('tabs-container');
    if (tabsContainer) {
      console.log("[main.then] Generišemo tabove za kategorije...");
      // skipList ako ne želimo "Aktuell" duplo i sl.
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

    // Swipe detekcija
    const swipeContainer = document.getElementById('news-container');
    let touchstartX = 0;
    let touchendX = 0;
    const swipeThreshold = 50;

    function handleGesture() {
      if (touchendX < touchstartX - swipeThreshold) {
        showNextCategory();
      }
      if (touchendX > touchstartX + swipeThreshold) {
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

    function showNextCategory() {
      // Pronađi trenutni aktivni tab
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let currentIndex = categories.indexOf(currentCat);
      // Ako je poslednja, ostani
      if (currentIndex < categories.length - 1) {
        currentIndex++;
        const nextCat = categories[currentIndex];
        const nextTab = document.querySelector(`.tab[data-tab="${nextCat}"]`);
        if (nextTab) {
          nextTab.click();
          setTimeout(() => {
            // Tabs container pomeri se da se vidi nextTab
            nextTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
          }, 100);
        }
      }
    }

    function showPreviousCategory() {
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let currentIndex = categories.indexOf(currentCat);
      if (currentIndex > 0) {
        currentIndex--;
        const prevCat = categories[currentIndex];
        const prevTab = document.querySelector(`.tab[data-tab="${prevCat}"]`);
        if (prevTab) {
          prevTab.click();
          setTimeout(() => {
            prevTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
          }, 100);
        }
      }
    }
  });

  /************************************************
   * Settings Menu funkcionalnost
   ************************************************/
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

  function changeFontSize(delta) {
    const body = document.body;
    const currentSize = parseInt(window.getComputedStyle(body).fontSize);
    const newSize = currentSize + delta;
    if (newSize >= 12 && newSize <= 24) {
      body.style.fontSize = newSize + 'px';
      localStorage.setItem('fontSize', newSize);
    }
  }

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
      });
    }
    if (blockCategoriesButton) {
      blockCategoriesButton.addEventListener('click', () => {
        closeSettingsModal();
      });
    }
    if (rearrangeTabsButton) {
      rearrangeTabsButton.addEventListener('click', () => {
        closeSettingsModal();
      });
    }

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

  // Lazy loading fallback
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
