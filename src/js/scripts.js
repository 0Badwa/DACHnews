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
    if (activeContent) {
      activeContent.classList.add('active');
    }
  });
});

const settingsButton = document.getElementById('settings-button');
const dropdownMenu = document.getElementById('dropdown-menu');

settingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isExpanded = settingsButton.getAttribute('aria-expanded') === 'true';
  settingsButton.setAttribute('aria-expanded', !isExpanded);
  dropdownMenu.style.display = isExpanded ? 'none' : 'flex';
});

document.addEventListener('click', (e) => {
  if (!settingsButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.style.display = 'none';
    settingsButton.setAttribute('aria-expanded', 'false');
  }
});

window.addEventListener('load', () => {
  const savedTheme = localStorage.getItem('theme');

  // Postavi podrazumevanu temu na dark mode ako nema sačuvane teme
  if (!savedTheme) {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.setAttribute('data-theme', savedTheme);
  }

  // Ažuriraj tekst dugmeta na osnovu trenutne teme
  const darkModeActive = document.body.getAttribute('data-theme') === 'dark';
  document.getElementById('toggle-dark-mode').innerText = darkModeActive ? 'Heller Modus' : 'Dunkler Modus';
});

document.getElementById('toggle-dark-mode').addEventListener('click', () => {
  const body = document.body;
  const darkModeActive = body.getAttribute('data-theme') === 'dark';
  const newTheme = darkModeActive ? 'light' : 'dark';

  body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // Ažuriraj tekst dugmeta za prebacivanje
  document.getElementById('toggle-dark-mode').innerText = darkModeActive ? 'Dunkler Modus' : 'Heller Modus';
});

document.getElementById('font-increase').addEventListener('click', () => {
  let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--news-title-font-size'));
  if (currentSize < 2.0) {
    document.documentElement.style.setProperty('--news-title-font-size', (currentSize + 0.1).toFixed(2) + 'rem');
  }
});

document.getElementById('font-decrease').addEventListener('click', () => {
  let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--news-title-font-size'));
  if (currentSize > 0.7) {
    document.documentElement.style.setProperty('--news-title-font-size', (currentSize - 0.1).toFixed(2) + 'rem');
  }
});

document.querySelectorAll('#sortable-list .move-up').forEach(button => {
  button.addEventListener('click', () => {
    const li = button.parentElement.parentElement;
    const prev = li.previousElementSibling;
    if (prev) {
      li.parentNode.insertBefore(li, prev);
    }
  });
});

document.querySelectorAll('#sortable-list .move-down').forEach(button => {
  button.addEventListener('click', () => {
    const li = button.parentElement.parentElement;
    const next = li.nextElementSibling;
    if (next) {
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
    if (tabButton) {
      tabButton.parentNode.appendChild(tabButton);
    }
  });
});

window.addEventListener('load', () => {
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
});

document.getElementById('block-source').addEventListener('click', () => {
  alert('Quellen blockieren');
});
document.getElementById('kontakt').addEventListener('click', () => {
  alert('Kontakt');
});
document.getElementById('about').addEventListener('click', () => {
  alert('Über');
});

// Zatvaranje modala
document.getElementById('close-modal').addEventListener('click', () => {
  rearrangeModal.style.display = 'none';
});
