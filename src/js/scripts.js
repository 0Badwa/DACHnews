/************************************************
 * scripts.js
 ************************************************/

/**
 * Funkcija za prikazivanje modernog tutorial overlaya
 * samo pri prvom pokretanju aplikacije.
 */
function checkAndShowTutorial() {
  const tutorialShown = localStorage.getItem('tutorialShown');
  const overlay = document.getElementById('tutorial-overlay');
  if (!tutorialShown && overlay) {
    overlay.style.display = 'flex';
  }
}

/**
 * Funkcija za zatvaranje tutorial overlaya.
 */
function closeTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    localStorage.setItem('tutorialShown', 'true');
  }
}

/**
 * Funkcija za čuvanje samo aktivnog taba (bez scroll pozicije).
 * Ako nema upisa, default je "Neueste" pri novom otvaranju.
 */
function saveActiveTab(currentTab) {
  localStorage.setItem('activeTab', currentTab);
}

/**
 * Funkcija za vraćanje na prethodni aktivni tab 
 * (ako ga ima u localStorage). Ako ne, ide na Neueste.
 * Posle REFRESH u istoj kategoriji, ali vrh stranice.
 */
function restoreActiveTab() {
  const savedTab = localStorage.getItem('activeTab');
  if (savedTab) {
    const tabButton = document.querySelector(`.tab[data-tab="${savedTab}"]`);
    if (tabButton) {
      tabButton.click();
      window.scrollTo(0,0); // Vrati na vrh
      return;
    }
  }
  // Ako nema sacuvanog taba ili nije pronađen
  const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
  if (neuesteTab) {
    neuesteTab.click();
    window.scrollTo(0,0); 
  }
}

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
 * Kreira "news card" za prikaz vesti, skraćuje naslov na max 3 reda, bez hifenacije.
 */
function createNewsCard(feed) {
  const card = document.createElement('div');
  card.className = "news-card";

  // Slika 80x80
  const img = document.createElement('img');
  img.className = "news-card-image lazy";
  img.dataset.src = feed.image || 'https://via.placeholder.com/80';
  img.alt = feed.title || 'No title';

  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  const title = document.createElement('h3');
  title.className = "news-title truncated-title";
  title.textContent = feed.title || 'No title';

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
 * Uklanja klasu 'active' sa svih tabova.
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
 * Prikazuje zeleni okvir oko aktivnog taba.
 */
function showGreenRectangle() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.classList.add('active-green');
  }
}

/**
 * Sakriva zeleni okvir (koristi se na početku).
 */
function hideGreenRectangle() {
  const homeTab = document.querySelector('.tab[data-tab="Neueste"]');
  if (homeTab) {
    homeTab.classList.remove('active-green');
  }
}

/**
 * Ažurira kategoriju (category indicator).
 */
function updateCategoryIndicator(categoryName) {
  const categoryIndicator = document.querySelector('.category-indicator');
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

/**
 * Lazy load inicijalizacija.
 */
function initializeLazyLoading() {
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
    // Fallback
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove("lazy");
    });
  }
}

/**
 * Dohvata 50 najnovijih feed-ova ("/api/feeds").
 */
