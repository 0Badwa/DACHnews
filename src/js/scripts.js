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
  toggleDarkModeButton.innerText = darkModeActive ? 'Licht Modus' : 'Dunkel Modus';
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

// Dinamičko učitavanje feedova i prikazivanje po kategorijama
async function loadHomeFeed() {
  try {
    const response = await fetch('/feeds'); 
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const feeds = await response.json();
    console.log('Feeds loaded:', feeds);

    const categoryContainers = {
  'Aktuell': document.getElementById('home-feed'),
  'Neueste': document.getElementById('latest-feed'),
  'Politik': document.getElementById('politik-feed')
};
feeds.forEach(feed => {
  const category = mapFeedToCategory(feed);
  if (category && categoryContainers[category]) {
    displayFeed(feed, categoryContainers[category]);
  }
});


    // Selektovanje HTML kontejnera
    const homeContainer = document.getElementById('home-feed');
    const latestContainer = document.getElementById('latest-feed');
    const politikContainer = document.getElementById('politik-feed');

    // Funkcija za prikazivanje feeda u datom kontejneru
    function displayFeed(feed, container) {
      if (feed && feed.items && feed.items.length > 0) {
        container.innerHTML = ''; 
        feed.items.forEach(item => {
          const newsCard = document.createElement('div');
          newsCard.className = 'news-card';
          newsCard.innerHTML = `
            <img src="https://via.placeholder.com/125" alt="News Image"/>
            <div>
              <a href="${item.link}" class="news-title" target="_blank">${item.title}</a>
              <p class="news-meta">Published recently</p>
            </div>
          `;
          container.appendChild(newsCard);
        });
      } else {
        container.innerHTML = '<p>No news available for this category.</p>';
      }
    }

    // Prikazivanje svakog feeda u odgovarajućem kontejneru
    displayFeed(homeFeed, homeContainer);
    displayFeed(latestFeed, latestContainer);
    displayFeed(politikFeed, politikContainer);

    // Ako imate dodatne kategorije, nastavite sličnim pristupom...
  } catch (error) {
    console.error('Error loading feeds:', error);
    const homeContainer = document.getElementById('home-feed');
    homeContainer.innerHTML = '<p>Error loading feeds. Please try again later.</p>';
  }
}

// Automatsko učitavanje feedova kada se stranica učita
window.onload = () => {
  loadHomeFeed();

  document.body.setAttribute('data-theme', 'dark');
  const darkModeActive = document.body.getAttribute('data-theme') === 'dark';
  toggleDarkModeButton.innerText = darkModeActive ? 'Licht Modus' : 'Dunkel Modus';

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


function mapFeedToCategory(feed) {
  const titleLower = feed.title.toLowerCase();
  if (titleLower.includes('politik')) return 'Politik';
  if (titleLower.includes('neueste')) return 'Neueste';
  if (titleLower.includes('aktuell')) return 'Aktuell';
  return null; // Preskoči feed ako ne pripada poznatoj kategoriji
}

const activeClass = 'active';
const ariaSelected = 'aria-selected';
