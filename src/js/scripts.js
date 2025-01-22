/************************************************
 * scripts.js
 ************************************************/

/**
 * Funkcija koja prikazuje overlay tutorijal samo jednom.
 */
function checkAndShowTutorial() {
  const tutorialShown = localStorage.getItem('tutorialShown');
  const overlay = document.getElementById('tutorial-overlay');
  if (!tutorialShown && overlay) {
    overlay.style.display = 'flex';
  }
}

/**
 * Zatvaranje tutorijal overlaya.
 */
function closeTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    localStorage.setItem('tutorialShown', 'true');
  }
}

/**
 * Čuvamo poslednji aktivni tab u LocalStorage.
 */
function saveActiveTab(tabName) {
  localStorage.setItem('activeTab', tabName);
}

/**
 * Vraćamo se na prethodni aktivni tab (ako postoji),
 * inače idemo na "Neueste".
 */
function restoreActiveTab() {
  const storedTab = localStorage.getItem('activeTab');
  if (storedTab) {
    const btn = document.querySelector(`.tab[data-tab="${storedTab}"]`);
    if (btn) {
      btn.click();
      return;
    }
  }
  // Ako nema, default: Neueste
  const neuesteBtn = document.querySelector('.tab[data-tab="Neueste"]');
  if (neuesteBtn) {
    neuesteBtn.click();
  }
}

/**
 * Vraća formatiran string "vor X Minuten/Stunden/Tagen..."
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
 * Kreiramo news-card; placeholder za "Bild".
 */
function createNewsCard(feed) {
  const card = document.createElement('div');
  card.className = "news-card";

  // Ako je izvor "Bild", koristimo poseban placeholder
  let placeholderImg = 'https://via.placeholder.com/80';
  if (feed.source && feed.source.toLowerCase().includes("bild")) {
    placeholderImg = 'src/icons/bildplaceholder.jpg';
  }

  const img = document.createElement('img');
  img.className = "news-card-image lazy";
  img.dataset.src = feed.image || placeholderImg;
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
 * Dodaje "active-green" prvi put kad se desi swipe.
 */
function showGreenRectangle() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.classList.add('active-green');
  }
}

/**
 * Skriva "active-green" na početku (kod Neueste).
 */
function hideGreenRectangle() {
  const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
  if (neuesteTab) {
    neuesteTab.classList.remove('active-green');
  }
}

/**
 * Animacija prelaza (fade+slide).
 */
function animateNewsContainer() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.classList.remove('fade-slide');
  // Forsira reflow
  void container.offsetWidth;
  container.classList.add('fade-slide');
}

/**
 * Lazy load slika.
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
 * Ako /api/feeds vrati grešku, prikažemo nemački tekst
 * "Derzeit können die Nachrichten nicht geladen werden."
 */
async function fetchAllFeedsFromServer() {
  try {
    const resp = await fetch("/api/feeds");
    if (!resp.ok) {
      throw new Error("Fehler beim Abrufen der Feeds.");
    }
    let data = await resp.json();
    data.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
    return data.slice(0, 50);
  } catch (err) {
    console.error(err);
    const container = document.getElementById('news-container');
    if (container) {
      container.innerHTML = "<p style='color:red'>Derzeit können die Nachrichten nicht geladen werden.</p>";
    }
    return [];
  }
}

/**
 * Ako /api/feeds-by-category vrati grešku, isto (nemački tekst).
 */
async function fetchCategoryFeeds(category) {
  const catUrl = (category === "Ohne Kategorie") ? "Uncategorized" : category;
  try {
    const resp = await fetch(`/api/feeds-by-category/${encodeURIComponent(catUrl)}`);
    if (!resp.ok) {
      throw new Error("Fehler beim Abrufen der Kategorie: " + catUrl);
    }
    let data = await resp.json();
    data.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
    return data.slice(0, 50);
  } catch (err) {
    console.error(err);
    const container = document.getElementById('news-container');
    if (container) {
      container.innerHTML = "<p style='color:red'>Derzeit können die Nachrichten nicht geladen werden (Kategorie).</p>";
    }
    return [];
  }
}

