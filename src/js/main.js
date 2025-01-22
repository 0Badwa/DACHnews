/**
 * main.js
 *
 * 1) Uključili smo ponovo "initSwipe()" da omogući levo/desno prelazak
 *    preko 'news-container'.
 * 2) Popravili smo + i - da menja var(--card-font-size) umesto body.fontSize.
 * 3) U quellen -> "Verbergen" / "Entsperren".
 * 4) U kategorien -> isto dugme "Verbergen" / "Entsperren" za svaku kategoriju.
 */

import {
  displayNeuesteFeeds,
  displayAktuellFeeds,
  displayNewsByCategory
} from './feeds.js';

// Globalne promenljive
let categoriesOrder = [
  "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
  "LGBT+", "Unterhaltung", "Reisen", "Lifestyle", "Auto",
  "Welt", "Politik", "Panorama", "Sonstiges"
];
let blockedSources = JSON.parse(localStorage.getItem('blockedSources') || '[]');
let blockedCategories = JSON.parse(localStorage.getItem('blockedCategories') || '[]');

// Čuvamo veličinu fonta samo za news-cards
let currentCardFontSize = localStorage.getItem('cardFontSize')
  ? parseInt(localStorage.getItem('cardFontSize'), 10)
  : 16;

/** Primeni veličinu fonta u news-card (preko var(--card-font-size)) */
function applyCardFontSize() {
  const root = document.documentElement;
  root.style.setProperty('--card-font-size', currentCardFontSize + 'px');
  localStorage.setItem('cardFontSize', currentCardFontSize);
}

/** Otvaranje i zatvaranje modala "Quellen" */
function openQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex';

  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return;
  sourcesListEl.innerHTML = '';

  // Hardkodovan spisak izvora (ili dohvatiti dinamički iz feed-ova)
  const newsSources = ['Bild', 'Zeit', 'Blick', 'Heise', 'Spiegel', 'Falter', 'ZEIT ONLINE'];
  newsSources.forEach(src => {
    const sourceItem = document.createElement('div');
    sourceItem.className = 'source-item';

    const spanName = document.createElement('span');
    spanName.textContent = src;

    const isBlocked = isSourceBlocked(src);
    const blockBtn = document.createElement('button');
    blockBtn.className = isBlocked ? 'unblock-button' : 'block-button';
    // Tekst "Blockieren" -> "Verbergen"
    blockBtn.textContent = isBlocked ? 'Entsperren' : 'Verbergen';

    blockBtn.onclick = () => {
      if (isSourceBlocked(src)) {
        unblockSource(src);
        blockBtn.className = 'block-button';
        blockBtn.textContent = 'Verbergen';
      } else {
        blockSource(src);
        blockBtn.className = 'unblock-button';
        blockBtn.textContent = 'Entsperren';
      }
      // Osvežavamo feed
      loadFeeds();
    };

    sourceItem.appendChild(spanName);
    sourceItem.appendChild(blockBtn);
    sourcesListEl.appendChild(sourceItem);
  });
}
function closeQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'none';
  loadFeeds();
}

/** Otvaranje i zatvaranje modala "Kategorien" (Verbergen i anordnen) */
function openRearrangeModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'flex';

  const ul = document.getElementById('sortable-list');
  if (!ul) return;
  ul.innerHTML = '';

  // Učitavamo sačuvani order ili default
  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }

  categoriesOrder.forEach(cat => {
    // Kreiramo <li> + dugme
    const li = document.createElement('li');
    li.draggable = true;
    li.textContent = cat;

    const btn = document.createElement('button');
    btn.textContent = isCategoryBlocked(cat) ? 'Entsperren' : 'Verbergen'; // isto kao quellen
    btn.onclick = () => {
      if (isCategoryBlocked(cat)) {
        unblockCategory(cat);
        btn.textContent = 'Verbergen';
      } else {
        blockCategory(cat);
        btn.textContent = 'Entsperren';
      }
      // posle svake promene, mozda reload?
    };

    li.appendChild(btn);

    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);

    ul.appendChild(li);
  });
}
function closeKategorienModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'none';

  // snimi redosled
  const ul = document.getElementById('sortable-list');
  if (!ul) return;
  const items = [...ul.children].map(li => li.textContent.trim().split('Verbergen')[0]
                                                   .split('Entsperren')[0]
                                                   .trim());
  categoriesOrder = items;
  localStorage.setItem('categoriesOrder', JSON.stringify(categoriesOrder));

  // rebuild tabs i reload feed
  buildTabs();
  loadFeeds();
}

