/************************************************
 * scripts.js
 ************************************************/

document.addEventListener("DOMContentLoaded", () => {

  // --------------------------------------------
  // 1) Globalne promenljive
  // --------------------------------------------
  let feeds = [];

  // Samo kategorije BEZ "Neueste" i "Aktuell"
  const baseCategories = [
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

  // --------------------------------------------
  // 2) Pomoćne funkcije
  // --------------------------------------------

  /**
   * Formatiranje vremena ("vor X Minuten/Stunden/Tagen...").
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
   * Fetch svih vesti sa servera (/api/feeds).
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
   * Kreiramo DOM element za jednu vest (news card).
   */
  function createNewsCard(feed, lazy = false) {
    const card = document.createElement('div');
    card.className = "news-card";

    const img = document.createElement('img');
    if (lazy) {
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

    const meta = document.createElement('p');
    meta.className = "news-meta";
    const srcName = feed.source || 'Nepoznat izvor';
    const dateStr = feed.date_published ? timeAgo(feed.date_published) : '';
    meta.textContent = `${srcName} • ${dateStr}`;

    contentDiv.appendChild(title);
    contentDiv.appendChild(meta);
    card.appendChild(img);
    card.appendChild(contentDiv);

    return card;
  }

  /**
   * Postavlja dati tab kao aktivan, skida 'active' sa ostalih tabova.
   */
  function setActiveTab(cat) {
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    const tabBtn = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (tabBtn) {
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Inicijalizuje lazy load u kontejneru.
   */
  function initLazyLoad(container) {
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

  // --------------------------------------------
  // 3) Funkcije za prikaz "Aktuell", "Neueste" i pojedinačne kategorije
  // --------------------------------------------

  /**
   * "Aktuell" -> 50 najnovijih, uvek se fetchuje /api/feeds, bez uklanjanja duplikata.
   */
  async function displayAktuell() {
    console.log("[displayAktuell] fetch /api/feeds...");
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = "";
    const allFeeds = await fetchAllFeedsFromServer();
    if (!allFeeds || allFeeds.length === 0) {
      container.innerHTML = "<p>No news.</p>";
      setActiveTab("Aktuell");
      return;
    }
    // Sort najnovije
    allFeeds.sort((a,b) => new Date(b.date_published) - new Date(a.date_published));
    // Bez uklanjanja duplikata
    const top50 = allFeeds.slice(0, 50);

    top50.forEach(feed => {
      const card = createNewsCard(feed, true);
      container.appendChild(card);
    });
    setActiveTab("Aktuell");

    initLazyLoad(container);
  }

  /**
   * "Neueste" -> primer: dohvata sve vesti, prikazuje ih (možete ubaciti custom logiku)
   */
  async function displayNeueste() {
    console.log("[displayNeueste] dohvat /api/feeds...");
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = "";
    const allFeeds = await fetchAllFeedsFromServer();
    if (!allFeeds || allFeeds.length === 0) {
      container.innerHTML = "<p>No news.</p>";
      setActiveTab("Neueste");
      return;
    }
    // Sort
    allFeeds.sort((a,b) => new Date(b.date_published) - new Date(a.date_published));

    // Ovaj primer prikazuje sve (možete implementirati 4 random ako želite)
    allFeeds.forEach(item => {
      const card = createNewsCard(item, true);
      container.appendChild(card);
    });
    setActiveTab("Neueste");

    initLazyLoad(container);
  }

  /**
   * Prikaz feedova za određenu kategoriju (osim Neueste/Aktuell).
   */
  async function displayCategory(cat) {
    console.log("[displayCategory]", cat);
    const container = document.getElementById('news-container');
    if (!container) return;
    container.innerHTML = "";

    try {
      const resp = await fetch(`/api/feeds-by-category/${encodeURIComponent(cat)}`);
      if (!resp.ok) {
        throw new Error("Greška /feeds-by-category");
      }
      let data = await resp.json();
      if (!data || data.length === 0) {
        container.innerHTML = `<p>No news for ${cat}.</p>`;
        setActiveTab(cat);
        return;
      }
      data.sort((a,b) => new Date(b.date_published) - new Date(a.date_published));
      // Uklanjanje dupl.
      const uniqueMap = {};
      data.forEach(x => uniqueMap[x.id] = x);
      const finalData = Object.values(uniqueMap);

      finalData.forEach(feed => {
        const card = createNewsCard(feed, true);
        container.appendChild(card);
      });
      setActiveTab(cat);

      initLazyLoad(container);
    } catch(err) {
      console.error(err);
      container.innerHTML = `<p>Fehler bei Kategorie: ${cat}</p>`;
      setActiveTab(cat);
    }
  }

  // --------------------------------------------
  // 4) Inicijalizacija tabova i swipe
  // --------------------------------------------
  function initTabs() {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;

    // Rucno kreiramo 2 tab-a (Neueste, Aktuell)
    const neuesteBtn = document.createElement('button');
    neuesteBtn.classList.add('tab');
    neuesteBtn.setAttribute('data-tab', 'Neueste');
    neuesteBtn.textContent = 'Neueste';
    neuesteBtn.addEventListener('click', () => {
      displayNeueste();
    });
    tabsContainer.appendChild(neuesteBtn);

    const aktuellBtn = document.createElement('button');
    aktuellBtn.classList.add('tab');
    aktuellBtn.setAttribute('data-tab', 'Aktuell');
    aktuellBtn.textContent = 'Aktuell';
    aktuellBtn.addEventListener('click', () => {
      displayAktuell();
    });
    tabsContainer.appendChild(aktuellBtn);

    // Ostale kategorije
    baseCategories.forEach(cat => {
      const btn = document.createElement('button');
      btn.classList.add('tab');
      btn.setAttribute('data-tab', cat);
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        displayCategory(cat);
      });
      tabsContainer.appendChild(btn);
    });
  }

  function initSwipe() {
    const swipeContainer = document.getElementById('news-container');
    let startX = 0, endX = 0;
    const threshold = 50;

    // Redosled za swipe
    const swipeOrder = ["Neueste","Aktuell", ...baseCategories];

    function handleGesture() {
      if (endX < startX - threshold) {
        showNextCat();
      } else if (endX > startX + threshold) {
        showPrevCat();
      }
    }

    function showNextCat() {
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let idx = swipeOrder.indexOf(currentCat);
      if (idx < 0) idx = 0;
      if (idx < swipeOrder.length - 1) {
        idx++;
        const nextCat = swipeOrder[idx];
        const nextTab = document.querySelector(`.tab[data-tab="${nextCat}"]`);
        if (nextTab) {
          nextTab.click();
          setTimeout(() => {
            nextTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
          }, 100);
        }
      }
    }

    function showPrevCat() {
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let idx = swipeOrder.indexOf(currentCat);
      if (idx < 0) idx = 0;
      if (idx > 0) {
        idx--;
        const prevCat = swipeOrder[idx];
        const prevTab = document.querySelector(`.tab[data-tab="${prevCat}"]`);
        if (prevTab) {
          prevTab.click();
          setTimeout(() => {
            prevTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
          }, 100);
        }
      }
    }

    if (swipeContainer) {
      swipeContainer.addEventListener('touchstart', e => {
        startX = e.changedTouches[0].screenX;
      });
      swipeContainer.addEventListener('touchend', e => {
        endX = e.changedTouches[0].screenX;
        handleGesture();
      });
    }
  }

  // --------------------------------------------
  // 5) Settings Meni (tema, font-size itd.)
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

  // Ovaj listener za DOMContentLoaded je pored glavnog, pa pazimo da se ne sudare
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
        // ... (Implementacija openBlockSourcesModal() ako postoji)
      });
    }
    if (blockCategoriesButton) {
      blockCategoriesButton.addEventListener('click', () => {
        closeSettingsModal();
        // ... (Implementacija openBlockCategoriesModal() ako postoji)
      });
    }
    if (rearrangeTabsButton) {
      rearrangeTabsButton.addEventListener('click', () => {
        closeSettingsModal();
        // ... (Implementacija openRearrangeModal() ako postoji)
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

  // --------------------------------------------
  // 6) Glavni tok
  // --------------------------------------------
  console.log("[scripts.js] Inicijalizacija...");

  // Inicijalizujemo tabove (Neueste, Aktuell, i ostale) i swipe
  initTabs();
  initSwipe();

  // Po defaultu -> Neueste
  displayNeueste();

  // Lazy load fallback (ako je već nema)
  document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById('news-container');
    if (!container) return;
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
  });
});
