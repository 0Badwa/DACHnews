/************************************************
 * main.js
 ************************************************/

import {
  displayAktuellFeeds,
  displayNewsByCategory
} from './feeds.js';

let categoriesOrder = [
  "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
  "Unterhaltung", "Reisen", "Lifestyle", "Auto",
  "Welt", "Politik", "Panorama", "Sonstiges"
];
let blockedSources = JSON.parse(localStorage.getItem('blockedSources') || '[]');
let blockedCategories = JSON.parse(localStorage.getItem('blockedCategories') || '[]');

let currentCardFontSize = localStorage.getItem('cardFontSize')
  ? parseInt(localStorage.getItem('cardFontSize'), 10)
  : 16;

/**
 * Primeni var(--card-font-size) i reload aktivni feed
 */
function applyCardFontSize() {
  document.documentElement.style.setProperty('--card-font-size', currentCardFontSize + 'px');
  localStorage.setItem('cardFontSize', currentCardFontSize);

  const activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;
  const cat = activeTab.getAttribute('data-tab');
  const container = document.getElementById('news-container');
  if (!cat || !container) return;

  if (cat === 'Aktuell') {
    displayAktuellFeeds().then(() => {
      container.scrollTop = 0;
    });
  } else {
    displayNewsByCategory(cat).then(() => {
      container.scrollTop = 0;
    });
  }
}

async function blockSource(src) {
  if (!blockedSources.includes(src)) {
    blockedSources.push(src);
    localStorage.setItem('blockedSources', JSON.stringify(blockedSources));

    // Sačuvaj u Redis-u
    try {
      await fetch('/api/block-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: src })
      });
    } catch (err) {
      console.error("Greška pri slanju blokiranog izvora u Redis:", err);
    }
  }
}

function isSourceBlocked(src) {
  return blockedSources.includes(src);
}

async function unblockSource(src) {
  blockedSources = blockedSources.filter(s => s !== src);
  localStorage.setItem('blockedSources', JSON.stringify(blockedSources));

  // Ukloni iz Redis-a
  try {
    await fetch('/api/unblock-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: src })
    });
  } catch (err) {
    console.error("Greška pri uklanjanju blokiranog izvora iz Redis-a:", err);
  }
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

/**
 * Dinamičko kreiranje tabova (sem Aktuell),
 * preskačemo blokirane kategorije.
 */
function buildTabs() {
  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  const existingTabs = tabsContainer.querySelectorAll('.tab:not([data-tab="Aktuell"])');
  existingTabs.forEach(t => t.remove());

  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }

  categoriesOrder.forEach(cat => {
    if (isCategoryBlocked(cat)) return;
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('data-tab', cat);
    btn.textContent = cat;
    tabsContainer.appendChild(btn);
  });
}

/**
 * Funkcije za Drag & Drop rearrange kategorija
 */
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

  categoriesOrder.forEach(cat => {
    const li = document.createElement('li');
    li.draggable = true;
    li.textContent = cat;

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

/**
 * Modal za Quellen
 */
function openQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex'; 

  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return; // ✅ Ovo je sada unutar funkcije
  sourcesListEl.innerHTML = '';

  const newsSources = [
    'Aargauer Zeitung – AZ', 'AK - Analyse & Kritik', 'Augustin', 'Blick', 
    'Cruiser Magazin', 'DER SPIEGEL', 'Der Freitag', 'Der Standard', 
    'Die Tageszeitung', 'Die Wochenzeitung - WOZ', 'DISPLAY-Magazin', 
    'Du und Ich', 'Falter', 'Jungle World', 'Kurier.at', 'Neues Deutschland', 
    'P.S. Zeitung', 'Profil', 'Queer.de', 'Salzburger Nachrichten', 
    'SIEGESSÄULE', 'St. Galler Tagblatt', 'Süddeutsche', 'Tage Anzeiger', 
    'Volksstimme', 'Vorwärts', 'Wiener Zeitung Online', 'ZEIT ONLINE'
  ];

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

/**
 * Zatvaranje modala Quellen
 */
function closeQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (quellenModal) {
    quellenModal.style.display = 'none';
  }
  loadFeeds();
}


/** initSwipe */
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
    // Uvek resetuj vertical scroll pre prelaska
    swipeContainer.scrollTop = 0;

    if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > swipeThreshold) {
      if (distX < 0) moveCategory(1);
      else moveCategory(-1);
    }
  }

  function moveCategory(dir) {
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

    // Dodatno, za svaki slučaj, skroluj na vrh nakon malog delay-a
    setTimeout(() => {
      swipeContainer.scrollTop = 0;
    }, 300);
  }

  function clickTab(cat) {
    const tabsContainer = document.getElementById('tabs-container');
    const swipeContainer = document.getElementById('news-container');
    const tab = document.querySelector(`.tab[data-tab="${cat}"]`);
  
    // Ako tab nije pronađen, prebacujemo se na "Aktuell" kao podrazumevani
    if (!tab) {
      const aktuell = document.querySelector('.tab[data-tab="Aktuell"]');
      if (aktuell) aktuell.click();
      return;
    }
  

    // Ručno centriranje taba unutar tabsContainer
    if (tabsContainer && tab) {
      const leftPos = tab.offsetLeft - (tabsContainer.offsetWidth / 2) + (tab.offsetWidth / 2);
      tabsContainer.scrollTo({
        left: Math.max(leftPos, 0),
        behavior: 'smooth'
      });
    }

    tab.click();

    // Posle klika, osiguramo da news-container ide na vrh
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

/** loadFeeds -> simuliramo klik na Aktuell */
function loadFeeds(defaultTab = 'Aktuell') {
  const tabBtn = document.querySelector(`.tab[data-tab="${defaultTab}"]`);
  if (tabBtn) {
    tabBtn.click();
  }
}

/** Poveć/smanji font-size */
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
  applyCardFontSize();
  buildTabs();
  initSwipe();

  const tabsContainer = document.getElementById('tabs-container');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', async (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;

      const allTabs = document.querySelectorAll('.tab');
      allTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected','false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');

      const cat = tab.getAttribute('data-tab');
      const container = document.getElementById('news-container');
      if (!container) return;

      if (cat === 'Aktuell') {
        await displayAktuellFeeds();
      } else {
        await displayNewsByCategory(cat);
      }
      

      // Posle učitavanja, resetuj scroll
      requestAnimationFrame(() => {
        container.scrollTop = 0;
      });
    });
  }

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
  if (incBtn) incBtn.onclick = increaseFontSize;
  const decBtn = document.getElementById('font-decrease');
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
/** iphone ide na blank page 
document.addEventListener("DOMContentLoaded", function () {
  const closeTutorialBtn = document.getElementById("close-tutorial");

  if (closeTutorialBtn) {
    closeTutorialBtn.onclick = function () {
      document.getElementById("tutorial-overlay").style.display = "none";

      // Provera da li je uređaj iPhone
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.close(); // Pokušaj zatvaranja taba

        // Ako zatvaranje taba ne uspe, preusmeri korisnika na praznu stranicu
        setTimeout(() => {
          window.location.href = "about:blank";
        }, 500);
      }
    };
  }
});
               */
