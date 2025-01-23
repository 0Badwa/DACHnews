/**
 * main.js
 * 
 * - Ponovo ispravljena swipe funkcija (initSwipe), 
 *   sada radi levo/desno i sinhronizuje se sa tabovima.
 * - Kada prelazimo iz jedne kategorije u drugu: 
 *   aktiviramo odgovarajući tab, load-ujemo vesti
 *   i skrolujemo na prvu vest (scrollTop=0).
 * - buildTabs() -> kreira tabove (osim blokiranih).
 * - initSwipe() -> kreira listu "swipeCats" (Neueste, Aktuell, plus neblokirane).
 * - Kad swipe, prelazi u sledeću/prethodnu kategoriju i "klikne" tab.
 */

import {
  displayNeuesteFeeds,
  displayAktuellFeeds,
  displayNewsByCategory
} from './feeds.js';

// Kategorije i blok-liste
let categoriesOrder = [
  "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
  "LGBT+", "Unterhaltung", "Reisen", "Lifestyle", "Auto",
  "Welt", "Politik", "Panorama", "Sonstiges"
];
let blockedSources = JSON.parse(localStorage.getItem('blockedSources') || '[]');
let blockedCategories = JSON.parse(localStorage.getItem('blockedCategories') || '[]');

// Font-size za news-cards
let currentCardFontSize = localStorage.getItem('cardFontSize')
  ? parseInt(localStorage.getItem('cardFontSize'), 10)
  : 16;

/** Postavi var(--card-font-size) i refresh prikaza aktivne kategorije */
function applyCardFontSize() {
  document.documentElement.style.setProperty('--card-font-size', currentCardFontSize + 'px');
  localStorage.setItem('cardFontSize', currentCardFontSize);

  // Osvetli i reload aktivni tab
  const activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;
  const cat = activeTab.getAttribute('data-tab');
  if (!cat) return;
  if (cat === 'Neueste') {
    displayNeuesteFeeds();
  } else if (cat === 'Aktuell') {
    displayAktuellFeeds();
  } else {
    displayNewsByCategory(cat);
  }
}

/** Block / unblock Source */
function blockSource(src) {
  if (!blockedSources.includes(src)) {
    blockedSources.push(src);
    localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
  }
}
function unblockSource(src) {
  blockedSources = blockedSources.filter(s => s !== src);
  localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
}
function isSourceBlocked(src) {
  return blockedSources.includes(src);
}

/** Block / unblock Category */
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

/** Build tabs -> sem Neueste i Aktuell, plus unblocked from categoriesOrder. */
function buildTabs() {
  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  // Obrisi sve sem Neueste, Aktuell
  const existing = tabsContainer.querySelectorAll('.tab:not([data-tab="Neueste"]):not([data-tab="Aktuell"])');
  existing.forEach(t => t.remove());

  // Ucitaj order iz localStorage
  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }

  // generisi tab za svaku cat koja nije block
  categoriesOrder.forEach(cat => {
    if (isCategoryBlocked(cat)) return;
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('data-tab', cat);
    btn.setAttribute('role', 'tab');
    btn.textContent = cat;
    tabsContainer.appendChild(btn);
  });
}