/** DRAG & DROP logika */
function handleDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.textContent.trim());
  e.target.style.opacity = '0.4';
}
function handleDragOver(e) {
  e.preventDefault();
}
function handleDrop(e) {
  e.preventDefault();
  const draggedCat = e.dataTransfer.getData('text/plain');
  const dropTarget = e.target.closest('li');
  if (!dropTarget) return;

  const ul = dropTarget.parentNode;
  const allItems = [...ul.children];
  const draggedItem = allItems.find(li => li.textContent.trim().includes(draggedCat));
  if (!draggedItem) return;

  const draggedPos = allItems.indexOf(draggedItem);
  const dropPos = allItems.indexOf(dropTarget);
  if (draggedPos < dropPos) {
    ul.insertBefore(draggedItem, dropTarget.nextSibling);
  } else {
    ul.insertBefore(draggedItem, dropTarget);
  }
  draggedItem.style.opacity = '1';
}

/** BLOCK/UNBLOCK logika za sources i categories */
function blockSource(source) {
  if (!blockedSources.includes(source)) {
    blockedSources.push(source);
    localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
  }
}
function unblockSource(source) {
  blockedSources = blockedSources.filter(s => s !== source);
  localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
}
function isSourceBlocked(source) {
  return blockedSources.includes(source);
}

function blockCategory(cat) {
  if (!blockedCategories.includes(cat)) {
    blockedCategories.push(cat);
    localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
  }
}
function unblockCategory(cat) {
  blockedCategories = blockedCategories.filter(c => c !== cat);
  localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
}
function isCategoryBlocked(cat) {
  return blockedCategories.includes(cat);
}

/** Povećavanje / smanjivanje font-size */
function increaseFontSize() {
  currentCardFontSize++;
  if (currentCardFontSize > 40) currentCardFontSize = 40;
  applyCardFontSize();
}
function decreaseFontSize() {
  currentCardFontSize--;
  if (currentCardFontSize < 10) currentCardFontSize = 10;
  applyCardFontSize();
}

/** Inicijalna izgradnja tabova na osnovu categoriesOrder i blokiranih kat */
function buildTabs() {
  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  // Obrisemo sve sem Neueste i Aktuell
  const existing = tabsContainer.querySelectorAll('.tab:not([data-tab="Neueste"]):not([data-tab="Aktuell"])');
  existing.forEach(t => t.remove());

  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }
  categoriesOrder.forEach(cat => {
    if (isCategoryBlocked(cat)) return; // skip block
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('data-tab', cat);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = cat;
    tabsContainer.appendChild(btn);
  });
}

/** SWIPE levo/desno */
function initSwipe() {
  let firstSwipeOccurred = false;
  const swipeContainer = document.getElementById('news-container');
  if (!swipeContainer) return;

  let touchstartX = 0, touchendX = 0;
  let touchstartY = 0, touchendY = 0;
  const swipeThreshold = 50;

  // pun redosled (bez block?), ali da bismo mogli prelaziti i na Neueste i Aktuell
  // Npr. fiksni niz:
  const allCats = [
    "Neueste",
    "Aktuell",
    ...categoriesOrder
  ];

  function handleGesture() {
    const distX = touchendX - touchstartX;
    const distY = touchendY - touchstartY;
    if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > swipeThreshold) {
      if (distX < 0) {
        showNextCategory();
      } else {
        showPreviousCategory();
      }
    }
  }
  function showNextCategory() {
    if (!firstSwipeOccurred) {
      firstSwipeOccurred = true;
    }
    moveCategory(1);
  }
  function showPreviousCategory() {
    if (!firstSwipeOccurred) {
      firstSwipeOccurred = true;
    }
    moveCategory(-1);
  }
  function moveCategory(dir) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let idx = allCats.indexOf(currentCat);
    if (idx < 0) idx = 0;

    idx += dir;
    if (idx < 0) idx = 0;
    if (idx >= allCats.length) idx = allCats.length - 1;

    // Ako je target cat blockiran -> pomeraj se do sledece
    let nextCat = allCats[idx];
    while (idx >= 0 && idx < allCats.length && isCategoryBlocked(nextCat)) {
      idx += dir;
      nextCat = allCats[idx] || "Neueste";
    }

    clickTab(nextCat);
  }
  function clickTab(cat) {
    const tab = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (!tab) return;
    tab.click();
    setTimeout(() => {
      swipeContainer.scrollTop = 0;
    }, 300);
  }

  swipeContainer.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touchstartX = t.screenX;
    touchstartY = t.screenY;
  });
  swipeContainer.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    touchendX = t.screenX;
    touchendY = t.screenY;
    handleGesture();
  });
}

