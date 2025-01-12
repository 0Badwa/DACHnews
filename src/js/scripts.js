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
} else {
  console.warn('Active content not found for tab:', tab.dataset.tab);
  return;
}
});



// Dropdown meni za podešavanja
const settingsButton = document.getElementById('settings-button');
const dropdownMenu = document.getElementById('dropdown-menu');

settingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isExpanded = settingsButton.getAttribute('aria-expanded') === 'true';
  console.log('Settings menu state:', !isExpanded); // Dodaj ovo
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
const body = document.body;
let darkModeActive = body.getAttribute('data-theme') === 'dark';

toggleDarkModeButton.addEventListener('click', () => {
  darkModeActive = body.classList.toggle('dark-theme');
  body.setAttribute('data-theme', darkModeActive ? 'dark' : 'light');
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


 eeds.forE

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

 const initialTab = document.querySelector('.tab[data-tab="home-feed"]');
  if (initialTab) {
    initialTab.click(); // Simulira klik na prvi tab
  }
  
darkModeActive = body.getAttribute('data-theme') === 'dark'; // Prva deklaracija
  toggleDarkModeButton.innerText = darkModeActive ? 'Dunkel Modus' : 'Licht Modus';


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

  if (
    titleLower.includes('politik') || 
    titleLower.includes('inland') || 
    titleLower.includes('neues deutschland')
  ) return 'Politik';

  if (
    titleLower.includes('neueste') || 
    titleLower.includes('nachrichten') || 
    titleLower.includes('international') || 
    titleLower.includes('diskurs') || 
    titleLower.includes('dieStandard') || 
    titleLower.includes('live') || 
    titleLower.includes('video') || 
    titleLower.includes('podcast') || 
    titleLower.includes('recht') || 
    titleLower.includes('die tageszeitung') || 
    titleLower.includes('diestandard')
  ) return 'Neueste';

  if (titleLower.includes('sport')) return 'Sport';

  if (
    titleLower.includes('kultur') || 
    titleLower.includes('etat') || 
    titleLower.includes('falter')
  ) return 'Kultur';

  if (titleLower.includes('wissenschaft')) return 'Wissenschaft';

  if (titleLower.includes('gesundheit')) return 'Gesundheit';

  if (
    titleLower.includes('panorama') || 
    titleLower.includes('diskurs')
  ) return 'Panorama';

  if (
    titleLower.includes('gesellschaft') || 
    titleLower.includes('lifestyle')
  ) return 'Gesellschaft';

  if (
    titleLower.includes('reisen') || 
    titleLower.includes('karriere')
  ) return 'Reisen';

  if (
    titleLower.includes('auto') || 
    titleLower.includes('mobilität') || 
    titleLower.includes('immobilien')
  ) return 'Auto & Mobilität';

  if (
    titleLower.includes('digital') || 
    titleLower.includes('web')
  ) return 'Digital';

  if (titleLower.includes('kurioses')) return 'Kurioses';

  return null; // Ako nije mapirano, vrati null
}




const feedMappings = {
  'politik': 'Politik',
  'neueste': 'Neueste',
  'aktuell': 'Aktuell',
  'sport': 'Sport',
  'wirtschaft': 'Wirtschaft',
  'kultur': 'Kultur',
  'wissenschaft': 'Wissenschaft',
  'gesundheit': 'Gesundheit',
  'panorama': 'Panorama',
  'gesellschaft': 'Gesellschaft',
  'lgbt': 'LGBT+',
  'reisen': 'Reisen',
  'auto': 'Auto & Mobilität',
  'mobilität': 'Auto & Mobilität',
  'digital': 'Digital',
  'kurioses': 'Kurioses',
  'live': 'Neueste',
  'video': 'Neueste',
  'podcast': 'Neueste',
  'recht': 'Neueste',
  'falter': 'Kultur',
  'die tageszeitung': 'Neueste',
  'diestandard': 'Neueste',
  'international': 'Neueste',
  'inland': 'Politik'
};
