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
 * Funkcija za zatvaranje tutorial overlaya i setovanje
 * localStorage flag-a da se ne prikazuje ponovo.
 */
function closeTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    localStorage.setItem('tutorialShown', 'true');
  }
}

/**
 * Funkcija koja čuva aktivni tab i scroll poziciju u LocalStorage,
 * kako bi ih obnovili kasnije.
 */
function saveAppState(currentTab) {
  const scrollPos = window.scrollY || 0;
  localStorage.setItem('activeTab', currentTab);
  localStorage.setItem('scrollPosition', scrollPos);
}

/**
 * Funkcija koja vraća aplikaciju na prethodno aktivni tab i scroll poziciju.
 */
function restoreAppState() {
  const savedTab = localStorage.getItem('activeTab');
  const savedPosition = localStorage.getItem('scrollPosition');
  if (savedTab) {
    const tabButton = document.querySelector(`.tab[data-tab="${savedTab}"]`);
    if (tabButton) {
      tabButton.click();
    }
  } else {
    // Ako nema sacuvanog taba, kliknemo na Neueste
    const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
    if (neuesteTab) {
      neuesteTab.click();
    }
  }
  if (savedPosition) {
    setTimeout(() => window.scrollTo(0, savedPosition), 100);
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
 * Funkcija koja kreira jednu "news card" za prikaz vesti, 
 * skraćuje naslov na max 3 reda, bez hifenacije.
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

  // Naslov skraćen na 3 linije, bez hifenacije
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
 * Funkcija koja uklanja klasu 'active' sa svih tabova.
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
 * Funkcija koja prikazuje zeleni okvir oko aktivnog taba.
 */
function showGreenRectangle() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.classList.add('active-green');
  }
}

/**
 * Funkcija koja uklanja zeleni okvir (koristi se samo na početku).
 */
function hideGreenRectangle() {
  const homeTab = document.querySelector('.tab[data-tab="Neueste"]');
  if (homeTab) {
    homeTab.classList.remove('active-green');
  }
}

/**
 * Funkcija za ažuriranje naziva prikazane kategorije (category indicator).
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
 * Funkcija koja inicijalizuje lazy loading za slike.
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
 * Funkcija koja dohvata 50 najnovijih feed-ova sa servera ("/api/feeds") i vraća ih.
 */
async function fetchAllFeedsFromServer() {
  try {
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
    const data = await response.json();
    // Sortiranje i ograničavanje
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    return data.slice(0, 50);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Funkcija koja dohvata 50 najnovijih feed-ova za određenu kategoriju
 * ("/api/feeds-by-category/<cat>") i vraća ih.
 */
async function fetchCategoryFeeds(category) {
  // Zamenjujemo "Ohne Kategorie" -> "Uncategorized" za fetch
  const catForUrl = (category === "Ohne Kategorie") ? "Uncategorized" : category;
  try {
    const url = `/api/feeds-by-category/${encodeURIComponent(catForUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Neuspešno preuzimanje ${url}`);
    let data = await response.json();
    // Sortiranje i ograničavanje
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    return data.slice(0, 50);
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Funkcija koja prikazuje listu vesti i ažurira indikator kategorije.
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
async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let cached = localStorage.getItem('feeds-Aktuell');
  let allFeeds = [];
  if (cached) {
    allFeeds = JSON.parse(cached);
  } else {
    // Fetch sa servera i čuvamo
    allFeeds = await fetchAllFeedsFromServer();
    localStorage.setItem('feeds-Aktuell', JSON.stringify(allFeeds));
  }
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * Funkcija koja prikazuje "Neueste":
 *  - Prvih 4 vesti iz "Aktuell"
 *  - Zatim po 4 iz svake druge kategorije.
 */
async function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '';

  // 1) Uzmemo prvih 4 iz Aktuell
  let aktuellFeeds = JSON.parse(localStorage.getItem('feeds-Aktuell') || '[]');
  if (aktuellFeeds.length === 0) {
    // Ako nije keširano, fetchujemo
    aktuellFeeds = await fetchAllFeedsFromServer();
    localStorage.setItem('feeds-Aktuell', JSON.stringify(aktuellFeeds));
  }
  aktuellFeeds.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
  const top4Aktuell = aktuellFeeds.slice(0, 4);

  // Ubacimo heading za Aktuell (4px margin-bottom)
  if (top4Aktuell.length > 0) {
    const headingAkt = document.createElement('h2');
    headingAkt.textContent = "Aktuell";
    headingAkt.style.backgroundColor = "#000";
    headingAkt.style.color = "var(--primary-color)";
    headingAkt.style.padding = "4px";
    headingAkt.style.marginTop = "0.4rem";
    headingAkt.style.marginBottom = "4px";
    headingAkt.style.fontSize = "0.9em";
    headingAkt.style.textAlign = "center";
    container.appendChild(headingAkt);

    top4Aktuell.forEach(feed => {
      const card = createNewsCard(feed);
      container.appendChild(card);
    });
  }

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
    const localKey = `feeds-${cat}`;
    let catFeeds = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (catFeeds.length === 0) {
      catFeeds = await fetchCategoryFeeds(cat);
      localStorage.setItem(localKey, JSON.stringify(catFeeds));
    }
    return { cat, feeds: catFeeds };
  });

  const results = await Promise.all(fetchPromises);

  // Za svaku kategoriju prikazujemo prvih 4 vesti
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
    heading.style.fontSize = "0.9em";
    heading.style.textAlign = "center";
    container.appendChild(heading);

    top4.forEach(feed => {
      const card = createNewsCard(feed);
      container.appendChild(card);
    });
  });

  updateCategoryIndicator("Neueste");
  initializeLazyLoading();
}

