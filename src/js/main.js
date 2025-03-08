/************************************************
 * main.js
 ************************************************/

import { openNewsModal } from './newsModal.js';
import { initFeeds, displayAktuellFeeds, displayNewsByCategory } from './feeds.js';
import { brandMap, ALLOWED_SOURCES, sourceAliases, sourceDisplayNames } from './sourcesConfig.js';
import { initializeLazyLoading, cleanupObservers } from './ui.js'; // Potvrđujemo da je uvoz tačan


if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

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
 * Primeni var(--card-font-size) i osveži trenutni feed
 */
function applyCardFontSize() {
  document.documentElement.style.setProperty('--card-font-size', currentCardFontSize + 'px');
  localStorage.setItem('cardFontSize', currentCardFontSize);
}

/** Pomoćne funkcije block/unblock **/
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

/** Uređivanje reda kategorija **/
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

/** Uklanja 'active' sa svih tabova **/
function removeActiveClass() {
  const allTabs = document.querySelectorAll('.tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
}


/** Kreira tabove **/
// Globalni AbortController za upravljanje event listenerima
let controller = new AbortController();

function buildTabs() {
  // Pre nego što dodamo nove listenere, uklanjamo sve stare
  controller.abort();
  controller = new AbortController(); // Kreiramo novi controller

  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  // Uklanjamo stare tabove osim "Aktuell"
  const existingTabs = tabsContainer.querySelectorAll('.tab:not([data-tab="Aktuell"])');
  existingTabs.forEach(t => t.remove());

  // Kreiramo tabove ponovo
  categoriesOrder.forEach(cat => {
    if (isCategoryBlocked(cat)) return;
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('data-tab', cat);
    btn.textContent = cat;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.id = 'tab-' + cat.toLowerCase().replace(/\s+/g, '-');
    btn.setAttribute('aria-controls', 'news-container');

    // Sada dodajemo event listener sa AbortController-om
    btn.addEventListener('click', () => {
      removeActiveClass();
      btn.classList.add('active');
      if (cat === 'Aktuell') {
        displayAktuellFeeds();
      } else {
        displayNewsByCategory(cat);
      }
    }, { signal: controller.signal });

    tabsContainer.appendChild(btn);
  });
}


/** Otvara modal za menjanje kategorija **/
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

    const categoryLeft = document.createElement('div');
    categoryLeft.className = 'category-left';

    const upArrow = document.createElement('div');
    upArrow.className = 'arrow-up';
    upArrow.onclick = () => moveCategory(index, -1);

    const downArrow = document.createElement('div');
    downArrow.className = 'arrow-down';
    downArrow.onclick = () => moveCategory(index, 1);

    const categoryName = document.createElement('span');
    categoryName.className = 'category-name';
    categoryName.textContent = cat;

    categoryLeft.appendChild(upArrow);
    categoryLeft.appendChild(downArrow);
    categoryLeft.appendChild(categoryName);

    // Switch
    const switchContainer = document.createElement('div');
    switchContainer.className = 'switch-container';
    if (!isCategoryBlocked(cat)) {
      switchContainer.classList.add('active');
    }

    const switchSlider = document.createElement('div');
    switchSlider.className = 'switch-slider';
    switchContainer.appendChild(switchSlider);

    /**
     * Kada blokiraš/deblokiraš kategoriju:
     *  - ukloni keširani feed te kategorije,
     *  - odmah osveži trenutni tab.
     */
    switchContainer.onclick = () => {
      if (isCategoryBlocked(cat)) {
        unblockCategory(cat);
        switchContainer.classList.add('active');
      } else {
        blockCategory(cat);
        switchContainer.classList.remove('active');
      }
      // Ukloni keš za datu kategoriju
      const catForUrl = (cat === 'Sonstiges') ? 'Uncategorized' : cat;
      localStorage.removeItem(`feeds-${catForUrl}`);

      // Osveži feed u aktivnom tabu
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) {
        const catName = activeTab.getAttribute('data-tab');
        if (catName === 'Aktuell') {
          displayAktuellFeeds(true);
        } else {
          displayNewsByCategory(catName, true);
        }
      }
    };

    li.appendChild(categoryLeft);
    li.appendChild(switchContainer);

    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);

    ul.appendChild(li);
  });
}