/** loadFeeds -> simulira klik na Neueste ili sl. */
function loadFeeds(defaultTab = 'Neueste') {
  const tabBtn = document.querySelector(`.tab[data-tab="${defaultTab}"]`);
  if (tabBtn) tabBtn.click();
}

/** Glavna init */
document.addEventListener('DOMContentLoaded', () => {
  // Primeni velicinu fonta
  applyCardFontSize();
  // Kreiraj tabove
  buildTabs();
  // Iniciraj swipe
  initSwipe();

  // Podesi events na tab clicks
  const tabsContainer = document.getElementById('tabs-container');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', async (e) => {
      if (!e.target.classList.contains('tab')) return;
      // deactivate
      const allTabs = document.querySelectorAll('.tab');
      allTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      // activate
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');

      const cat = e.target.getAttribute('data-tab');
      if (cat === 'Neueste') {
        await displayNeuesteFeeds();
      } else if (cat === 'Aktuell') {
        await displayAktuellFeeds();
      } else {
        await displayNewsByCategory(cat);
      }
    });
  }

  // Autoklik Neueste
  const neuesteBtn = document.querySelector('.tab[data-tab="Neueste"]');
  if (neuesteBtn) {
    neuesteBtn.click();
  }

  // Settings modal
  const menuButton = document.getElementById('menu-button');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings');
  if (menuButton && settingsModal) {
    menuButton.onclick = () => {
      settingsModal.style.display = 'flex';
    };
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.onclick = () => {
      settingsModal.style.display = 'none';
    };
  }

  // Quellen
  const quellenButton = document.getElementById('quellen-button');
  const closeQuellenBtn = document.getElementById('close-quellen-modal');
  if (quellenButton) {
    quellenButton.onclick = () => {
      settingsModal.style.display = 'none';
      openQuellenModal();
    };
  }
  if (closeQuellenBtn) {
    closeQuellenBtn.onclick = closeQuellenModal;
  }

  // Kategorien
  const kategorienButton = document.getElementById('kategorien-button');
  const kategorienModal = document.getElementById('kategorien-modal');
  const closeKategorienBtn = document.getElementById('close-kategorien-modal');
  if (kategorienButton && kategorienModal) {
    kategorienButton.onclick = () => {
      settingsModal.style.display = 'none';
      openRearrangeModal();
      kategorienModal.style.display = 'flex';
    };
  }
  if (closeKategorienBtn) {
    closeKategorienBtn.onclick = () => {
      closeKategorienModal();
    };
  }

  // Schriftgröße
  const incBtn = document.getElementById('font-increase');
  const decBtn = document.getElementById('font-decrease');
  if (incBtn) incBtn.onclick = increaseFontSize;
  if (decBtn) decBtn.onclick = decreaseFontSize;

  // Über
  const uberButton = document.getElementById('uber-button');
  const uberModal = document.getElementById('uber-modal');
  const closeUberBtn = document.getElementById('close-uber-modal');
  if (uberButton && uberModal) {
    uberButton.onclick = () => {
      settingsModal.style.display = 'none';
      uberModal.style.display = 'flex';
    };
  }
  if (closeUberBtn) {
    closeUberBtn.onclick = () => {
      uberModal.style.display = 'none';
    };
  }

  // Tutorial overlay
  const closeTutorialBtn = document.getElementById('close-tutorial');
  if (closeTutorialBtn) {
    closeTutorialBtn.onclick = () => {
      const tutOverlay = document.getElementById('tutorial-overlay');
      if (tutOverlay) tutOverlay.style.display = 'none';
      localStorage.setItem('tutorialShown', 'true');
    };
  }
  const tutorialShown = localStorage.getItem('tutorialShown');
  if (!tutorialShown) {
    const tutOverlay = document.getElementById('tutorial-overlay');
    if (tutOverlay) tutOverlay.style.display = 'flex';
  }
});

/* KRAJ main.js */
