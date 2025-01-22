/**
 * ui.js
 * 
 * Ovaj fajl se bavi prikazom korisničkog interfejsa (UI) - tutorial overlay,
 * ažuriranje indicatora, lazy loading, manipulacija tabovima (dodavanje/uklanjanje klasa).
 */

/**
 * Funkcija za prikazivanje modernog tutorial overlaya
 * samo pri prvom pokretanju aplikacije.
 */
export function checkAndShowTutorial() {
  const tutorialShown = localStorage.getItem('tutorialShown');
  const overlay = document.getElementById('tutorial-overlay');
  if (!tutorialShown && overlay) {
    overlay.style.display = 'flex';
  }
}

/**
 * Funkcija za zatvaranje tutorial overlaya i setovanje
 * localStorage flag-a da se ne prikazuje ponovo.
 */
export function closeTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    localStorage.setItem('tutorialShown', 'true');
  }
}

/**
 * Funkcija koja uklanja klasu 'active' sa svih tabova.
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
 * Funkcija koja prikazuje zeleni okvir oko aktivnog taba.
 */
export function showGreenRectangle() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activeTab.classList.add('active-green');
  }
}

/**
 * Funkcija koja uklanja zeleni okvir (koristi se samo na početku).
 */
export function hideGreenRectangle() {
  const homeTab = document.querySelector('.tab[data-tab="Neueste"]');
  if (homeTab) {
    homeTab.classList.remove('active-green');
  }
}

/**
 * Funkcija za ažuriranje naziva prikazane kategorije (category indicator).
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
 * Funkcija koja inicijalizuje lazy loading za slike.
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
    // Fallback
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove("lazy");
    });
  }
}