/**
 * Prikazuje feed-ove + heading (ako zadat).
 * Heading menja veličinu teksta zajedno sa news-cards.
 */
function displayFeedsList(feedsList, headingTitle = "") {
  const container = document.getElementById('news-container');
  if (!container) return;

  container.innerHTML = "";

  if (headingTitle) {
    const heading = document.createElement('h2');
    heading.textContent = headingTitle;
    heading.style.backgroundColor = "#000";
    heading.style.color = "var(--primary-color)";
    heading.style.padding = "4px";
    heading.style.marginTop = "0.4rem";
    heading.style.marginBottom = "4px";
    heading.style.textAlign = "center";
    heading.style.fontSize = "var(--card-font-size)";
    container.appendChild(heading);
  }

  if (!feedsList || feedsList.length === 0) {
    const noNews = document.createElement('p');
    noNews.textContent = "Keine News verfügbar.";
    container.appendChild(noNews);
    animateNewsContainer();
    return;
  }

  feedsList.forEach(feed => {
    const card = createNewsCard(feed);
    container.appendChild(card);
  });
  animateNewsContainer();
  initializeLazyLoading();
}

/**
 * "Aktuell" - 50 najnovijih, bez uklanjanja duplikata.
 */
async function displayAktuellFeeds() {
  // Uvek sveže s /api/feeds (50 newest)
  const allFeeds = await fetchAllFeedsFromServer();
  displayFeedsList(allFeeds, "Aktuell");
  setActiveTabInUI("Aktuell");
}

/**
 * "Neueste":
 *  - heading "Neueste"
 *  - prve 4 random (mlađe od 2h, pa 4h, pa 1 day)
 *  - zatim 4 iz svake druge kategorije
 */
