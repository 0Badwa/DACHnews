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


// Set za praćenje aktivnih IntersectionObserver instanci
const observers = new Set();

/**
 * Inicijalizuje lazy loading za slike koristeći IntersectionObserver.
 * Vraća funkciju za čišćenje observera pri unmountu.
 */
export function initializeLazyLoading() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute("data-src");
        if (src) {
          img.src = src;
          img.removeAttribute("data-src");
        }
        observer.unobserve(img);
      }
    });
  }, { rootMargin: "50px" });

  observers.add(imageObserver);

  // Pronalazi sve slike sa lazy loading atributom i dodaje ih u observer
  document.querySelectorAll("img.lazy").forEach(img => imageObserver.observe(img));

  // Vraćamo cleanup funkciju za oslobađanje observera
  return () => {
    observers.delete(imageObserver);
    imageObserver.disconnect();
  };
}

/**
 * Čisti sve IntersectionObserver instance prilikom unmount-a.
 */
export function cleanupObservers() {
  observers.forEach(observer => observer.disconnect());
  observers.clear();
}
