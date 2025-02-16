/************************************************
 * main.js
 ************************************************/

// Import potrebnih modula i funkcija
import { openNewsModal } from './newsModal.js';
import { initFeeds, displayAktuellFeeds, displayNewsByCategory } from './feeds.js';
import { brandMap, ALLOWED_SOURCES } from './sourcesConfig.js';

// Ako je podržana, onemogućavamo automatsko vraćanje scroll pozicije
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Globalne promenljive
let categoriesOrder = [
  "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
  "Unterhaltung", "Reisen", "Lifestyle", "Auto",
  "Welt", "Politik", "Panorama", "Sonstiges"
];

let blockedSources = JSON.parse(localStorage.getItem('blockedSources') || '[]');
let blockedCategories = JSON.parse(localStorage.getItem('blockedCategories') || '[]');

// Dodaj "Sonstiges" u blockedCategories ako već nije prisutna
if (!blockedCategories.includes('Sonstiges')) {
  blockedCategories.push('Sonstiges');
  localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
}

let currentCardFontSize = localStorage.getItem('cardFontSize')
  ? parseInt(localStorage.getItem('cardFontSize'), 10)
  : 16;

/**
 * Primeni var(--card-font-size) i osveži trenutni feed
 */
function applyCardFontSize() {
  document.documentElement.style.setProperty('--card-font-size', currentCardFontSize + 'px');
  localStorage.setItem('cardFontSize', currentCardFontSize);
}


/**
 * Pomoćne funkcije
 */
function removeTLD(source) {
  return source.replace(/\.(ch|de|at)$/i, '');
}

function normalizeSource(src) {
  return src.toUpperCase().replace(/\s+/g, '');
}

function blockSource(src) {
  const normalized = normalizeSource(src);
  if (!blockedSources.includes(normalized)) {
    blockedSources.push(normalized);
    localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
  }
}

function unblockSource(src) {
  const normalized = normalizeSource(src);
  blockedSources = blockedSources.filter(s => s !== normalized);
  localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
}

function isSourceBlocked(src) {
  const normalized = normalizeSource(src);
  return blockedSources.includes(normalized);
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

function moveCategory(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= categoriesOrder.length) {
    return;
  }
  [categoriesOrder[index], categoriesOrder[newIndex]] =
    [categoriesOrder[newIndex], categoriesOrder[index]];
  localStorage.setItem('categoriesOrder', JSON.stringify(categoriesOrder));
  openRearrangeModal();
}

/**
 * Kreira tabove za navigaciju, postavljajući ARIA atribute za pristupačnost.
 */
function buildTabs() {
  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  // Ukloni sve tekstualne čvorove koji nisu elementi
  Array.from(tabsContainer.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      tabsContainer.removeChild(node);
    }
  });

  // Ukloni sve dinamički dodate tabove osim statičnog "Aktuell"
  const existingTabs = tabsContainer.querySelectorAll('.tab:not([data-tab="Aktuell"])');
  existingTabs.forEach(t => t.remove());

  // Učitavanje sačuvanog redosleda kategorija
  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }

  // Kreiraj tabove za svaku kategoriju
  categoriesOrder.forEach(cat => {
    if (isCategoryBlocked(cat)) return; // preskoči blokirane kategorije
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('data-tab', cat);
    btn.textContent = cat;
    // Postavi potrebne ARIA atribute
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.id = 'tab-' + cat.toLowerCase().replace(/\s+/g, '-');
    btn.setAttribute('aria-controls', 'news-container');
    tabsContainer.appendChild(btn);
  });
}

function openRearrangeModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'flex';

  const ul = document.getElementById('sortable-list');
  if (!ul) return;
  ul.innerHTML = '';

  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }

  categoriesOrder.forEach((cat, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.textContent = cat;

    const upArrow = document.createElement('div');
    upArrow.className = 'arrow-up';
    upArrow.onclick = () => moveCategory(index, -1);

    const downArrow = document.createElement('div');
    downArrow.className = 'arrow-down';
    downArrow.onclick = () => moveCategory(index, 1);

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
      buildTabs();
    };

    li.prepend(upArrow, downArrow);
    li.appendChild(btn);

    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);

    ul.appendChild(li);
  });
}

function closeKategorienModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (kategorienModal) {
    kategorienModal.style.display = 'none';
  }

  const ul = document.getElementById('sortable-list');
  if (!ul) return;

  const items = [...ul.children].map(li =>
    li.textContent.split('Verbergen')[0].split('Entsperren')[0].trim()
  );

  categoriesOrder = items;
  localStorage.setItem('categoriesOrder', JSON.stringify(categoriesOrder));
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

function openQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex';

  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return;
  sourcesListEl.innerHTML = '';

  const allSources = ALLOWED_SOURCES.slice();
  allSources.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  allSources.forEach(src => {
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

      // Osvežavamo trenutno aktivnu kategoriju nakon izmene
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) {
        const category = activeTab.getAttribute('data-tab');
        if (category === 'Aktuell') {
          displayAktuellFeeds(true);
        } else {
          displayNewsByCategory(category, true);
        }
      }
    };

    sourceItem.appendChild(spanName);
    sourceItem.appendChild(blockBtn);
    sourcesListEl.appendChild(sourceItem);
  });
}

function closeQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (quellenModal) {
    quellenModal.style.display = 'none';
  }
  openSettingsModal();
}

