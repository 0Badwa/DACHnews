/**
 * ui.js
 * 
 * Dodate funkcije showLoader/hideLoader i showErrorMessage/hideErrorMessage
 * Uklonjene sve reference na LGBT+ (nije ih ni bilo).
 */

const loaderEl = document.getElementById('loader');
const errorEl = document.getElementById('error-container');

/**
 * Funkcija za prikaz loadera
 */
export function showLoader() {
  if (loaderEl) {
    loaderEl.style.display = 'block';
  }
}

/**
 * Funkcija za sakrivanje loadera
 */
export function hideLoader() {
  if (loaderEl) {
    loaderEl.style.display = 'none';
  }
}

/**
 * Funkcija za prikaz greške
 */
export function showErrorMessage(msg) {
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

/**
 * Sakrij error poruku
 */
export function hideErrorMessage() {
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
}

/**
 * Funkcija za prikaz tutorial overlaya, ako treba...
 */
export function checkAndShowTutorial() {
  const tutorialShown = localStorage.getItem('tutorialShown');
  const overlay = document.getElementById('tutorial-overlay');
  if (!tutorialShown && overlay) {
    overlay.style.display = 'flex';
  }
}

/**
 * Zatvaranje tutorial overlaya
 */
export function closeTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    localStorage.setItem('tutorialShown', 'true');
  }
}

/**
 * Uklanja "active" sa svih tabova
 */
export function removeActiveClass() {
  const allTabs = document.querySelectorAll('.tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
    tab.classList.remove('active-green');
  });
}

/**
 * Zeleni okvir oko aktivnog taba
 */
export function showGreenRectangle() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.classList.add('active-green');
  }
}

/**
 * Uklanja zeleni okvir
 */
export function hideGreenRectangle() {
  const homeTab = document.querySelector('.tab[data-tab="Neueste"]');
  if (homeTab) {
    homeTab.classList.remove('active-green');
  }
}

/**
 * Ažuriranje category indicator-a
 */
export function updateCategoryIndicator(categoryName) {
  const categoryIndicator = document.querySelector('.category-indicator');
  if (categoryIndicator) {
    categoryIndicator.textContent = categoryName;
    categoryIndicator.classList.add('fade-out');
    setTimeout(() => {
      categoryIndicator.classList.remove('fade-out');
      categoryIndicator.classList.add('fade-in');
      setTimeout(() => {
        categoryIndicator.classList.remove('fade-in');
      }, 300);
    }, 300);
  }
}

/**
 * Lazy loading
 */
export function initializeLazyLoading() {
  const lazyImages = document.querySelectorAll('img.lazy');
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove("lazy");
          img.classList.add("loaded");
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: "0px 0px 50px 0px",
      threshold: 0.01
    });

    lazyImages.forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove("lazy");
    });
  }
}