/** Zatvara kategorien modal **/
function closeKategorienModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'none';

  const ul = document.getElementById('sortable-list');
  if (ul) {
    const items = [...ul.children].map(li =>
      li.textContent.split('Verbergen')[0].split('Entsperren')[0].trim()
    );
    categoriesOrder = items;
    localStorage.setItem('categoriesOrder', JSON.stringify(categoriesOrder));
  }

    // Osvežava stranicu nakon zatvaranja modala
    location.reload();

    openSettingsModal();

  }

/** Drag & Drop logika **/
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



/** Quellen modal **/
function openQuellenModal() {
  if (!ALLOWED_SOURCES || ALLOWED_SOURCES.length === 0) {
    console.error("Greška: ALLOWED_SOURCES je prazan!");
    return;
  }

  const quellenModal = document.getElementById('quellen-modal');
  if (!quellenModal) return;
  quellenModal.style.display = 'flex';

  const sourcesListEl = document.getElementById('sources-list');
  if (!sourcesListEl) return;
  sourcesListEl.innerHTML = '';

  const groupedSources = { de: [], at: [], ch: [] };

  ALLOWED_SOURCES.forEach(src => {
    let normalized = src.toLowerCase();
    for (let mainSource in sourceAliases) {
      if (sourceAliases[mainSource].includes(normalized)) {
        normalized = mainSource;
        break;
      }
    }
    const country = brandMap[normalized] || 'other';
    if (groupedSources[country]) {
      groupedSources[country].push(src);
    }
  });

  for (let country in groupedSources) {
    groupedSources[country].sort();
  }

  const countryNames = {
    de: '🇩🇪 Deutschland',
    at: '🇦🇹 Österreich',
    ch: '🇨🇭 Schweiz'
  };

  Object.keys(groupedSources).forEach(country => {
    if (groupedSources[country].length > 0) {
      // Dodaj prazan red iznad imena države
      const spacer = document.createElement('div');
      spacer.style.height = '1rem';
      sourcesListEl.appendChild(spacer);

      // Kreiraj kontejner za državu i switch
      const countryContainer = document.createElement('div');
      countryContainer.className = 'source-item country-header';

      const countryHeader = document.createElement('h3');
      countryHeader.textContent = countryNames[country];
      countryHeader.style.margin = '0';
      countryHeader.style.fontWeight = 'bold';

      const countrySwitchContainer = document.createElement('div');
      countrySwitchContainer.classList.add('switch-container');
      const isCountryBlocked = groupedSources[country].every(src => isSourceBlocked(src));
      if (!isCountryBlocked) {
        countrySwitchContainer.classList.add('active');
      }

      const countrySwitchSlider = document.createElement('div');
      countrySwitchSlider.classList.add('switch-slider');
      countrySwitchContainer.appendChild(countrySwitchSlider);

      const countrySources = groupedSources[country]; // Definisanje countrySources ovde za closure

      countrySwitchContainer.onclick = () => {
        const shouldBlock = countrySwitchContainer.classList.contains('active');
        const sourceItems = sourcesListEl.querySelectorAll(`.source-item:not(.country-header)`);

        // Blokiraj ili odblokiraj sve medije iz države
        countrySources.forEach(src => {
          if (shouldBlock) {
            blockSource(src);
          } else {
            unblockSource(src);
          }
        });

        // Ažuriraj vizuelno stanje switch-eva za medije unutar države
        sourceItems.forEach(item => {
          const span = item.querySelector('span[data-source-lc]');
          if (span) {
            const itemSrcLC = span.getAttribute('data-source-lc');
            // Poredi sa countrySources (prebačenim u lowercase)
            if (countrySources.map(s => s.toLowerCase()).includes(itemSrcLC)) {
              const switchContainer = item.querySelector('.switch-container');
              if (shouldBlock) {
                switchContainer.classList.remove('active');
              } else {
                switchContainer.classList.add('active');
              }
            }
          }
        });

        countrySwitchContainer.classList.toggle('active');

        // Osveži feed nakon promene
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
          const catName = activeTab.getAttribute('data-tab');
          if (catName === 'Aktuell') {
            displayAktuellFeeds(true);
          } else {
            displayNewsByCategory(catName, true);
          }
        }
      };

      countryContainer.appendChild(countryHeader);
      countryContainer.appendChild(countrySwitchContainer);
      sourcesListEl.appendChild(countryContainer);

      groupedSources[country].forEach(src => {
        const sourceItem = document.createElement('div');
        sourceItem.className = 'source-item';

        const spanName = document.createElement('span');
        // Postavljamo data-source-lc atribut u malim slovima
        spanName.textContent = sourceDisplayNames[src] || src;
        spanName.setAttribute('data-source-lc', src.toLowerCase());

        const isBlocked = isSourceBlocked(src);

        const switchContainer = document.createElement("div");
        switchContainer.classList.add("switch-container");
        switchContainer.onclick = () => {
          toggleSource(src, switchContainer);
          // Ažuriraj stanje switch-a države nakon promene
          const countrySwitch = sourcesListEl.querySelector(`.country-header .switch-container`);
          if (countrySwitch) {
            const isCountryStillActive = countrySources.some(s => !isSourceBlocked(s));
            countrySwitch.classList.toggle('active', isCountryStillActive);
          }
          // Ažuriraj vizuelno stanje ostalih switch-eva unutar države
          const allSourceItems = sourcesListEl.querySelectorAll(`.source-item:not(.country-header)`);
          allSourceItems.forEach(item => {
            const innerSpan = item.querySelector('span[data-source-lc]');
            if (innerSpan) {
              const innerSourceLC = innerSpan.getAttribute('data-source-lc');
              if (countrySources.map(s => s.toLowerCase()).includes(innerSourceLC)) {
                const innerSwitch = item.querySelector('.switch-container');
                innerSwitch.classList.toggle('active', !isSourceBlocked(innerSourceLC));
              }
            }
          });
        };

        const switchSlider = document.createElement("div");
        switchSlider.classList.add("switch-slider");
        switchContainer.appendChild(switchSlider);

        if (!isBlocked) {
          switchContainer.classList.add('active');
        }

        sourceItem.appendChild(spanName);
        sourceItem.appendChild(switchContainer);
        sourcesListEl.appendChild(sourceItem);
      });
    }
  });
}




