
/************************************************
 * main.js
 ************************************************/

import {
  displayNeuesteFeeds,
  displayAktuellFeeds,
  displayNewsByCategory,
  fetchAllFeedsFromServer
} from './feeds.js';

/**
 * Redosled kategorija i blokirane liste
 */
let categoriesOrder = [
  "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
  "Unterhaltung", "Reisen", "Lifestyle", "Auto",
  "Welt", "Politik", "Panorama", "Sonstiges"
];
let blockedSources = JSON.parse(localStorage.getItem('blockedSources') || '[]');
let blockedCategories = JSON.parse(localStorage.getItem('blockedCategories') || '[]');

/**
 * Set omiljenih vesti (po ID-ju).
 * Čuvamo u localStorage kao niz “favoriteIds”.
 */
let favoriteIds = JSON.parse(localStorage.getItem('favoriteIds') || '[]');

/**
 * Font size (naslovi + izvori u .news-card)
 */
let currentCardFontSize = localStorage.getItem('cardFontSize')
  ? parseInt(localStorage.getItem('cardFontSize'), 10)
  : 16;

/**
 * Funkcija koja primenjuje font size i osvežava aktivnu kategoriju.
 */
function applyCardFontSize() {
  document.documentElement.style.setProperty('--card-font-size', currentCardFontSize + 'px');
  localStorage.setItem('cardFontSize', currentCardFontSize.toString());

  const activeTab = document.querySelector('.tab.active');
  if (!activeTab) return;
  const cat = activeTab.getAttribute('data-tab');
  const container = document.getElementById('news-container');
  if (!cat || !container) return;

  if (cat === 'Neueste') {
    displayNeuesteFeeds().then(() => {
      container.scrollTop = 0;
    });
  } else if (cat === 'Aktuell') {
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
 * + i - za font size
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

/**
 * Blokiranje/deblokiranje izvora
 */
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

/**
 * Blokiranje/deblokiranje kategorija
 */
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
 * Favoriti (★):
 * - favoriteIds je niz string ID-jeva
 */
function addFavorite(id) {
  if (!favoriteIds.includes(id)) {
    favoriteIds.push(id);
    localStorage.setItem('favoriteIds', JSON.stringify(favoriteIds));
  }
}
function removeFavorite(id) {
  favoriteIds = favoriteIds.filter(x => x !== id);
  localStorage.setItem('favoriteIds', JSON.stringify(favoriteIds));
}
function isFavorite(id) {
  return favoriteIds.includes(id);
}

/**
 * Tabs
 */
function buildTabs() {
  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  // Uklonimo sve osim Neueste, Aktuell
  const existingTabs = tabsContainer.querySelectorAll('.tab:not([data-tab="Neueste"]):not([data-tab="Aktuell"])');
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
 * Modal za omiljene vesti
 */
async function openFavoritesModal() {
  const favModal = document.getElementById('favorites-modal');
  if (!favModal) return;
  favModal.style.display = 'flex';

  const favSearchInput = document.getElementById('favorites-search');
  if (favSearchInput) {
    favSearchInput.value = '';
    favSearchInput.removeEventListener('input', handleFavSearch);
    favSearchInput.addEventListener('input', handleFavSearch);
  }
  renderFavoritesList(favoriteIds);
}

function handleFavSearch(e) {
  const val = e.target.value.toLowerCase();
  fetchAllFeedsFromServer(false).then(allFeeds => {
    const favFeeds = allFeeds.filter(f => favoriteIds.includes(f.id));
    const filtered = favFeeds.filter(f => (f.title || '').toLowerCase().includes(val));
    renderFavoritesList(filtered.map(f => f.id));
  });
}

function renderFavoritesList(favArray) {
  const favListEl = document.getElementById('favorites-list');
  if (!favListEl) return;
  favListEl.innerHTML = '';

  fetchAllFeedsFromServer(false).then(allFeeds => {
    const byId = {};
    allFeeds.forEach(f => { byId[f.id] = f; });

    favArray.forEach(fid => {
      const feed = byId[fid];
      if (!feed) return;
      const div = document.createElement('div');
      div.className = 'fav-item';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'fav-title';
      titleSpan.textContent = feed.title || 'No title';

      div.appendChild(titleSpan);
      div.onclick = () => {
        // Minimalno: open news modal
        openNewsModalForFavorite(feed);
      };
      favListEl.appendChild(div);
    });
  });
}

function openNewsModalForFavorite(feed) {
  // Re-use news modal
  const modal = document.getElementById('news-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  const modalImage = document.getElementById('news-modal-image');
  const modalTitle = document.getElementById('news-modal-title');
  const modalDescription = document.getElementById('news-modal-description');
  const modalSourceTime = document.getElementById('news-modal-source-time');
  const closeModalButton = document.getElementById('close-news-modal');
  const weiterButton = document.getElementById('news-modal-weiter');
  const favButton = document.getElementById('news-fav-button');
  const searchBtn = document.getElementById('news-search-button');

  if (!modalImage || !modalTitle || !modalDescription || !modalSourceTime || !favButton) return;

  modalImage.src = feed.image || 'https://via.placeholder.com/240';
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || '';
  const sName = feed.source || 'Unbekannte Quelle';
  const d = feed.date_published || '';
  modalSourceTime.textContent = `${sName} - ${d}`;

  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };
  // Fav zvezdica
  if (isFavorite(feed.id)) {
    favButton.textContent = '★';
  } else {
    favButton.textContent = '☆';
  }
  favButton.onclick = () => {
    if (isFavorite(feed.id)) {
      removeFavorite(feed.id);
      favButton.textContent = '☆';
    } else {
      addFavorite(feed.id);
      favButton.textContent = '★';
    }
  };
  // Lupa (search)
  if (searchBtn) {
    searchBtn.onclick = () => {
      alert(`[Demo] Search within this article: ${feed.title}`);
    };
  }
}

function closeFavoritesModal() {
  const favModal = document.getElementById('favorites-modal');
  if (favModal) {
    favModal.style.display = 'none';
  }
  // Po želji: loadFeeds();
}

/**
 * Modal za kategorije (Drag & drop)
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

    const isBlockedCat = isCategoryBlocked(cat);
    const btn = document.createElement('button');
    btn.className = isBlockedCat ? 'unblock-button' : 'block-button';
    btn.textContent = isBlockedCat ? 'Entsperren' : 'Verbergen';

    btn.onclick = () => {
      if (isCategoryBlocked(cat)) {
        unblockCategory(cat);
        btn.className = 'block-button';
        btn.textContent = 'Verbergen';
      } else {
        blockCategory(cat);
        btn.className = 'unblock-button';
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
    li.textContent.replace('Verbergen', '').replace('Entsperren', '').trim()
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
 * Swipe
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
    const arr = ["Neueste", "Aktuell"];
    categoriesOrder.forEach(cat => {
      if (!isCategoryBlocked(cat)) {
        arr.push(cat);
      }
    });
    return arr;
  }

  async function showNextCategory() {
    await moveCategory(1);
  }
  async function showPreviousCategory() {
    await moveCategory(-1);
  }

  async function moveCategory(dir) {
    const cats = getAllSwipeCategories();
    const activeTab = document.querySelector('.tab.active');
    let currentCat = activeTab ? activeTab.getAttribute('data-tab') : "Neueste";
    let idx = cats.indexOf(currentCat);
    if (idx < 0) idx = 0;

    idx += dir;
    if (idx < 0) idx = 0;
    if (idx >= cats.length) idx = cats.length - 1;

    const newCat = cats[idx];
    await clickTab(newCat);
  }

  async function clickTab(category) {
    const tab = document.querySelector(`.tab[data-tab="${category}"]`);
    if (!tab) return;

    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected','false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected','true');

    const container = document.getElementById('news-container');
    if (!container) return;

    if (category === 'Neueste') {
      await displayNeuesteFeeds();
    } else if (category === 'Aktuell') {
      await displayAktuellFeeds();
    } else {
      await displayNewsByCategory(category);
    }
    container.scrollTop = 0;
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
 * loadFeeds
 */
function loadFeeds(defaultTab = 'Neueste') {
  const tabBtn = document.querySelector(`.tab[data-tab="${defaultTab}"]`);
  if (tabBtn) {
    tabBtn.click();
  }
}

/**
 * Glavni init
 */
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

      if (cat === 'Neueste') {
        await displayNeuesteFeeds();
      } else if (cat === 'Aktuell') {
        await displayAktuellFeeds();
      } else {
        await displayNewsByCategory(cat);
      }
      container.scrollTop = 0;
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

  // Font-size
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
