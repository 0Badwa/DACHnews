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



// Dark Mode toggle
document.querySelector('.menu-list li:first-child').addEventListener('click', () => {
  const body = document.body;
  const isDarkMode = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
});

// Hover efekti za meni stavke
document.querySelectorAll('.menu-list li').forEach(item => {
  item.addEventListener('mouseover', () => {
    item.style.transform = 'scale(1.05)';
  });
  item.addEventListener('mouseout', () => {
    item.style.transform = 'scale(1)';
  });
});

// Klik na "Schriftgröße"
document.querySelector('.menu-list li:nth-child(2)').addEventListener('click', () => {
  alert('Promena veličine fonta nije trenutno dostupna.');
});

// Klik na "Quellen blockieren"
document.querySelector('.menu-list li:nth-child(3)').addEventListener('click', () => {
  alert('Blokiranje izvora.');
});

// Klik na "Tabs anordnen"
document.querySelector('.menu-list li:nth-child(4)').addEventListener('click', () => {
  alert('Rearanžiranje tabova.');
});

// Klik na "Kontakt"
document.querySelector('.menu-list li:nth-child(5)').addEventListener('click', () => {
  alert('Kontakt forma.');
});

// Klik na "Über"
document.querySelector('.menu-list li:nth-child(6)').addEventListener('click', () => {
  alert('Informacije o aplikaciji.');
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