async function displayNeuesteFeeds() {
  const container = document.getElementById('news-container');
  if (!container) return;

  container.innerHTML = "";

  // Crni box "Neueste"
  const headingNeueste = document.createElement('h2');
  headingNeueste.textContent = "Neueste";
  headingNeueste.style.backgroundColor = "#000";
  headingNeueste.style.color = "var(--primary-color)";
  headingNeueste.style.padding = "4px";
  headingNeueste.style.marginTop = "0.4rem";
  headingNeueste.style.marginBottom = "4px";
  headingNeueste.style.textAlign = "center";
  headingNeueste.style.fontSize = "var(--card-font-size)";
  container.appendChild(headingNeueste);

  // 1) Uzimamo sve feedove (iz /api/feeds)
  const allFeeds = await fetchAllFeedsFromServer(); // do 50

  // Filtriramo vesti mlade od 2h / 4h / 1 day
  const now = Date.now();
  const twoHours = 2 * 60 * 60 * 1000;
  const fourHours = 4 * 60 * 60 * 1000;
  const oneDay   = 24 * 60 * 60 * 1000;

  function randomPick(count, arr) {
    if (arr.length <= count) return arr.slice();
    let result = [];
    const temp = arr.slice();
    while (result.length < count && temp.length > 0) {
      let i = Math.floor(Math.random() * temp.length);
      result.push(temp.splice(i, 1)[0]);
    }
    return result;
  }

  let last2h = allFeeds.filter(f => (now - new Date(f.date_published).getTime()) < twoHours);
  if (last2h.length >= 4) {
    const fourRandom = randomPick(4, last2h);
    fourRandom.forEach(feed => {
      const card = createNewsCard(feed);
      container.appendChild(card);
    });
  } else {
    let last4h = allFeeds.filter(f => (now - new Date(f.date_published).getTime()) < fourHours);
    if (last4h.length >= 4) {
      const fourRandom = randomPick(4, last4h);
      fourRandom.forEach(feed => {
        const card = createNewsCard(feed);
        container.appendChild(card);
      });
    } else {
      let lastDay = allFeeds.filter(f => (now - new Date(f.date_published).getTime()) < oneDay);
      if (lastDay.length >= 4) {
        const fourRandom = randomPick(4, lastDay);
        fourRandom.forEach(feed => {
          const card = createNewsCard(feed);
          container.appendChild(card);
        });
      } else {
        // ako ni toga nema, onda uzmemo 4 random iz allFeeds
        const fallbackRandom = randomPick(4, allFeeds);
        fallbackRandom.forEach(feed => {
          const card = createNewsCard(feed);
          container.appendChild(card);
        });
      }
    }
  }

  // 2) Ostale kategorije (po 4)
  const catList = [
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

  for (const cat of catList) {
    const catFeeds = await fetchCategoryFeeds(cat);
    if (!catFeeds || catFeeds.length === 0) continue;
    catFeeds.sort((a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime());
    const top4 = catFeeds.slice(0, 4);

    const heading = document.createElement('h2');
    heading.textContent = cat;
    heading.style.backgroundColor = "#000";
    heading.style.color = "var(--primary-color)";
    heading.style.padding = "4px";
    heading.style.marginTop = "0.4rem";
    heading.style.marginBottom = "4px";
    heading.style.textAlign = "center";
    heading.style.fontSize = "var(--card-font-size)";

    container.appendChild(heading);

    top4.forEach(feed => {
      const card = createNewsCard(feed);
      container.appendChild(card);
    });
  }

  animateNewsContainer();
  initializeLazyLoading();
  setActiveTabInUI("Neueste");
}

/**
 * Kategorija. Ako ne postoji -> Aktuell
 */
async function displayNewsByCategory(category) {
  const validCat = [
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
  if (!validCat.includes(category)) {
    await displayAktuellFeeds();
    return;
  }

  const catFeeds = await fetchCategoryFeeds(category);
  displayFeedsList(catFeeds, category);
  setActiveTabInUI(category);
}

/**
 * setActiveTabInUI - tab se označi prema nazivu kategorije
 */
function setActiveTabInUI(category) {
  removeActiveClass();
  const tabBtn = document.querySelector(`.tab[data-tab="${category}"]`);
  if (tabBtn) {
    tabBtn.classList.add('active');
    tabBtn.setAttribute('aria-selected', 'true');
  }
  saveActiveTab(category);
}

/**
 * Swipe left/right (horizontal only). 
 * -> Animacija fade-slide, menja tabove i vrh scroll
 */
function initSwipe() {
  let firstSwipeOccurred = false;
  const container = document.getElementById('news-container');
  let startX = 0, startY = 0;
  let endX = 0,   endY = 0;
  const threshold = 50;

  const catOrder = [
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

  if (container) {
    container.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].screenX;
      startY = e.changedTouches[0].screenY;
    });

    container.addEventListener('touchend', e => {
      endX = e.changedTouches[0].screenX;
      endY = e.changedTouches[0].screenY;

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      // horizontal only (math > threshold)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (!firstSwipeOccurred) {
          firstSwipeOccurred = true;
          showGreenRectangle();
        }
        if (deltaX < 0) {
          showNextCategory();
        } else {
          showPrevCategory();
        }
      }
    });
  }

  function showNextCategory() {
    const active = document.querySelector('.tab.active');
    if (!active) return;
    const currentCat = active.getAttribute('data-tab');
    let idx = catOrder.indexOf(currentCat);
    if (idx < 0) idx = 0;
    if (idx < catOrder.length - 1) {
      idx++;
      const nextCat = catOrder[idx];
      const nextTab = document.querySelector(`.tab[data-tab="${nextCat}"]`);
      if (nextTab) {
        nextTab.click();
        setTimeout(() => {
          window.scrollTo(0,0);
          nextTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }, 50);
      }
    }
  }

  function showPrevCategory() {
    const active = document.querySelector('.tab.active');
    if (!active) return;
    const currentCat = active.getAttribute('data-tab');
    let idx = catOrder.indexOf(currentCat);
    if (idx < 0) idx = 0;
    if (idx > 0) {
      idx--;
      const prevCat = catOrder[idx];
      const prevTab = document.querySelector(`.tab[data-tab="${prevCat}"]`);
      if (prevTab) {
        prevTab.click();
        setTimeout(() => {
          window.scrollTo(0,0);
          prevTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }, 50);
      }
    }
  }
}

