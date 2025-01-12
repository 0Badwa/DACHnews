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
  let currentSize
