/************************************************
 * main.js
 ************************************************/

// Definišemo funkcije za otvaranje i zatvaranje Settings modala
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

// Uvoz iz feed.js
import {
  displayAktuellFeeds,
  displayNewsByCategory
} from './feeds.js';

// Uvoz iz sourcesConfig.js
import { brandMap, ALLOWED_SOURCES } from './sourcesConfig.js';

let categoriesOrder = [
  "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
  "Unterhaltung", "Reisen", "Lifestyle", "Auto",
  "Welt", "Politik", "Panorama", "Sonstiges"
];

let blockedSources = JSON.parse(localStorage.getItem('blockedSources') || '[]');
let blockedCategories = JSON.parse(localStorage.getItem('blockedCategories') || '[]');

// Dodajte "Sonstiges" u blockedCategories ako već nije prisutna
if (!blockedCategories.includes('Sonstiges')) {
  blockedCategories.push('Sonstiges');
  localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
}

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

/**
 * Pomoćna funkcija koja uklanja TLD-ove .CH, .DE, .AT (nezavisno od velikih/malih slova)
 */
function removeTLD(source) {
  return source.replace(/\.(ch|de|at)$/i, '');
}

/**
 * Normalizuje ime izvora (sva velika slova i bez razmaka)
 */
function normalizeSource(src) {
  return src.toUpperCase().replace(/\s+/g, '');
}

/**
 * Blokira dati izvor
 */
function blockSource(src) {
  const normalized = normalizeSource(src);
  if (!blockedSources.includes(normalized)) {
    blockedSources.push(normalized);
    localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
  }
}

/**
 * Otključava dati izvor
 */
function unblockSource(src) {
  const normalized = normalizeSource(src);
  blockedSources = blockedSources.filter(s => s !== normalized);
  localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
}

/**
 * Proverava da li je dati izvor blokiran
 */
function isSourceBlocked(src) {
  const normalized = normalizeSource(src);
  return blockedSources.includes(normalized);
}

/**
 * Blokira kategoriju
 */
function blockCategory(cat) {
  if (!blockedCategories.includes(cat)) {
    blockedCategories.push(cat);
    localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
  }
}

/**
 * Otključava kategoriju
 */
function unblockCategory(cat) {
  blockedCategories = blockedCategories.filter(c => c !== cat);
  localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
}

/**
 * Proverava da li je kategorija blokirana
 */
function isCategoryBlocked(cat) {
  return blockedCategories.includes(cat);
}

/**
 * Pomera kategoriju gore/dole u okviru categoriesOrder.
 */
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
 * Dinamičko kreiranje tabova (sem Aktuell), preskačemo blokirane kategorije.
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
 * Otvaranje modalnog prozora za rearrange kategorija (drag & drop)
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

  categoriesOrder.forEach((cat, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.textContent = cat;

    // Strelice za pomeranje
    const upArrow = document.createElement('div');
    upArrow.className = 'arrow-up';
    upArrow.onclick = () => moveCategory(index, -1);

    const downArrow = document.createElement('div');
    downArrow.className = 'arrow-down';
    downArrow.onclick = () => moveCategory(index, 1);

    // Dugme za skrivanje/otključavanje
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
      // BuildTabs da se odmah osveži prikaz
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

/**
 * Funkcije za drag & drop
 */
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
 * Modal za izvore ("Quellen"): UVEK prikazuje sve izvore iz ALLOWED_SOURCES
 */
function openQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex';

  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return;
  sourcesListEl.innerHTML = '';

  // Umesto izdvajanja iz feedova, ovde direktno uzmi sve dozvoljene izvore
  const allSources = ALLOWED_SOURCES.slice();
  // Sortiraj izvore po abecedi (case-insensitive)
  allSources.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  // Kreiraj UI elemente za svaki izvor, uz postojeći mehanizam block/unblock
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
      // Nakon izmene bloka, prisilno osveži feedove
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

/**
 * Funkcija za otvaranje Kategorien modala – sličan princip kao kod ostalih modala.
 */
function openKategorienModal() {
  const modal = document.getElementById('kategorien-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Ovde možete dodati logiku za popunjavanje liste kategorija
  }
  const closeBtn = document.getElementById('close-kategorien-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      // Vraćamo se u Settings modal nakon zatvaranja Kategorien modala
      openSettingsModal();
    };
  }
}

/**
 * Funkcija za otvaranje Über modala.
 */
function openUberModal() {
  const modal = document.getElementById('uber-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-uber-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      // Vraćamo se u Settings modal nakon zatvaranja Über modala
      openSettingsModal();
    };
  }
}

/**
 * Funkcija za otvaranje Kontakt modala.
 */
function openKontaktModal() {
  const modal = document.getElementById('kontakt-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-kontakt-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      openSettingsModal();
    };
  }
}

/**
 * Funkcija za otvaranje Datenschutz modala.
 */
function openDatenschutzModal() {
  const modal = document.getElementById('datenschutz-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-datenschutz-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      openSettingsModal();
    };
  }
}

/**
 * Inicijalizuje "prevlačenje" za promenu kategorija (swipe left/right).
 */
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
      swipeContainer.scrollTop = 0;
    }, 300);
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

    // Ručno centriranje taba
    if (tabsContainer && tab) {
      const leftPos = tab.offsetLeft
        - (tabsContainer.offsetWidth / 2)
        + (tab.offsetWidth / 2);
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

/**
 * Učitava feedove – simulira klik na "Aktuell" ili neku zadatu kategoriju.
 */
function loadFeeds(defaultTab = 'Aktuell') {
  const tabBtn = document.querySelector(`.tab[data-tab="${defaultTab}"]`);
  if (tabBtn) {
    tabBtn.click();
  }
}

/**
 * Povećanje i smanjenje veličine fonta
 */
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
      if (!tab || tab.classList.contains('active')) return; // Sprečava ponovni klik na aktivan tab

      // Uklanja "active" klasu sa svih tabova
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      // Postavlja "active" na kliknuti tab
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const category = tab.getAttribute('data-tab');
      const container = document.getElementById('news-container');
      if (!container) return;

      container.scrollTop = 0; // Resetuje scroll na vrh

      try {
        if (category === 'Aktuell') {
          await displayAktuellFeeds(true); // Force refresh
        } else {
          await displayNewsByCategory(category, true); // Force refresh
        }
      } catch (error) {
        console.error(`Greška prilikom učitavanja kategorije "${category}":`, error);
      }

      // Dodatno osiguranje da se prikaz osveži
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
  if (uberButton) {
    uberButton.onclick = () => {
      settingsModal.style.display = 'none';
      openUberModal();
    };
  }
  const closeUberBtn = document.getElementById('close-uber-modal');
  if (closeUberBtn) {
    closeUberBtn.onclick = () => {
      // U openUberModal() već je postavljeno zatvaranje sa povratkom u settings
      // Ako ovde ne dodajemo openSettingsModal(), poziv će biti obrađen u funkciji openUberModal()
      // ali ukoliko se zatvara direktno ovde, možete dodati:
      const uberModal = document.getElementById('uber-modal');
      if (uberModal) {
        uberModal.style.display = 'none';
        openSettingsModal();
      }
    };
  }

  // Kontakt
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

  // Datenschutz
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
