/**
 * main.js
 * 
 * Vraćena logika da tabs-container klikom prikazuje feed u #news-container.
 * Implementirane funkcije za:
 *  - blokiranje/deblokiranje izvora (blockSource, unblockSource, isSourceBlocked)
 *  - blokiranje/deblokiranje kategorija (blockCategory, unblockCategory, isCategoryBlocked)
 *  - drag & drop reorder kategorija (categoriesOrder, handleDragStart, handleDrop, itd.)
 *  - čuvanje veličine fonta i primena
 */

import { displayNeuesteFeeds, displayAktuellFeeds, displayNewsByCategory } from './feeds.js';

// Globalne promenljive
let categoriesOrder = [
  "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
  "LGBT+", "Unterhaltung", "Reisen", "Lifestyle", "Auto",
  "Welt", "Politik", "Panorama", "Sonstiges"
];
let blockedSources = JSON.parse(localStorage.getItem('blockedSources') || '[]');
let blockedCategories = JSON.parse(localStorage.getItem('blockedCategories') || '[]');
let currentFontSize = localStorage.getItem('fontSize') ? parseInt(localStorage.getItem('fontSize')) : 16;

/**
 * Čuvanje i primena veličine fonta (body) + feed...
 */
function applyFontSize() {
  document.body.style.fontSize = currentFontSize + 'px';
  localStorage.setItem('fontSize', currentFontSize);
}

/**
 * Blokiranje izvora
 */
function blockSource(source) {
  if (!blockedSources.includes(source)) {
    blockedSources.push(source);
    localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
  }
}

/**
 * Deblokiranje izvora
 */
function unblockSource(source) {
  blockedSources = blockedSources.filter(s => s !== source);
  localStorage.setItem('blockedSources', JSON.stringify(blockedSources));
}

/**
 * Provera da li je izvor blokiran
 */
function isSourceBlocked(source) {
  return blockedSources.includes(source);
}

/**
 * Blokiranje kategorije
 */
function blockCategory(cat) {
  if (!blockedCategories.includes(cat)) {
    blockedCategories.push(cat);
    localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
  }
}

/**
 * Deblokiranje kategorije
 */
function unblockCategory(cat) {
  blockedCategories = blockedCategories.filter(c => c !== cat);
  localStorage.setItem('blockedCategories', JSON.stringify(blockedCategories));
}

/**
 * Da li je kategorija blokirana
 */
function isCategoryBlocked(cat) {
  return blockedCategories.includes(cat);
}

// ***** Drag & drop reorder kategorija *****
function openRearrangeModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;

  // Otvaramo
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
    // Ako je cat u blockedCategories -> checkboks ce biti check
    const li = document.createElement('li');
    li.draggable = true;

    const catLabel = document.createElement('span');
    catLabel.textContent = cat;

    // Strelice / brisanje / nesto
    const btnHide = document.createElement('button');
    btnHide.textContent = isCategoryBlocked(cat) ? 'Entsperren' : 'Blockieren';
    btnHide.onclick = () => {
      if (isCategoryBlocked(cat)) {
        unblockCategory(cat);
        btnHide.textContent = 'Blockieren';
      } else {
        blockCategory(cat);
        btnHide.textContent = 'Entsperren';
      }
    };

    li.appendChild(document.createTextNode(cat));
    li.appendChild(btnHide);

    // Drag & Drop
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

  // Uklanjamo opaciti
  const ul = dropTarget.parentNode;
  const allItems = [...ul.children];
  const draggedItem = allItems.find(li => li.textContent.trim() === draggedCat);
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
 * Zatvaramo kategorien modal i čuvamo novoredosled
 */
function closeKategorienModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'none';

  // Skladištimo nove redoslede
  const ul = document.getElementById('sortable-list');
  const items = [...ul.children].map(li => li.textContent.trim());
  categoriesOrder = items;
  localStorage.setItem('categoriesOrder', JSON.stringify(categoriesOrder));
}

/**
 * Otvaranje modal-a za Quellen
 */
function openQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex';

  // Napunimo spisak
  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return;
  sourcesListEl.innerHTML = '';

  // Primer niz izvora
  const newsSources = ['Bild', 'Zeit', 'Blick', 'Heise', 'Spiegel']; 
  // Možete dohvatiti i dinamički iz feedova

  newsSources.forEach(src => {
    const sourceItem = document.createElement('div');
    sourceItem.className = 'source-item';

    const spanName = document.createElement('span');
    spanName.textContent = src;

    const blockBtn = document.createElement('button');
    const isBlocked = isSourceBlocked(src);
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
      // Ponovo ucitati feedove...
      loadFeeds();
    };

    sourceItem.appendChild(spanName);
    sourceItem.appendChild(blockBtn);
    sourcesListEl.appendChild(sourceItem);
  });
}

/**
 * Zatvorimo quellen modal
 */
function closeQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (quellenModal) {
    quellenModal.style.display = 'none';
  }
  // Ponovo load feed
  loadFeeds();
}

/**
 * Inicijalno učitavanje feedova (po tab-u)
 */
function loadFeeds(defaultTab = 'Neueste') {
  // Možemo, recimo, kliknuti simulirano na tab
  const tabBtn = document.querySelector(`.tab[data-tab="${defaultTab}"]`);
  if (tabBtn) tabBtn.click();
}

/**
 * Glavna init logika
 */
document.addEventListener('DOMContentLoaded', () => {
  // Učitavanje veličine fonta
  if (localStorage.getItem('fontSize')) {
    currentFontSize = parseInt(localStorage.getItem('fontSize'), 10);
  }
  applyFontSize();

  // Tabs event
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

  // Automatski tab -> Neueste
  const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
  if (neuesteTab) {
    neuesteTab.click();
  }

  // Event za Settings modal
  const menuButton = document.getElementById('menu-button');
  const closeSettingsBtn = document.getElementById('close-settings');
  const settingsModal = document.getElementById('settings-modal');
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
      loadFeeds(); // posle menjanja redosleda i blokade - reload
    };
  }

  // Schriftgröße
  const incBtn = document.getElementById('font-increase');
  const decBtn = document.getElementById('font-decrease');
  if (incBtn) {
    incBtn.onclick = () => {
      currentFontSize += 1;
      if (currentFontSize > 40) currentFontSize = 40;
      applyFontSize();
    };
  }
  if (decBtn) {
    decBtn.onclick = () => {
      currentFontSize -= 1;
      if (currentFontSize < 10) currentFontSize = 10;
      applyFontSize();
    };
  }

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
  // Ako nije prikazan tutorial ranije, prikaži:
  const tutorialShown = localStorage.getItem('tutorialShown');
  if (!tutorialShown) {
    const tutOverlay = document.getElementById('tutorial-overlay');
    if (tutOverlay) tutOverlay.style.display = 'flex';
  }

  // Inicijalno učitavanje feeda
  loadFeeds('Neueste');
});