/** Drag & Drop za modal kategorien */
function openRearrangeModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'flex';

  const ul = document.getElementById('sortable-list');
  if (!ul) return;
  ul.innerHTML = '';

  // citamo categoriesOrder iz LS
  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }

  categoriesOrder.forEach(cat => {
    const li = document.createElement('li');
    li.draggable = true;
    li.textContent = cat;

    // Verbergen / Entsperren
    const btn = document.createElement('button');
    btn.textContent = isCategoryBlocked(cat) ? 'Entsperren' : 'Verbergen';
    btn.onclick = () => {
      if (isCategoryBlocked(cat)) {
        unblockCategory(cat);
        btn.textContent = 'Verbergen';
      } else {
        blockCategory(cat);
        btn.textContent = 'Entsperren';
      }
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
  if (kategorienModal) kategorienModal.style.display = 'none';

  const ul = document.getElementById('sortable-list');
  if (!ul) return;
  const items = [...ul.children].map(li => li.textContent.split('Verbergen')[0].split('Entsperren')[0].trim());
  categoriesOrder = items;
  localStorage.setItem('categoriesOrder', JSON.stringify(categoriesOrder));

  // rebuild tabs i reload
  buildTabs();
  loadFeeds();
}
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
  const draggedItem = allItems.find(li => li.textContent.includes(draggedCat));
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

/** Quellen modal: Verbergen / Entsperren */
function openQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex';

  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return;
  sourcesListEl.innerHTML = '';

  const newsSources = ['Bild', 'Zeit', 'Blick', 'Heise', 'Spiegel', 'Falter'];
  newsSources.forEach(src => {
    const sourceItem = document.createElement('div');
    sourceItem.className = 'source-item';

    const spanName = document.createElement('span');
    spanName.textContent = src;

    const isBlocked = isSourceBlocked(src);
    const blockBtn = document.createElement('button');
    blockBtn.className = isBlocked ? 'unblock-button' : 'block-button';
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
      loadFeeds();
    };

    sourceItem.appendChild(spanName);
    sourceItem.appendChild(blockBtn);
    sourcesListEl.appendChild(sourceItem);
  });
}
function closeQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (quellenModal) quellenModal.style.display = 'none';
  loadFeeds();
}

/** initSwipe: ponovo dorađen da odmah reflektuje tabs i prikazuje prvu vest */
function initSwipe() {
  const swipeContainer = document.getElementById('news-container');
  if (!swipeContainer) return;

  let touchstartX = 0, touchendX = 0;
  let touchstartY = 0, touchendY = 0;
  const swipeThreshold = 50;

  // Sastavimo listu za swipe (Neueste, Aktuell i unblocked)
  function getAllSwipeCategories() {
    // Rebuild after buildTabs
    const finalArr = ["Neueste", "Aktuell"];
    categoriesOrder.forEach(cat => {
      if (!isCategoryBlocked(cat)) {
        finalArr.push(cat);
      }
    });
    return finalArr;
  }

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
    moveCategory(1);
  }
  function showPreviousCategory() {
    moveCategory(-1);
  }

  function moveCategory(dir) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;

    const currentCat = activeTab.getAttribute('data-tab');
    const allCats = getAllSwipeCategories();
    let idx = allCats.indexOf(currentCat);
    if (idx < 0) idx = 0;

    idx += dir;
    if (idx < 0) idx = 0;
    if (idx >= allCats.length) idx = allCats.length - 1;

    clickTab(allCats[idx]);
  }

  function clickTab(cat) {
    const tab = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (!tab) {
      // fallback -> Neueste
      const neu = document.querySelector('.tab[data-tab="Neueste"]');
      if (neu) neu.click();
      return;
    }
    tab.click();
    // posle kratkog delay, skrol na prvu vest
    setTimeout(() => {
      swipeContainer.scrollTop = 0;
    }, 200);
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

/** loadFeeds -> simuliramo klik na Neueste */
function loadFeeds(defaultTab = 'Neueste') {
  const tabBtn = document.querySelector(`.tab[data-tab="${defaultTab}"]`);
  if (tabBtn) {
    tabBtn.click();
  }
}

/** Poveć i smanji font-size */
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

/** Glavni init */
document.addEventListener('DOMContentLoaded', () => {
  // primeni font
  applyCardFontSize();

  // buildTabs
  buildTabs();

  // swipe
  initSwipe();

  // tab clicks
  const tabsContainer = document.getElementById('tabs-container');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', async e => {
      if (!e.target.classList.contains('tab')) return;
      const allTabs = document.querySelectorAll('.tab');
      allTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
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

  // auto Neueste
  loadFeeds();

  // Settings
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
  if (quellenButton) {
    quellenButton.onclick = () => {
      settingsModal.style.display = 'none';
      openQuellenModal();
    };
  }
  const closeQuellenBtn = document.getElementById('close-quellen-modal');
  if (closeQuellenBtn) {
    closeQuellenBtn.onclick = closeQuellenModal;
  }

  // Kategorien
  const kategorienButton = document.getElementById('kategorien-button');
  if (kategorienButton) {
    kategorienButton.onclick = () => {
      settingsModal.style.display = 'none';
      openRearrangeModal();
    };
  }
  const closeKategorienBtn = document.getElementById('close-kategorien-modal');
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

  // Tutorial
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