function openKategorienModal() {
  const modal = document.getElementById('kategorien-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-kategorien-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}

function openUberModal() {
  const modal = document.getElementById('uber-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-uber-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}

function openKontaktModal() {
  const modal = document.getElementById('kontakt-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-kontakt-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}

function openDatenschutzModal() {
  const modal = document.getElementById('datenschutz-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-datenschutz-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}

function initSwipe() {
  const swipeContainer = document.getElementById('news-container');
  if (!swipeContainer) return;

  let touchstartX = 0;
  let touchendX = 0;
  let touchstartY = 0;
  let touchendY = 0;
  const swipeThreshold = 50;

  function getAllSwipeCategories() {
    const arr = ["Aktuell"];
    categoriesOrder.forEach(cat => {
      if (!isCategoryBlocked(cat)) {
        arr.push(cat);
      }
    });
    return arr;
  }

  function handleGesture() {
    const distX = touchendX - touchstartX;
    const distY = touchendY - touchstartY;

    // Resetujemo scroll
    swipeContainer.scrollTop = 0;

    if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > swipeThreshold) {
      if (distX < 0) {
        moveCategorySwipe(1);
      } else {
        moveCategorySwipe(-1);
      }
    }
  }

  function moveCategorySwipe(dir) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;

    const currentCat = activeTab.getAttribute('data-tab');
    const cats = getAllSwipeCategories();

    let idx = cats.indexOf(currentCat);
    if (idx < 0) idx = 0;
    idx += dir;

    if (idx < 0) idx = 0;
    if (idx >= cats.length) idx = cats.length - 1;

    clickTab(cats[idx]);

    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 500);
  }

  function clickTab(cat) {
    const tabsContainer = document.getElementById('tabs-container');
    const swipeContainer = document.getElementById('news-container');
    const tab = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (!tab) {
      const aktuell = document.querySelector('.tab[data-tab="Aktuell"]');
      if (aktuell) aktuell.click();
      return;
    }
    if (tabsContainer && tab) {
      const leftPos = tab.offsetLeft - (tabsContainer.offsetWidth / 2) + (tab.offsetWidth / 2);
      tabsContainer.scrollTo({
        left: Math.max(leftPos, 0),
        behavior: 'smooth'
      });
    }
    tab.click();

    requestAnimationFrame(() => {
      if (swipeContainer) swipeContainer.scrollTop = 0;
    });
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

function loadFeeds(defaultTab = 'Aktuell') {
  const tabBtn = document.querySelector(`.tab[data-tab="${defaultTab}"]`);
  if (tabBtn) {
    tabBtn.click();
  }
}

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

/** Centralizovana inicijalizacija na DOMContentLoaded **/
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Proveri parametar newsId u ?newsId=... ili /news/...
  const urlParams = new URLSearchParams(window.location.search);
  let newsId = urlParams.get('newsId');
  if (!newsId) {
    const path = window.location.pathname;
    if (path.startsWith('/news/')) {
      newsId = path.split('/news/')[1];
    }
  }

  // 2) Ako imamo newsId, samo otvorimo modal za tu vest
  if (newsId) {
    try {
      const response = await fetch(`/api/news/${newsId}`);
      if (!response.ok) {
        console.error("Vest nije pronađena:", newsId);
      } else {
        const news = await response.json();
        openNewsModal(news);
      }
    } catch (error) {
      console.error("Greška pri učitavanju vesti:", error);
    }
  }

  // 3) Primeni cardFontSize
  applyCardFontSize();

  // 4) **CHANGED**: Prvo buildTabs(), pa initSwipe(), pa initFeeds() (ako nema newsId)
  buildTabs();                 // [CHANGED] Pomereno iznad initFeeds
  initSwipe();

  // Ako NEMA newsId, učitavamo sve feedove i pravimo event-listener-e
  if (!newsId) {
    initFeeds();               // Poziv u fajlu feeds.js -> postavi eventListeners
  }

  // Postavljanje event listener-a za Settings modal
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

  const incBtn = document.getElementById('font-increase');
  if (incBtn) incBtn.onclick = increaseFontSize;
  const decBtn = document.getElementById('font-decrease');
  if (decBtn) decBtn.onclick = decreaseFontSize;

  const uberButton = document.getElementById('uber-button');
  if (uberButton) {
    uberButton.onclick = () => {
      settingsModal.style.display = 'none';
      openUberModal();
    };
  }
  const closeUberBtn = document.getElementById('close-uber-modal');
  if (closeUberBtn) {
    closeUberBtn.onclick = () => {
      const uberModal = document.getElementById('uber-modal');
      if (uberModal) {
        uberModal.style.display = 'none';
        openSettingsModal();
      }
    };
  }

  const kontaktButton = document.getElementById('kontakt-button');
  if (kontaktButton) {
    kontaktButton.onclick = () => {
      settingsModal.style.display = 'none';
      openKontaktModal();
    };
  }
  const closeKontaktBtn = document.getElementById('close-kontakt-modal');
  if (closeKontaktBtn) {
    closeKontaktBtn.onclick = () => {
      const kontaktModal = document.getElementById('kontakt-modal');
      if (kontaktModal) {
        kontaktModal.style.display = 'none';
        openSettingsModal();
      }
    };
  }

  const datenschutzButton = document.getElementById('datenschutz-button');
  if (datenschutzButton) {
    datenschutzButton.onclick = () => {
      settingsModal.style.display = 'none';
      openDatenschutzModal();
    };
  }
  const closeDatenschutzBtn = document.getElementById('close-datenschutz-modal');
  if (closeDatenschutzBtn) {
    closeDatenschutzBtn.onclick = () => {
      const datenschutzModal = document.getElementById('datenschutz-modal');
      if (datenschutzModal) {
        datenschutzModal.style.display = 'none';
        openSettingsModal();
      }
    };
  }

  // Tutorial Overlay
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
