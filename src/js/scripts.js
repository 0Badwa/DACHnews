/************************************************
 * scripts.js
 ************************************************/

/**
 * Funkcija za prikazivanje kratkog overlay tutorijala
 * samo pri prvom pokretanju aplikacije (možete prevući levo/desno).
 */
function checkAndShowTutorial() {
  const tutorialShown = localStorage.getItem('tutorialShown');
  if (!tutorialShown) {
    alert("Willkommen! Wischen Sie nach links/rechts, um Kategorien zu wechseln.");
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
 * Funkcija koja kreira jednu "news card" za prikaz vesti.
 */
function createNewsCard(feed) {
  const card = document.createElement('div');
  card.className = "news-card";

  const img = document.createElement('img');
  img.className = "news-card-image lazy";
  img.dataset.src = feed.image || 'https://via.placeholder.com/150';
  img.alt = feed.title || 'No title';

  const contentDiv = document.createElement('div');
  contentDiv.className = "news-card-content";

  const title = document.createElement('h3');
  title.className = "news-title";
  title.textContent = feed.title || 'No title';

  const meta = document.createElement('p');
  meta.className = "news-meta";

  const sourceSpan = document.createElement('span');
  sourceSpan.className = "source";
  const sourceName = feed.source || 'Nepoznat izvor';
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
 * Funkcija koja dohvata sve feed-ove sa servera ("/api/feeds")
 * i ograničava na 50 novijih, pa vraća rezultat.
 */
async function fetchAllFeedsFromServer() {
  try {
    const response = await fetch("/api/feeds");
    if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
    const data = await response.json();

    // Sortiramo i uzimamo najnovijih 50
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    return data.slice(0, 50);

  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Funkcija koja dohvata feed za datu kategoriju ("/api/feeds-by-category"),
 * sortira i ograničava na 50 najnovijih, pa vraća rezultat.
 */
async function fetchCategoryFeeds(category) {
  try {
    const url = `/api/feeds-by-category/${encodeURIComponent(category)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Neuspešno preuzimanje ${url}`);
    let data = await response.json();

    // Sortiramo i uzimamo najnovijih 50
    data.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    data = data.slice(0, 50);
    return data;

  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Funkcija koja prikazuje listu vesti (feed) u news-container divu,
 * i ažurira category indicator.
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

  // Sortiramo od najnovijih (ako nije već sortirano)
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
 * Funkcija koja prikazuje sve feed-ove za "Aktuell" tab.
 * Učitava iz localStorage ako postoji, inače fetchuje, pa kešira.
 */
async function displayAktuellFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  let cached = localStorage.getItem('feeds-Aktuell');
  let allFeeds = [];

  if (cached) {
    allFeeds = JSON.parse(cached);
  } else {
    // Fetch sa servera pa upis u localStorage
    allFeeds = await fetchAllFeedsFromServer();
    localStorage.setItem('feeds-Aktuell', JSON.stringify(allFeeds));
  }

  if (!allFeeds || allFeeds.length === 0) {
    container.innerHTML = '<p>No news.</p>';
    updateCategoryIndicator("Aktuell");
    return;
  }
  displayFeedsList(allFeeds, "Aktuell");
}

/**
 * Funkcija za prikaz "Neueste" taba:
 * Prikazuje po 4 najnovije vesti iz svake kategorije
 * (osim same "Aktuell" jer je to posebna kategorija).
 */
function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '';

  // Kategorije u aplikaciji
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

  // Za svaku kategoriju iz localStorage uzmemo 4 najnovije
  categories.forEach(cat => {
    const localKey = `feeds-${cat}`;
    let catFeeds = JSON.parse(localStorage.getItem(localKey)) || [];

    // Sortiramo da budemo sigurni
    catFeeds.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());

    const top4 = catFeeds.slice(0, 4);
    if (top4.length > 0) {
      const heading = document.createElement('h2');
      heading.textContent = cat; 
      container.appendChild(heading);

      top4.forEach(feed => {
        const card = createNewsCard(feed);
        container.appendChild(card);
      });
    }
  });

  updateCategoryIndicator("Neueste");
  initializeLazyLoading();
}

/**
 * Funkcija koja prikazuje vesti za određenu kategoriju.
 * Ako kategorija ne postoji, prebacuje na "Aktuell".
 */
async function displayNewsByCategory(category) {
  const container = document.getElementById('news-container');
  if (!container) return;

  // Naša glavna lista kategorija
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

  // Ako kategorija ne postoji, idemo na "Aktuell"
  if (!categories.includes(category)) {
    displayAktuellFeeds();
    return;
  }

  const localKey = `feeds-${category}`;
  let local = localStorage.getItem(localKey);
  let catFeeds = [];

  if (local) {
    catFeeds = JSON.parse(local);
  } else {
    catFeeds = await fetchCategoryFeeds(category);
    // Sačuvaj do 50 najnovijih
    localStorage.setItem(localKey, JSON.stringify(catFeeds));
  }
  displayFeedsList(catFeeds, category);
}

/**
 * Funkcija koja inicijalizuje swipe događaje levo/desno za prelazak
 * među kategorijama, i prikazuje zeleni okvir pri prvom swajpu.
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
    "Uncategorized"
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
        nextTab.click();
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
        prevTab.click();
      }
    }
  }
}

/**
 * Funkcija za podešavanje (Settings) i toggle teme, fonta, itd.
 */
function initSettings() {
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

  function changeFontSize(delta) {
    const body = document.body;
    const currentSize = parseInt(window.getComputedStyle(body).fontSize);
    const newSize = currentSize + delta;
    if (newSize >= 12 && newSize <= 24) {
      body.style.fontSize = newSize + 'px';
      localStorage.setItem('fontSize', newSize);
    }
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
}

/**
 * Glavna funkcija koja se poziva kada je DOM spreman.
 * U njoj inicijalizujemo sve delove aplikacije.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Pokaži overlay tutorijal ako se prvi put pokreće
  checkAndShowTutorial();

  // Definiši globalni niz kategorija
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

  // Inicijalno sakrij zeleni okvir za prvi tab
  hideGreenRectangle();

  // Inicijalizacija setovanja i tema
  initSettings();

  // Inicijalizacija swipe logike
  initSwipe();

  // Selektovanje dva glavna taba: Neueste i Aktuell
  const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
  const aktuellTab = document.querySelector('.tab[data-tab="Aktuell"]');
  const tabsContainer = document.getElementById('tabs-container');

  // Klik na "Neueste" -> top 4 iz svake kategorije
  if (neuesteTab) {
    neuesteTab.addEventListener('click', (e) => {
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      displayNeuesteFeeds();
      showGreenRectangle();
      saveAppState("Neueste");
    });
  }

  // Klik na "Aktuell" -> prikaz svih feedova
  if (aktuellTab) {
    aktuellTab.addEventListener('click', (e) => {
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      displayAktuellFeeds();
      showGreenRectangle();
      saveAppState("Aktuell");
    });
  }

  // Generisanje ostalih kategorija (tabs) posle Neueste i Aktuell
  if (tabsContainer) {
    // skipList treba da izuzme "Neueste" i "Aktuell"
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

        btn.addEventListener('click', (ev) => {
          removeActiveClass();
          ev.target.classList.add('active');
          ev.target.setAttribute('aria-selected', 'true');
          showGreenRectangle();
          displayNewsByCategory(cat);
          saveAppState(cat);
        });

        tabsContainer.appendChild(btn);
      });
  }

  // Početni prikaz (pozivamo "Neueste" da bude aktivan tab) ili vraćamo stari state
  restoreAppState();
});

/* Uklonjeno nepotrebno dno koda (displayFeed(...) i loadFeed('Aktuell');). */
