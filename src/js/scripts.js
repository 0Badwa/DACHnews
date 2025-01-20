/************************************************
 * scripts.js
 ************************************************/

document.addEventListener("DOMContentLoaded", () => {
  // Globalne promenljive
  let feeds = [];
  let currentIndex = 0;
  const itemsPerPage = 5;
  let firstSwipeOccurred = false; // Praćenje prvog swipa

  // Kategorije uključujući "Latest" kao sinonim za "Home"
  const categories = [
    "Latest", 
    "Technologie",
    "Gesundheit",
    "Sport",
    "Wirtschaft",
    "Kultur",
    "Auto",
    "Reisen",
    "Lifestyle",
    "Panorama",
    "Politik",
    "Unterhaltung",
    "Welt",
    "LGBT+",
    "Uncategorized"
  ];

  // Element za prikaz trenutne kategorije iznad vesti
  const categoryIndicator = document.createElement('div');
  categoryIndicator.className = "category-indicator";
  document.body.insertBefore(categoryIndicator, document.getElementById('news-container'));

  // Sakrij zeleni pravougaonik na početku
  function hideGreenRectangle() {
    const homeTab = document.querySelector('.tab[data-tab="Latest"]');
    if (homeTab) {
      homeTab.classList.remove('active-green'); 
    }
  }

  // Pokaži zeleni pravougaonik za trenutni aktivni tab
  function showGreenRectangle() {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      activeTab.classList.add('active-green');
    }
  }

  hideGreenRectangle(); // Sakrij odmah po učitavanju

  // Pomoćna funkcija za prikaz vremena od objave
  function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const seconds = Math.floor((now - past) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `vor ${interval} Jahr${interval > 1 ? 'en' : ''}`;

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `vor ${interval} Monat${interval > 1 ? 'en' : ''}`;

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `vor ${interval} Tag${interval > 1 ? 'en' : ''}`;

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `vor ${interval} Stunde${interval > 1 ? 'n' : ''}`;

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `vor ${interval} Minute${interval > 1 ? 'n' : ''}`;

    return `gerade eben`;
  }

  async function fetchAllFeedsFromServer() {
    try {
      const response = await fetch("/api/feeds");
      if (!response.ok) throw new Error("Neuspešno preuzimanje /api/feeds");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function cacheAllFeedsLocally(items) {
    localStorage.setItem('feeds', JSON.stringify(items));
  }

  function removeActiveClass() {
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
      tab.classList.remove('active-green'); 
    });
  }

  function createNewsCard(feed, useLazy = false) {
    const card = document.createElement('div');
    card.className = "news-card";

    const img = document.createElement('img');
    img.className = "news-card-image";
    img.src = feed.image || 'https://via.placeholder.com/150';
    img.alt = feed.title;

    const contentDiv = document.createElement('div');
    contentDiv.className = "news-card-content";

    const title = document.createElement('h3');
    title.className = "news-title";
    title.textContent = feed.title;

    const source = document.createElement('p');
    source.className = "news-meta";
    const sourceName = feed.source || 'Nepoznat izvor';
    const timeString = feed.date_published ? timeAgo(feed.date_published) : '';
    source.textContent = `${sourceName} • ${timeString}`;

    contentDiv.appendChild(title);
    contentDiv.appendChild(source);
    card.appendChild(img);
    card.appendChild(contentDiv);

    return card;
  }

  function updateDisplayedFeeds() {
    const container = document.getElementById('news-container');
    container.innerHTML = '';
    feeds.forEach(feed => {
      const card = createNewsCard(feed, false);
      container.appendChild(card);
    });
  }

  function displayAllFeeds() {
    const container = document.getElementById('news-container');
    if (!container) return;
    container.innerHTML = '';

    const sorted = [...feeds].sort((a, b) => {
      const dateA = new Date(a.date_published).getTime() || 0;
      const dateB = new Date(b.date_published).getTime() || 0;
      return dateB - dateA;
    });

    const uniqueFeedsMap = new Map();
    sorted.forEach(feed => {
      if (!uniqueFeedsMap.has(feed.id)) {
        uniqueFeedsMap.set(feed.id, feed);
      }
    });
    feeds = Array.from(uniqueFeedsMap.values());

    if (feeds.length === 0) {
      container.innerHTML = "<p>No news.</p>";
      return;
    }

    currentIndex = 0;
    updateDisplayedFeeds();
    updateCategoryIndicator("Latest");
  }

  async function displayNewsByCategory(category) {
    console.log(`Prikaz vesti za kategoriju: ${category}`);
    const container = document.getElementById('news-container');
    container.innerHTML = `<p>Vesti za kategoriju: ${category}</p>`;
    updateCategoryIndicator(category);
  }

  async function main() {
    const cachedFeeds = localStorage.getItem('feeds');
    if (cachedFeeds) {
      feeds = JSON.parse(cachedFeeds);
      displayAllFeeds();
    } else {
      const fresh = await fetchAllFeedsFromServer();
      feeds = fresh;
      cacheAllFeedsLocally(fresh);
      displayAllFeeds();
    }
    setInterval(async () => {
      const fresh = await fetchAllFeedsFromServer();
      if (fresh.length > feeds.length) {
        feeds = fresh;
        cacheAllFeedsLocally(feeds);
        displayAllFeeds();
      }
    }, 500000);
  }

  function updateCategoryIndicator(category) {
    if (categoryIndicator) {
      categoryIndicator.textContent = category;
      categoryIndicator.classList.add('fade-out');
      setTimeout(() => {
        categoryIndicator.classList.remove('fade-out');
        categoryIndicator.classList.add('fade-in');
        setTimeout(() => {
          categoryIndicator.classList.remove('fade-in');
        }, 300);
      }, 300);
    }
  }


  main().then(() => {
    const homeTab = document.querySelector('[data-tab="home"], [data-tab="Latest"]');
    const tabsContainer = document.getElementById('tabs-container');

    if (homeTab) {
      homeTab.addEventListener('click', (e) => {
        removeActiveClass();
        e.target.classList.add('active');
        e.target.setAttribute('aria-selected', 'true');
        displayAllFeeds();
        showGreenRectangle();
      });
    }

    if (tabsContainer) {
      const skipList = [];
      categories
        .filter(cat => !skipList.includes(cat))
        .forEach(cat => {
          const btn = document.createElement('button');
          btn.classList.add('tab');
          btn.setAttribute('data-tab', cat);
          btn.setAttribute('role', 'tab');
          btn.setAttribute('aria-selected', 'false');
          btn.textContent = cat;

          btn.addEventListener('click', (ev) => {
            removeActiveClass();
            ev.target.classList.add('active');
            ev.target.setAttribute('aria-selected', 'true');
            showGreenRectangle();
            if (cat === 'Latest' || cat === 'home') {
              displayAllFeeds();
            } else {
              displayNewsByCategory(cat);
            }
            updateCategoryIndicator(cat);
          });

          tabsContainer.appendChild(btn);
        });
    }

    const swipeContainer = document.getElementById('news-container');
    let touchstartX = 0;
    let touchendX = 0;
    const swipeThreshold = 50;

    function handleGesture() {
      if (!firstSwipeOccurred) {
        firstSwipeOccurred = true;
        showGreenRectangle();
      }
      if (touchendX < touchstartX - swipeThreshold) {
        showNextCategory();
      }
      if (touchendX > touchstartX + swipeThreshold) {
        showPreviousCategory();
      }
    }

    if (swipeContainer) {
      swipeContainer.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
      });

      swipeContainer.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleGesture();
      });
    }

    function showNextCategory() {
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let currentIdx = categories.indexOf(currentCat);
      if (currentIdx < categories.length - 1) {
        currentIdx++;
        const nextCat = categories[currentIdx];
        const nextTab = document.querySelector(`.tab[data-tab="${nextCat}"]`);
        if (nextTab) nextTab.click();
      }
    }

    function showPreviousCategory() {
      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;
      const currentCat = activeTab.getAttribute('data-tab');
      let currentIdx = categories.indexOf(currentCat);
      if (currentIdx > 0) {
        currentIdx--;
        const prevCat = categories[currentIdx];
        const prevTab = document.querySelector(`.tab[data-tab="${prevCat}"]`);
        if (prevTab) prevTab.click();
      }
    }
  });

   /************************************************
   * Settings Menu funkcionalnost
   ************************************************/
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

  function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Ako postoji dugme za promenu teme, ažuriraj njegov tekst
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = newTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
  }

  function changeFontSize(delta) {
    const body = document.body;
    const currentSize = parseInt(window.getComputedStyle(body).fontSize);
    const newSize = currentSize + delta;
    if (newSize >= 12 && newSize <= 24) {
      body.style.fontSize = newSize + 'px';
      localStorage.setItem('fontSize', newSize);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Inicijalizacija Settings menija i sličnih funkcija
    const menuButton = document.getElementById('menu-button');
    const closeSettingsButton = document.getElementById('close-settings');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const fontIncreaseButton = document.getElementById('font-increase');
    const fontDecreaseButton = document.getElementById('font-decrease');

    if (menuButton) {
      menuButton.addEventListener('click', openSettingsModal);
    }
    if (closeSettingsButton) {
      closeSettingsButton.addEventListener('click', closeSettingsModal);
    }
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
        closeSettingsModal();
      });
    }
    if (fontIncreaseButton) {
      fontIncreaseButton.addEventListener('click', () => changeFontSize(1));
    }
    if (fontDecreaseButton) {
      fontDecreaseButton.addEventListener('click', () => changeFontSize(-1));
    }

    // Učitaj spremljene postavke teme i veličine fonta
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      document.body.style.fontSize = savedFontSize + 'px';
    }
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = savedTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
  });

  console.log('Script loaded');


  document.addEventListener("DOMContentLoaded", function() {
    const lazyImages = document.querySelectorAll('img.lazy');
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove("lazy");
            img.classList.add("loaded");
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: "0px 0px 50px 0px",
        threshold: 0.01
      });

      lazyImages.forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      lazyImages.forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove("lazy");
      });
    }
  });
});