/**
 * Funkcija koja prikazuje vesti za određenu kategoriju.
 * Ako kategorija ne postoji, prikazuje "Aktuell".
 */
async function displayNewsByCategory(category) {
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

  const localKey = `feeds-${category}`;
  let catFeeds = JSON.parse(localStorage.getItem(localKey) || '[]');

  if (catFeeds.length === 0) {
    catFeeds = await fetchCategoryFeeds(category);
    localStorage.setItem(localKey, JSON.stringify(catFeeds));
  }
  displayFeedsList(catFeeds, category);
}

/**
 * Funkcija za swipe (left/right) navigaciju kroz kategorije.
 * Tabs container treba da isprati aktivnu kategoriju.
 */
function initSwipe() {
  let firstSwipeOccurred = false;
  const swipeContainer = document.getElementById('news-container');
  let touchstartX = 0;
  let touchendX = 0;
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

  function showNextCategory() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let currentIdx = categories.indexOf(currentCat);
    if (currentIdx < 0) currentIdx = 0;

    if (currentIdx < categories.length - 1) {
      currentIdx++;
      const nextCat = categories[currentIdx];
      const nextTab = document.querySelector(`.tab[data-tab="${nextCat}"]`);
      if (nextTab) {
        nextTab.click(); // menja i active tab i prikaz
      }
    }
  }

  function showPreviousCategory() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let currentIdx = categories.indexOf(currentCat);
    if (currentIdx < 0) currentIdx = 0;

    if (currentIdx > 0) {
      currentIdx--;
      const prevCat = categories[currentIdx];
      const prevTab = document.querySelector(`.tab[data-tab="${prevCat}"]`);
      if (prevTab) {
        prevTab.click(); // menja i active tab i prikaz
      }
    }
  }
}

/**
 * Funkcija za inicijalizaciju podešavanja (tema, font, itd.).
 * Ograničavamo font-size samo na news-card (pomoću varijable --card-font-size).
 */
function initSettings() {
  // Učitavamo iz localStorage, ili default 16
  let currentCardFontSize = parseInt(localStorage.getItem('cardFontSize') || '16');

  /**
   * Primeni veličinu fonta na .news-card preko CSS varijable.
   */
  function applyCardFontSize(size) {
    const root = document.documentElement;
    root.style.setProperty('--card-font-size', size + 'px');
  }

  // Odmah primenimo vrednost
  applyCardFontSize(currentCardFontSize);

  function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = newTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
  }

  /**
   * Menja veličinu fonta za kartice.
   */
  function changeFontSize(delta) {
    currentCardFontSize += delta;
    if (currentCardFontSize < 12) currentCardFontSize = 12;
    if (currentCardFontSize > 28) currentCardFontSize = 28;
    localStorage.setItem('cardFontSize', currentCardFontSize.toString());
    applyCardFontSize(currentCardFontSize);
  }

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

  // Učitaj prethodno sačuvana podešavanja teme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = savedTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
  }
}

/**
 * Glavna funkcija koja se poziva kada je DOM spreman:
 * - Inicijalizuje overlay tutorial, tabove, swipe, settings...
 */
document.addEventListener("DOMContentLoaded", () => {
  // Tutorial overlay
  checkAndShowTutorial();
  const closeTutorialBtn = document.getElementById('close-tutorial');
  if (closeTutorialBtn) {
    closeTutorialBtn.addEventListener('click', closeTutorialOverlay);
  }

  // Sakrij zeleni okvir za prvi tab
  hideGreenRectangle();

  // Inicijalizuj podešavanja (tema, font, itd.)
  initSettings();

  // Swipe logika
  initSwipe();

  // Kategorije
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
      saveAppState("Neueste");
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
      saveAppState("Aktuell");
    });
  }

  // Generišemo ostale kategorije (tabove) posle Neueste i Aktuell
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
          saveAppState(cat);
        });

        tabsContainer.appendChild(btn);
      });
  }

  // Ako postoji sacuvan state, vratimo ga. U suprotnom: Neueste
  restoreAppState();
});
