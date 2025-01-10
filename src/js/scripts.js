const settingsButton = document.getElementById('settings-button'); // ID hamburger dugmeta
const menuContainer = document.querySelector('.menuContainer'); // Klasa za meni



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

function loadMenuIcons() {
  // Selektujemo sve slike koje imaju data-src, a nemaju još postavljen src
  document.querySelectorAll('img[data-src]').forEach(img => {
    if (!img.src) {
      img.src = img.getAttribute('data-src');
    }
  });
}
settingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isExpanded = settingsButton.getAttribute('aria-expanded') === 'true';
  settingsButton.setAttribute('aria-expanded', String(!isExpanded));
  menuContainer.style.display = menuContainer.style.display === 'flex' ? 'none' : 'flex';
});

document.addEventListener('click', (e) => {
  if (!settingsButton.contains(e.target) && !menuContainer.contains(e.target)) {
    menuContainer.style.display = 'none';
    settingsButton.setAttribute('aria-expanded', 'false');
  }
});

document.getElementById('toggle-dark-mode').addEventListener('click', () => {
  const body = document.body;
  const darkModeActive = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', darkModeActive ? 'light' : 'dark');
  menuContainer.style.display = 'none';
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
  if(currentSize > 0.8) {
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
  menuContainer.style.display = 'none';
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
  const savedOrder = localStorage.getItem('tabOrder');
  if(savedOrder) {
    const order = JSON.parse(savedOrder);
    order.forEach(tabId => {
      const tabButton = document.querySelector(`.tab[data-tab="${tabId}"]`);
      if(tabButton) {
        tabButton.parentNode.appendChild(tabButton);
      }
    });
  }
});

document.getElementById('block-source').addEventListener('click', () => {
  alert('Blokiranje izvora');
});

