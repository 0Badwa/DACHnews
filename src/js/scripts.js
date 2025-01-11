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

window.addEventListener('load', () => {
  const savedTheme = localStorage.getItem('theme');

  // Set dark mode as default if no theme is saved
  if (!savedTheme) {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.setAttribute('data-theme', savedTheme);
  }

  // Update toggle button text
  const darkModeActive = document.body.getAttribute('data-theme') === 'dark';
  document.getElementById('toggle-dark-mode').innerText = darkModeActive ? 'Light Mode' : 'Dark Mode';
});

document.getElementById('toggle-dark-mode').addEventListener('click', () => {
  const body = document.body;
  const darkModeActive = body.getAttribute('data-theme') === 'dark';
  const newTheme = darkModeActive ? 'light' : 'dark';

  body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  dropdownMenu.style.display = 'none';
  settingsButton.setAttribute('aria-expanded', 'false');
  document.getElementById('toggle-dark-mode').innerText = darkModeActive ? 'Dark Mode' : 'Light Mode';
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
    document.documentElement.style.setProperty('
