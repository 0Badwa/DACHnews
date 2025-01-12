const tabsContainer = document.querySelector('.tabs-container');
const contents = document.querySelectorAll('.tab-content');

tabsContainer.addEventListener('click', (event) => {
  const tab = event.target.closest('.tab');
  if (!tab) return;

  const tabs = tabsContainer.querySelectorAll('.tab');

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



// Dropdown meni za podešavanja
const settingsButton = document.getElementById('settings-button');
const dropdownMenu = document.getElementById('dropdown-menu');

settingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isExpanded = settingsButton.getAttribute('aria-expanded') === 'true';
  settingsButton.setAttribute('aria-expanded', String(!isExpanded));
  dropdownMenu.classList.toggle('visible', !isExpanded);
});

document.addEventListener('click', (e) => {
  if (!settingsButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.remove('visible');
    settingsButton.setAttribute('aria-expanded', 'false');
  }
});


// Tema: tamni i svetli režim
const toggleDarkModeButton = document.getElementById('toggle-dark-mode');
toggleDarkModeButton.addEventListener('click', () => {
  const body = document.body;
  const darkModeActive = body.classList.toggle('dark-theme');
  dropdownMenu.classList.remove('visible');
  settingsButton.setAttribute('aria-expanded', 'false');
  toggleDarkModeButton.innerText = darkModeActive ? 'Dunkel Modus' : 'Licht Modus';
});

// Povećanje i smanjenje veličine fonta
const adjustFontSize = (adjustment) => {
  const root = document.documentElement;
  let currentSize = parseFloat(getComputedStyle(root).getPropertyValue('--news-title-font-size'));
  const newSize = (currentSize + adjustment).toFixed(2);
  if (newSize >= 0.7 && newSize <= 2.0) {
    root.style.setProperty('--news-title-font-size', newSize + 'rem');
  }
};

const fontIncreaseButton = document.getElementById('font-increase');
const fontDecreaseButton = document.getElementById('font-decrease');


fontIncreaseButton.addEventListener('click', () => adjustFontSize(0.1));
fontDecreaseButton.addEventListener('click', () => adjustFontSize(-0.1));

// Dinamičko učitavanje feedova i prikazivanje po kategorijama
async function fetchFeeds(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  return response.json();
}

async function loadHomeFeed() {
  try {
    const feeds = await fetchFeeds('/feeds');
    console.log('Feeds loaded:', feeds);

   const categoryContainers = {
  'Aktuell': document.getElementById('home-feed'),
  'Neueste': document.getElementById('latest-feed'),
  'Politik': document.getElementById('politik-feed'),
  'Sport': document.getElementById('sport-feed'),
  'Wirtschaft': document.getElementById('wirtschaft-feed'),
  'Kultur': document.getElementById('kultur-feed'),
  'Wissenschaft': document.getElementById('wissenschaft-feed'),
  'Gesundheit': document.getElementById('gesundheit-feed'),
  'Gesellschaft': document.getElementById('gesellschaft-feed'),
  'Panorama': document.getElementById('panorama-feed'),
  'LGBT+': document.getElementById('lgbt-feed'),
  'Reisen': document.getElementById('reisen-feed'),
  'Auto & Mobilität': document.getElementById('auto-mobilitaet-feed'),
  'Digital': document.getElementById('digital-feed'),
  'Kurioses': document.getElementById('kurioses-feed')
};


    feeds.forEach(feed => {
      const category = mapFeedToCategory(feed);
      if (!category) {
        console.warn(`Feed not mapped to a category: ${feed.title}`);
        return;
      }
      const container = categoryContainers[category];
      if (container) {
        displayFeed(feed, container);
      } else {
        console.warn(`No container found for category: ${category}`);
      }
    });
  } catch (error) {
    console.error('Error loading feeds:', error);
    const homeContainer = document.getElementById('home-feed');
    homeContainer.innerHTML = '<p>Error loading feeds. Please try again later.</p>';
  }
}

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
  if (titleLower.includes('neueste') || titleLower.includes('nachrichten')) return 'Neueste';
  if (titleLower.includes('aktuell') || titleLower.includes('community')) return 'Aktuell';
  if (titleLower.includes('sport')) return 'Sport';
  if (titleLower.includes('kultur')) return 'Kultur';
  if (titleLower.includes('wissenschaft')) return 'Wissenschaft';
  if (titleLower.includes('gesundheit')) return 'Gesundheit';
  if (titleLower.includes('panorama')) return 'Panorama';
  if (titleLower.includes('wirtschaft')) return 'Wirtschaft';
  if (titleLower.includes('neues deutschland')) return 'Politik'; // Dodaj pravilo za ovaj feed
  if (titleLower.includes('derstandard')) return 'Neueste'; // Dodaj pravilo za ovaj feed

  return null; // Ako nije mapirano, vrati null
}




function mapFeedToCategory(feed) {
  const titleLower = feed.title.toLowerCase();

  if (titleLower.includes('politik')) return 'Politik';
  if (titleLower.includes('neueste') || titleLower.includes('nachrichten')) return 'Neueste';
  if (titleLower.includes('aktuell') || titleLower.includes('community')) return 'Aktuell';
  if (titleLower.includes('sport')) return 'Sport';
  if (titleLower.includes('kultur')) return 'Kultur';
  if (titleLower.includes('wissenschaft')) return 'Wissenschaft';
  if (titleLower.includes('gesundheit')) return 'Gesundheit';
  if (titleLower.includes('panorama')) return 'Panorama';
  if (titleLower.includes('gesellschaft')) return 'Gesellschaft';
  if (titleLower.includes('lgbt')) return 'LGBT+';
  if (titleLower.includes('reisen')) return 'Reisen';
  if (titleLower.includes('auto') || titleLower.includes('mobilität')) return 'Auto & Mobilität';
  if (titleLower.includes('digital')) return 'Digital';
  if (titleLower.includes('kurioses')) return 'Kurioses';

  // Dodaj specifične uslove za feedove
  if (titleLower.includes('falter')) return 'Kultur';
  if (titleLower.includes('die tageszeitung')) return 'Neueste';

  return null; // Ako nije mapirano, vrati null
}