/**
 * Inicijalizacija Settings menija (tema, font-size...).
 */
function initSettings() {
  let currentSize = parseInt(localStorage.getItem('cardFontSize') || '16');

  function applySize(size) {
    document.documentElement.style.setProperty('--card-font-size', size + 'px');
  }
  applySize(currentSize);

  function toggleTheme() {
    const root = document.documentElement;
    const now = root.getAttribute('data-theme') || 'dark';
    const next = now === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = (next === 'light') ? 'Dark Modus' : 'Licht Modus';
    }
  }

  function changeFont(delta) {
    currentSize += delta;
    if (currentSize < 10) currentSize = 10;
    if (currentSize > 48) currentSize = 48;
    localStorage.setItem('cardFontSize', currentSize.toString());
    applySize(currentSize);
  }

  const menuBtn = document.getElementById('menu-button');
  const closeSettingsBtn = document.getElementById('close-settings');
  const themeBtn = document.getElementById('theme-toggle');
  const fontInc = document.getElementById('font-increase');
  const fontDec = document.getElementById('font-decrease');

  function openSettings() {
    const mod = document.getElementById('settings-modal');
    if (mod) mod.style.display = 'flex';
  }
  function closeSettings() {
    const mod = document.getElementById('settings-modal');
    if (mod) mod.style.display = 'none';
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', openSettings);
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettings);
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
      closeSettings();
    });
  }
  if (fontInc) {
    fontInc.addEventListener('click', () => changeFont(2));
  }
  if (fontDec) {
    fontDec.addEventListener('click', () => changeFont(-2));
  }

  // Učitaj temu
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggle) {
    themeToggle.textContent = (savedTheme === 'light') ? 'Dark Modus' : 'Licht Modus';
  }
}

/**
 * Glavna funkcija.
 */
document.addEventListener("DOMContentLoaded", () => {
  checkAndShowTutorial();
  const closeT = document.getElementById('close-tutorial');
  if (closeT) {
    closeT.addEventListener('click', closeTutorialOverlay);
  }

  hideGreenRectangle();
  initSettings();
  initSwipe();

  // Definišemo ostale kategorije
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

  const tabsContainer = document.getElementById('tabs-container');
  const neuesteBtn = document.querySelector('.tab[data-tab="Neueste"]');
  const aktuellBtn = document.querySelector('.tab[data-tab="Aktuell"]');

  // Neueste
  if (neuesteBtn) {
    neuesteBtn.addEventListener('click', async () => {
      removeActiveClass();
      neuesteBtn.classList.add('active');
      neuesteBtn.setAttribute('aria-selected', 'true');
      await displayNeuesteFeeds();
      showGreenRectangle();
      window.scrollTo(0,0);
    });
  }

  // Aktuell
  if (aktuellBtn) {
    aktuellBtn.addEventListener('click', async () => {
      removeActiveClass();
      aktuellBtn.classList.add('active');
      aktuellBtn.setAttribute('aria-selected', 'true');
      await displayAktuellFeeds();
      showGreenRectangle();
      window.scrollTo(0,0);
    });
  }

  // Generišemo ostale tabove
  if (tabsContainer) {
    const skip = ["Neueste", "Aktuell"];
    categories
      .filter(cat => !skip.includes(cat))
      .forEach(cat => {
        const btn = document.createElement('button');
        btn.classList.add('tab');
        btn.setAttribute('data-tab', cat);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.textContent = cat;

        btn.addEventListener('click', async () => {
          removeActiveClass();
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          showGreenRectangle();
          await displayNewsByCategory(cat);
          window.scrollTo(0,0);
        });
        tabsContainer.appendChild(btn);
      });
  }

  // Vratimo se na prethodno aktivan tab, inače Neueste
  restoreActiveTab();
});
