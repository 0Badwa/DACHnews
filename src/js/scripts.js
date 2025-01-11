// scripts.js
const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.tab-content');

// Tab navigacija
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    contents.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const activeContent = document.getElementById(tab.dataset.tab);
    if (activeContent) {
      activeContent.classList.add('active');
    }
  });
});

// Dropdown meni za podešavanja
const settingsButton = document.getElementById('settings-button');
const dropdownMenu = document.getElementById('dropdown-menu');

settingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isExpanded = settingsButton.getAttribute('aria-expanded') === 'true';
  settingsButton.setAttribute('aria-expanded', String(!isExpanded));
  dropdownMenu.style.display = dropdownMenu.style.display === 'flex' ? 'none' : 'flex';
});

document.addEventListener('click', (e) => {
  if (!settingsButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.style.display = 'none';
    settingsButton.setAttribute('aria-expanded', 'false');
  }
});

// Tema: tamni i svetli režim
const toggleDarkModeButton = document.getElementById('toggle-dark-mode');
toggleDarkModeButton.addEventListener('click', () => {
  const body = document.body;
  const darkModeActive = body.getAttribute('data-theme') === 'dark';
  const newTheme = darkModeActive ? 'light' : 'dark';
  body.setAttribute('data-theme', newTheme);
  dropdownMenu.style.display = 'none';
  settingsButton.setAttribute('aria-expanded', 'false');
  toggleDarkModeButton.innerText = darkModeActive ? 'Dunkel Modus' : 'Licht Modus';
});

// Povećanje i smanjenje veličine fonta
const fontIncreaseButton = document.getElementById('font-increase');
const fontDecreaseButton = document.getElementById('font-decrease');

fontIncreaseButton.addEventListener('click', () => {
  let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--news-title-font-size'));
  if (currentSize < 2.0) {
    document.documentElement.style.setProperty('--news-title-font-size', (currentSize + 0.1).toFixed(2) + 'rem');
  }
});

fontDecreaseButton.addEventListener('click', () => {
  let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--news-title-font-size'));
  if (currentSize > 0.7) {
    document.documentElement.style.setProperty('--news-title-font-size', (currentSize - 0.1).toFixed(2) + 'rem');
  }
});

// Dinamičko učitavanje feedova za kategoriju "Aktuell"
async function loadHomeFeed() {
  try {
    const response = await fetch('/feeds'); // Poziv API-ja za keširane feedove
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const feeds = await response.json(); // Parsiranje JSON odgovora

    const homeFeed = feeds.find(feed => feed.title.toLowerCase() === 'aktuell'); // Pronađi feed za 'Aktuell'
    const container = document.getElementById('home-feed');

    if (homeFeed && homeFeed.items.length > 0) {
      container.innerHTML = ''; // Očisti prethodni sadržaj

      // Dodaj svaki feed kao karticu
      homeFeed.items.forEach(item => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        newsCard.innerHTML = `
          <img src="https://via.placeholder.com/125" alt="News Image"/>
          <div>
            <a href="${item.link}" class="news-title" target="_blank">${item.title}</a>
            <p class="news-meta">Source | Published recently</p>
          </div>
        `;
        container.appendChild(newsCard);
      });
    } else {
      container.innerHTML = '<p>No news available for this category.</p>';
    }
  } catch (error) {
    console.error('Error loading home feed:', error);
    const container = document.getElementById('home-feed');
    container.innerHTML = '<p>Error loading feeds. Please try again later.</p>';
  }
}

// Automatsko učitavanje feedova za "Aktuell"
window.onload = () => {
  loadHomeFeed();

  // Postavi početnu temu
  document.body.setAttribute('data-theme', 'dark');
  const darkModeActive = document.body.getAttribute('data-theme') === 'dark';
  toggleDarkModeButton.innerText = darkModeActive ? 'Licht Modus' : 'Dunkel Modus';

  // Proveri i primeni redosled tabova iz localStorage
  const savedOrder = localStorage.getItem('tabOrder');
  if (savedOrder) {
    const order = JSON.parse(savedOrder);
    order.forEach(tabId => {
      const tabButton = document.querySelector(`.tab[data-tab="${tabId}"]`);
      if (tabButton) {
        tabButton.parentNode.appendChild(tabButton);
      }
    });
  }
};

