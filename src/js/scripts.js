const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.tab-content');

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
    if(activeContent) {
      activeContent.classList.add('active');
    }
  });
});

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

document.getElementById('toggle-dark-mode').addEventListener('click', () => {
  const body = document.body;
  const darkModeActive = body.getAttribute('data-theme') === 'dark';
  const newTheme = darkModeActive ? 'light' : 'dark';
  // Primeni novu temu
  body.setAttribute('data-theme', newTheme);
  // Sačuvaj izbor u localStorage
  localStorage.setItem('theme', newTheme);
  // Zatvori dropdown meni ako je otvoren (ako je potrebno)
  dropdownMenu.style.display = 'none';
  settingsButton.setAttribute('aria-expanded', 'false');
  // Ažuriraj tekst na dugmetu prema trenutnoj temi
  document.getElementById('toggle-dark-mode').innerText = darkModeActive ? 'Dunkel Modus' : 'Licht Modus';
});

document.getElementById('font-increase').addEventListener('click', () => {
  let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--news-title-font-size'));
  if(currentSize < 2.0) {
    document.documentElement.style.setProperty('--news-title-font-size', (currentSize + 0.1).toFixed(2) + 'rem');
  }
});

document.getElementById('font-decrease').addEventListener('click', () => {
  let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--news-title-font-size'));
  if(currentSize > 0.7) {
    document.documentElement.style.setProperty('--news-title-font-size', (currentSize - 0.1).toFixed(2) + 'rem');
  }
});

document.querySelectorAll('#sortable-list .move-up').forEach(button => {
  button.addEventListener('click', () => {
    const li = button.parentElement.parentElement;
    const prev = li.previousElementSibling;
    if(prev) {
      li.parentNode.insertBefore(li, prev);
    }
  });
});

document.querySelectorAll('#sortable-list .move-down').forEach(button => {
  button.addEventListener('click', () => {
    const li = button.parentElement.parentElement;
    const next = li.nextElementSibling;
    if(next) {
      li.parentNode.insertBefore(next, li);
    }
  });
});

const rearrangeTabsBtn = document.getElementById('rearrange-tabs');
const rearrangeModal = document.getElementById('rearrange-modal');
const closeModalBtn = document.getElementById('close-modal');
const sortableList = document.getElementById('sortable-list');

rearrangeTabsBtn.addEventListener('click', () => {
  dropdownMenu.style.display = 'none';
  settingsButton.setAttribute('aria-expanded', 'false');
  rearrangeModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
  rearrangeModal.style.display = 'none';
  const newOrder = Array.from(sortableList.children).map(li => li.dataset.tab);
  localStorage.setItem('tabOrder', JSON.stringify(newOrder));
  newOrder.forEach(tabId => {
    const tabButton = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if(tabButton) {
      tabButton.parentNode.appendChild(tabButton);
    }
  });
});

window.addEventListener('load', () => {
  // Pokušaj dohvatiti spremljenu temu iz localStorage
  const savedTheme = localStorage.getItem('theme');

  // Ako nema spremljene teme, postavi 'dark' kao podrazumevanu
  if (!savedTheme) {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    // Ako tema postoji, postavi tu temu
    document.body.setAttribute('data-theme', savedTheme);
  }

  // Ažuriraj tekst dugmeta na osnovu trenutačne teme
  const darkModeActive = document.body.getAttribute('data-theme') === 'dark';
  document.getElementById('toggle-dark-mode').innerText = darkModeActive ? 'Licht Modus' : 'Dunkel Modus';

  // Ukoliko postoji spremljeni redosled tabova
  const savedOrder = localStorage.getItem('tabOrder');
  if (savedOrder) {
    const order = JSON.parse(savedOrder);
    order.forEach(tabId => {
      const tabButton = document.querySelector(`.tab[data-tab="${tabId}"]`);
      if(tabButton) {
        tabButton.parentNode.appendChild(tabButton);
      }
    });
  }
}); // Završetak load event handlera

document.getElementById('block-source').addEventListener('click', () => {
  alert('Blokiranje izvora');
});
document.getElementById('kontakt').addEventListener('click', () => {
  alert('Kontakt');
});
document.getElementById('about').addEventListener('click', () => {
  alert('about');
});


// Zatvaranje modala
document.getElementById('close-modal').addEventListener('click', () => {
  rearrangeModal.style.display = 'none';
});
