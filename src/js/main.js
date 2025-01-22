/**
 * main.js
 *
 * Glavni fajl za logiku:
 * - Dinamičko kreiranje tabova (kategorija)
 * - Blokiranje/deblokiranje izvora (blockSource, unblockSource)
 * - Blokiranje/deblokiranje kategorija (blockCategory, unblockCategory)
 * - Drag & drop reorder kategorija (categoriesOrder)
 * - Čuvanje i primena veličine fonta samo za news-cards (preko :root --card-font-size)
 * - Tabs event listener da prikazuje feedove (Neueste, Aktuell ili data-tab)
 * - Zelena boja za naslove i izvore u modalu (postavljeno u styles.css)
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

// Umesto da menjamo body fontSize, menjaćemo var(--card-font-size)
let currentCardFontSize = localStorage.getItem('cardFontSize')
  ? parseInt(localStorage.getItem('cardFontSize'), 10)
  : 16;

/** Primeni veličinu fonta isključivo na kartice (news-card) */
function applyCardFontSize() {
  const root = document.documentElement;
  root.style.setProperty('--card-font-size', currentCardFontSize + 'px');
  localStorage.setItem('cardFontSize', currentCardFontSize);
}

/** Block / Unblock izvora */
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
export function isSourceBlocked(source) {
  return blockedSources.includes(source);
}

/** Block / Unblock kategorije */
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
export function isCategoryBlocked(cat) {
  return blockedCategories.includes(cat);
}

/** Drag & drop reorder kategorija */
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
    // kreiramo li
    const li = document.createElement('li');
    li.draggable = true;
    li.textContent = cat;

    // Block / Unblock dugme
    const btn = document.createElement('button');
    btn.textContent = isCategoryBlocked(cat) ? 'Entsperren' : 'Blockieren';
    btn.onclick = () => {
      if (isCategoryBlocked(cat)) {
        unblockCategory(cat);
        btn.textContent = 'Blockieren';
      } else {
        blockCategory(cat);
        btn.textContent = 'Entsperren';
      }
    };

    li.appendChild(btn);

    // D&D
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);

    ul.appendChild(li);
  });
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
function closeKategorienModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'none';

  // Skladištimo nove redoslede
  const ul = document.getElementById('sortable-list');
  if (!ul) return;
  const items = [...ul.children].map(li => li.textContent.trim().split('Block')[0].trim());
  categoriesOrder = items;
  localStorage.setItem('categoriesOrder', JSON.stringify(categoriesOrder));
}

/** Otvaranje modala za Quellen */
function openQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex';

  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return;
  sourcesListEl.innerHTML = '';

  // Hardkodovan spisak, ili generisati iz feed-ova
  const newsSources = ['Bild', 'Zeit', 'Blick', 'Heise', 'Spiegel'];
  newsSources.forEach(src => {
    const sourceItem = document.createElement('div');
    sourceItem.className = 'source-item';

    const spanName = document.createElement('span');
    spanName.textContent = src;

    const isBlocked = isSourceBlocked(src);
    const blockBtn = document.createElement('button');
    blockBtn.className = isBlocked ? 'unblock-button' : 'block-button';
    blockBtn.textContent = isBlocked ? 'Entsperren' : 'Blockieren';

    blockBtn.onclick = () => {
      if (isSourceBlocked(src)) {
        unblockSource(src);
        blockBtn.className = 'block-button';
        blockBtn.textContent = 'Blockieren';
      } else {
        blockSource(src);
        blockBtn.className = 'unblock-button';
        blockBtn.textContent = 'Entsperren';
      }
      loadFeeds(); // refresh feed
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

/** Povećavanje / smanjivanje font-size isključivo za news-cards */
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

/** loadFeeds -> pokrećemo Neueste po defaultu */
function loadFeeds(tab = "Neueste") {
  const tabBtn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.click();
}

/** Dinamičko kreiranje tabova iz categoriesOrder i blockedCategories */
function buildTabs() {
  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  // Prvo obrišemo sve što postoji sem Neueste i Aktuell
  const existingTabs = tabsContainer.querySelectorAll('.tab:not([data-tab="Neueste"]):not([data-tab="Aktuell"])');
  existingTabs.forEach(t => t.remove());

  // Učitamo categoriesOrder iz localStorage
  const savedOrder = localStorage.getItem('categoriesOrder');
  if (savedOrder) {
    categoriesOrder = JSON.parse(savedOrder);
  }

  categoriesOrder.forEach(cat => {
    // Ako je blokirana kategorija -> preskoči
    if (isCategoryBlocked(cat)) return;

    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('data-tab', cat);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = cat;
    tabsContainer.appendChild(btn);
  });
}

/** Glavna init logika */
document.addEventListener('DOMContentLoaded', () => {
  // Primeni veličinu fonta (news-cards)
  applyCardFontSize();

  // Dinamički kreiramo tabove iz categoriesOrder
  buildTabs();

  // Tabs event - klikanje
  const tabsContainer = document.getElementById('tabs-container');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', async (e) => {
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

  // Automatski neueste
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
      // rebuild tabs (posle reorder i block) i reload feed
      buildTabs();
      loadFeeds();
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