async function fetchFeeds() {
  const now = Date.now();

  if (cachedFeeds && lastCacheTime && (now - lastCacheTime < CACHE_DURATION)) {
    console.log('Serving feeds from cache');
    return cachedFeeds;
  }

  console.log('Fetching new feeds...');
  const allFeeds = [];
  for (const url of rssLinks.feeds) {
    try {
      console.log(`Fetching feed from: ${url}`);
      const feed = await parser.parseURL(url); // Parsiranje XML u JSON
      console.log(`Successfully fetched feed: ${feed.title}`); // Log naslova feeda
      allFeeds.push({
        title: feed.title,
        items: feed.items.map(item => ({ title: item.title, link: item.link }))
      });
    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error.message);
    }
  }


  async function loadHomeFeed() {
  try {
    const response = await fetch('/feeds'); // Poziv API-ja
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const feeds = await response.json(); // Parsiranje JSON odgovora
    console.log('Feeds loaded:', feeds); // Log za pregled odgovora

    const homeFeed = feeds.find(feed => feed.title.toLowerCase() === 'aktuell'); // Pronađi feed za 'Aktuell'
    const container = document.getElementById('home-feed');

    if (homeFeed && homeFeed.items.length > 0) {
      container.innerHTML = '';
      homeFeed.items.forEach(item => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        newsCard.innerHTML = `
          <img src="https://via.placeholder.com/125" alt="News Image"/>
          <div>
            <a href="${item.link}" class="news-title" target="_blank">${item.title}</a>
            <p class="news-meta">Source | Published recently</p>
          </div>
        `;
        container.appendChild(newsCard);
      });
    } else {
      container.innerHTML = '<p>No news available for this category.</p>';
    }
  } catch (error) {
    console.error('Error loading home feed:', error);
    const container = document.getElementById('home-feed');
    container.innerHTML = '<p>Error loading feeds. Please try again later.</p>';
  }
}


  cachedFeeds = allFeeds;
  lastCacheTime = now;
  return allFeeds;
}

async function loadHomeFeed() {
  try {
    // Poziv API-ja za preuzimanje feedova
    const response = await fetch('/feeds');
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Parsiranje JSON odgovora
    const feeds = await response.json();
    console.log('Feeds loaded:', feeds);

    // Pronađi feed sa naslovom 'Aktuell'
    const homeFeed = feeds.find(feed => feed.title.toLowerCase() === 'aktuell');
    const container = document.getElementById('home-feed');

    // Provera da li postoji feed za 'Aktuell'
    if (homeFeed && homeFeed.items.length > 0) {
      container.innerHTML = ''; // Očisti prethodni sadržaj

      // Iteracija kroz stavke feeda i kreiranje kartica
      homeFeed.items.forEach(item => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        newsCard.innerHTML = `
          <img src="https://via.placeholder.com/125" alt="News Image"/>
          <div>
            <a href="${item.link}" class="news-title" target="_blank">${item.title}</a>
            <p class="news-meta">Published: ${item.pubDate || 'Unknown'}</p>
          </div>
        `;
        container.appendChild(newsCard);
      });
    } else {
      // Prikaz poruke ako nema dostupnih stavki
      container.innerHTML = '<p>No news available for the "Aktuell" category.</p>';
    }
  } catch (error) {
    // Prikaz greške ako API nije dostupan ili dođe do druge greške
    console.error('Error loading home feed:', error);
    const container = document.getElementById('home-feed');
    container.innerHTML = '<p>Error loading feeds. Please try again later.</p>';
  }
}