/** Zatvara quellen modal **/
function closeQuellenModal() {
  const quellenModal = document.getElementById('quellen-modal');
  if (quellenModal) {
    quellenModal.style.display = 'none';
  }
  openSettingsModal();
}

/**
 * @function toggleSource
 * Kada kliknemo na switch: blokiramo/odblokiramo izvor,
 * obrišemo keš i osvežimo aktivnu kategoriju, tako da odmah nestanu vesti.
 */
function toggleSource(source, element) {
  element.classList.toggle("active");

  if (element.classList.contains("active")) {
    unblockSource(source);
  } else {
    blockSource(source);
  }
  // Uklonimo keš 'Aktuell' (može i ostale po potrebi)
  localStorage.removeItem('feeds-Aktuell');

  // Osvežimo feed u aktivnom tabu
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    const catName = activeTab.getAttribute('data-tab');
    if (catName === 'Aktuell') {
      displayAktuellFeeds(true);
    } else {
      displayNewsByCategory(catName, true);
    }
  }
}

/** 
 * Ne menjamo buildTabs() ni swipe ovde, samo re-fetchujemo feed
 * da sakrijemo izvore i kategorije odmah.
 */
function openKategorienModal() {
  const kategorienModal = document.getElementById('kategorien-modal');
  if (!kategorienModal) return;
  kategorienModal.style.display = 'flex';

  const categoriesListEl = document.getElementById('sortable-list');
  if (!categoriesListEl) return;
  categoriesListEl.innerHTML = '';

  const categories = [
    "Technologie", "Gesundheit", "Sport", "Wirtschaft",
    "Kultur", "Unterhaltung", "Reisen", "Lifestyle",
    "Auto", "Welt", "Politik", "Panorama", "Sonstiges"
  ];

  categories.forEach(category => {
    const categoryItem = document.createElement('div');
    categoryItem.className = 'source-item';

    const spanName = document.createElement('span');
    spanName.textContent = category;

    const switchContainer = document.createElement('div');
    switchContainer.classList.add('switch-container');
    if (!isCategoryBlocked(category)) {
      switchContainer.classList.add('active');
    }

    // Ovde bi isto mogla da se doda logika za refresh, ali
    // openRearrangeModal već ima identičan kod, pa se tamo menja.
    // Ovaj "openKategorienModal" je samo ako koristite drugačiji UI prikaz.
    // Možete iskopirati identičan pristup ako je potreban i ovde.
    const switchSlider = document.createElement('div');
    switchSlider.classList.add('switch-slider');
    switchContainer.appendChild(switchSlider);

    switchContainer.onclick = () => {
      if (switchContainer.classList.contains('active')) {
        blockCategory(category);
        switchContainer.classList.remove('active');
      } else {
        unblockCategory(category);
        switchContainer.classList.add('active');
      }
      // Ovde takođe:
      const catForUrl = (category === 'Sonstiges') ? 'Uncategorized' : category;
      localStorage.removeItem(`feeds-${catForUrl}`);
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) {
        const catName = activeTab.getAttribute('data-tab');
        if (catName === 'Aktuell') {
          displayAktuellFeeds(true);
        } else {
          displayNewsByCategory(catName, true);
        }
      }
    };

    categoryItem.appendChild(spanName);
    categoryItem.appendChild(switchContainer);
    categoriesListEl.appendChild(categoryItem);
  });
}