async function fetchAllFeedsFromServer() {
  try {
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
    const data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    return data.slice(0, 50);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Dohvata 50 najnovijih feed-ova za određenu kategoriju ("/api/feeds-by-category").
 */
async function fetchCategoryFeeds(category) {
  const catForUrl = (category === "Ohne Kategorie") ? "Uncategorized" : category;
  try {
    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Neuspešno preuzimanje ${url}`);
    let data = await response.json();
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    return data.slice(0, 50);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Prikazuje listu vesti i ažurira indikator kategorije.
 */
function displayFeedsList(feedsList, categoryName) {
  const container = document.getElementById('news-container');
  if (!container) return;

  container.innerHTML = '';
  if (!feedsList || feedsList.length === 0) {
    container.innerHTML = `<p>Nema vesti za kategoriju: ${categoryName}</p>`;
    updateCategoryIndicator(categoryName);
    return;
  }

  feedsList.forEach(feed => {
    const card = createNewsCard(feed);
    container.appendChild(card);
  });
  updateCategoryIndicator(categoryName);
  initializeLazyLoading();
}

/**
 * "Aktuell" feed (sve vesti).
 */
async function displayAktuellFeeds() {
  let cached = localStorage.getItem('feeds-Aktuell');
  let allFeeds = [];
  if (cached) {
    allFeeds = JSON.parse(cached);
  } else {
    allFeeds = await fetchAllFeedsFromServer();
    localStorage.setItem('feeds-Aktuell', JSON.stringify(allFeeds));
  }
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * "Neueste" - prvih 4 iz "Aktuell", pa po 4 iz svake druge kategorije.
 * Bez dodatnog naslova za te 4 iz Aktuell.
 */
async function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '';

  // 1) Uzmemo prvih 4 iz Aktuell
  let aktuellFeeds = JSON.parse(localStorage.getItem('feeds-Aktuell') || '[]');
  if (aktuellFeeds.length === 0) {
    aktuellFeeds = await fetchAllFeedsFromServer();
    localStorage.setItem('feeds-Aktuell', JSON.stringify(aktuellFeeds));
  }
  aktuellFeeds.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
  const top4Aktuell = aktuellFeeds.slice(0, 4);

  top4Aktuell.forEach(feed => {
    const card = createNewsCard(feed);
    container.appendChild(card);
  });

  // 2) Ostale kategorije
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

  const fetchPromises = categories.map(async (cat) => {
    const localKey = `feeds-${cat}`;
    let catFeeds = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (catFeeds.length === 0) {
      catFeeds = await fetchCategoryFeeds(cat);
      localStorage.setItem(localKey, JSON.stringify(catFeeds));
    }
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

  // Menjamo category indicator iz "Neueste" u "Aktuell"
  updateCategoryIndicator("Aktuell");
  initializeLazyLoading();
}

/**
 * Vesti za određenu kategoriju. Ako nije validna, ide "Aktuell".
 */
async function displayNewsByCategory(category) {
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
  if (!validCategories.includes(category)) {
    displayAktuellFeeds();
    return;
  }

  const localKey = `feeds-${category}`;
  let catFeeds = JSON.parse(localStorage.getItem(localKey) || '[]');
  if (catFeeds.length === 0) {
    catFeeds = await fetchCategoryFeeds(category);
    localStorage.setItem(localKey, JSON.stringify(catFeeds));
  }
  displayFeedsList(catFeeds, category);
}

/**
 * Swipe left/right za kategorije. 
 * Ne reaguje na gore/dole (vertical scroll).
 * Tabs se pomera i postaje aktivan, 
 * ali samo ako je horizontalni pomak veći od verticalnog.
 */
function initSwipe() {
  let firstSwipeOccurred = false;
  const swipeContainer = document.getElementById('news-container');
  let touchstartX = 0, touchstartY = 0;
  let touchendX = 0,   touchendY = 0;
  const swipeThreshold = 50;

  // pun redosled: Neueste -> Aktuell -> ...categories
  const categories = [
    "Neueste",
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
    "Ohne Kategorie"
  ];

  if (swipeContainer) {
    swipeContainer.addEventListener('touchstart', e => {
      touchstartX = e.changedTouches[0].screenX;
      touchstartY = e.changedTouches[0].screenY;
    });

    swipeContainer.addEventListener('touchend', e => {
      touchendX = e.changedTouches[0].screenX;
      touchendY = e.changedTouches[0].screenY;

      // Proveravamo horizontalno vs verticalno pomeranje
      const deltaX = touchendX - touchstartX;
      const deltaY = touchendY - touchstartY;
      // Ako je horizontalni pomak značajno veći od vertikalnog -> prelaz
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (!firstSwipeOccurred) {
          firstSwipeOccurred = true;
          showGreenRectangle();
        }
        if (deltaX < 0) {
          showNextCategory(categories);
        } else {
          showPreviousCategory(categories);
        }
      }
    });
  }

  function showNextCategory(catList) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let currentIdx = catList.indexOf(currentCat);
    if (currentIdx < 0) currentIdx = 0;

    if (currentIdx < catList.length - 1) {
      currentIdx++;
      const nextCat = catList[currentIdx];
      const nextTab = document.querySelector(`.tab[data-tab="${nextCat}"]`);
      if (nextTab) {
        nextTab.click();
        setTimeout(() => {
          nextTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }, 150);
      }
    }
  }

  function showPreviousCategory(catList) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let currentIdx = catList.indexOf(currentCat);
    if (currentIdx < 0) currentIdx = 0;

    if (currentIdx > 0) {
      currentIdx--;
      const prevCat = catList[currentIdx];
      const prevTab = document.querySelector(`.tab[data-tab="${prevCat}"]`);
      if (prevTab) {
        prevTab.click();
        setTimeout(() => {
          prevTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }, 150);
      }
    }
  }
}

/**
 * Inicijalizacija setovanja (tema, font, itd.).
 * + i - sada reaguju i menjaju varijablu --card-font-size.
 */
function initSettings() {
  // Učitavamo iz localStorage ili default 16
  let currentCardFontSize = parseInt(localStorage.getItem('cardFontSize') || '16');

  function applyCardFontSize(size) {
    document.documentElement.style.setProperty('--card-font-size', size + 'px');
  }

  // Odmah primenimo
  applyCardFontSize(currentCardFontSize);

  // Menjamo temu
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = (newTheme === 'light') ? 'Dark Modus' : 'Licht Modus';
    }
  }

  // Menjamo font (po 2px)
  function changeFontSize(delta) {
    currentCardFontSize += delta;
    if (currentCardFontSize < 10) currentCardFontSize = 10;
    if (currentCardFontSize > 48) currentCardFontSize = 48;
    localStorage.setItem('cardFontSize', currentCardFontSize.toString());
    applyCardFontSize(currentCardFontSize);
    console.log("Font size changed to:", currentCardFontSize); // debug
  }

  // Event listeneri
  const menuButton = document.getElementById('menu-button');
  const closeSettingsButton = document.getElementById('close-settings');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const fontIncreaseButton = document.getElementById('font-increase');
  const fontDecreaseButton = document.getElementById('font-decrease');

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
    fontIncreaseButton.addEventListener('click', () => changeFontSize(2));
  }
  if (fontDecreaseButton) {
    fontDecreaseButton.addEventListener('click', () => changeFontSize(-2));
  }

  // Učitaj temu
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = (savedTheme === 'light') ? 'Dark Modus' : 'Licht Modus';
  }
}

/**
 * Glavna funkcija kada je DOM spreman.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Tutorijal
  checkAndShowTutorial();
  const closeTutorialBtn = document.getElementById('close-tutorial');
  if (closeTutorialBtn) {
    closeTutorialBtn.addEventListener('click', closeTutorialOverlay);
  }

  // Zeleni okvir na startu sakrijemo
  hideGreenRectangle();

  // Podesavanja
  initSettings();

  // Swipe
  initSwipe();

  // Definisemo ostale kategorije
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

  const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
  const aktuellTab = document.querySelector('.tab[data-tab="Aktuell"]');
  const tabsContainer = document.getElementById('tabs-container');

  // Klik: Neueste
  if (neuesteTab) {
    neuesteTab.addEventListener('click', async (e) => {
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      await displayNeuesteFeeds();
      showGreenRectangle();
      saveActiveTab("Neueste");
      window.scrollTo(0,0);
    });
  }

  // Klik: Aktuell
  if (aktuellTab) {
    aktuellTab.addEventListener('click', async (e) => {
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      await displayAktuellFeeds();
      showGreenRectangle();
      saveActiveTab("Aktuell");
      window.scrollTo(0,0);
    });
  }

  // Generisemo ostale tabove
  if (tabsContainer) {
    const skipList = ["Neueste", "Aktuell"];
    categories
      .filter(cat => !skipList.includes(cat))
      .forEach(cat => {
        const btn = document.createElement('button');
        btn.classList.add('tab');
        btn.setAttribute('data-tab', cat);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.textContent = cat;

        btn.addEventListener('click', async (ev) => {
          removeActiveClass();
          ev.target.classList.add('active');
          ev.target.setAttribute('aria-selected', 'true');
          showGreenRectangle();
          await displayNewsByCategory(cat);
          saveActiveTab(cat);
          window.scrollTo(0,0);
        });

        tabsContainer.appendChild(btn);
      });
  }

  // Pri prvom otvaranju => uvek Neueste,
  // Ako refresh, vrati se na sacuvani tab
  restoreActiveTab();
});
