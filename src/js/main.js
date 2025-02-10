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
      openSettingsModal();
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
      openSettingsModal();
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
      openSettingsModal();
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
      openSettingsModal();
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
      container.scrollTop = 0;
      window.scrollTo(0, 0);
      console.log('Window scrollTo(0,0) pozvan za kategoriju:', currentCat);
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
  // Provera URL parametra "newsId" u query stringu
  const urlParams = new URLSearchParams(window.location.search);
  const newsId = urlParams.get('newsId');

  if (newsId) {
    try {
      const response = await fetch(`/api/news/${newsId}`);
      if (!response.ok) {
        console.error("API nije pronašao vest sa ID:", newsId);
        throw new Error("News not found");
      }
      const news = await response.json();
      console.log("Preuzeta vest:", news);
      openNewsModal(news);
    } catch (error) {
      console.error("Greška pri učitavanju vesti:", error);
    }
  } else {
    initFeeds();
  }

  // 📌 Dodatna provera za URL formata "/news/:id"
  const path = window.location.pathname;
  if (path.startsWith('/news/')) {
    const newsIdFromPath = path.split('/news/')[1];

    if (newsIdFromPath) {
      try {
        const response = await fetch(`/api/news/${newsIdFromPath}`);
        if (!response.ok) {
          console.error("API nije pronašao vest sa ID:", newsIdFromPath);
          throw new Error("News not found");
        }
        const news = await response.json();
        console.log("Preuzeta vest:", news);
        openNewsModal(news);
      } catch (error) {
        console.error("Greška pri učitavanju vesti:", error);
      }
    }
  }

  // Nastavak inicijalizacije UI elemenata
  applyCardFontSize();
  buildTabs();
  initSwipe();

  // Event listener za tabove
  const tabsContainer = document.getElementById('tabs-container');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', async (e) => {
      const tab = e.target.closest('.tab');
      if (!tab || tab.classList.contains('active')) return;
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const category = tab.getAttribute('data-tab');
      const container = document.getElementById('news-container');
      if (!container) return;

      // localStorage.setItem('activeTab', category);
      // localStorage.setItem(`${category}_scroll`, 0);

      try {
        if (category === 'Aktuell') {
          await displayAktuellFeeds(true);
        } else {
          await displayNewsByCategory(category, true);
        }
      } catch (error) {
        console.error(`Greška prilikom učitavanja kategorije "${category}":`, error);
      }

      setTimeout(() => {
        container.scrollTop = 0;
        console.log('Scroll resetovan na 0 nakon učitavanja kategorije:', category);
      }, 300);
    });
  }
loadFeeds();

  // Postavljanje event listener-a za Settings modal i srodne modale
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

window.addEventListener('load', () => {
  const container = document.getElementById('news-container');
  if (container) {
    container.scrollTop = 0;
  }
  window.scrollTo(0, 0);
  console.log('Scroll resetovan: container.scrollTop=', container ? container.scrollTop : 'nema container', 'window.pageYOffset=', window.pageYOffset);
});