/** Swipe init **/
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
      window.scrollTo(0, 0);
    }, 500);
  }

  function clickTab(cat) {
    const tabsContainer = document.getElementById('tabs-container');
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
      swipeContainer.scrollTop = 0;
    });
  }

  swipeContainer.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touchstartX = t.screenX;
    touchstartY = t.screenY;
  }, { passive: true });

  swipeContainer.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    touchendX = t.screenX;
    touchendY = t.screenY;
    handleGesture();
  }, { passive: true });
}

/** Inicijalno učitavanje feedova **/
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

/** DOMContentLoaded **/
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('initializeLazyLoading:', typeof initializeLazyLoading); // Treba da ispiše "function"
    const cleanupLazyLoading = initializeLazyLoading(); // Pozivamo funkciju
    console.log('Lazy loading initialized'); // Dodajemo log za proveru

    // Efikasno dohvaćanje newsId iz URL-a
    const urlParams = new URLSearchParams(window.location.search);
    let newsId = urlParams.get('newsId') ?? window.location.pathname.split('/news/')[1] ?? null;

    if (newsId) {
      try {
        const response = await fetch(`${window.location.origin}/api/news/${newsId}`);
        if (response.ok) {
          const news = await response.json();
          openNewsModal(news);
        } else {
          console.error("[ERROR] Vest nije pronađena:", newsId);
        }
      } catch (error) {
        console.error("[ERROR] Greška pri učitavanju vesti:", error);
      }
    }

    // Paralelna inicijalizacija ključnih funkcija
    await Promise.all([
      applyCardFontSize(),
      buildTabs(),
      initSwipe(),
      initFeeds()
    ]);

    window.addEventListener('beforeunload', () => {
      cleanupLazyLoading();
      cleanupObservers();
    });
  } catch (error) {
    console.error("[DOMContentLoaded] Greška:", error);
  }
});


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
  };

/** Otvara Über modal **/
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

/** Otvara Kontakt modal **/
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

/** Otvara Datenschutz modal **/
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
