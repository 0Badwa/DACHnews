/**
 * swipe.js
 * 
 * Logika za swipe (left/right) navigaciju kroz kategorije.
 * Kada pređemo u novu kategoriju, automatski se skrolujemo na vrh 
 * (prikazuje se prva vest iz te kategorije).
 */

import { showGreenRectangle } from './ui.js';

export function initSwipe() {
  let firstSwipeOccurred = false;
  const swipeContainer = document.getElementById('news-container');
  let touchstartX = 0;
  let touchendX = 0;
  let touchstartY = 0;
  let touchendY = 0;
  const swipeThreshold = 50;

  // Redosled svih kategorija, pa swipe prelazi unutar ovog niza
  const categories = [
    "Neueste",
    "Aktuell",
    "Technologie",
    "Gesundheit",
    "Sport",
    "Wirtschaft",
    "Kultur",
    "Auto",
    "Reisen",
    "Lifestyle",
    "Panorama",
    "Politik",
    "Unterhaltung",
    "Welt",
    "LGBT+",
    "Ohne Kategorie"
  ];

  function handleGesture() {
    const distX = touchendX - touchstartX;
    const distY = touchendY - touchstartY;

    // Swipe samo ako je horizontalni pomak veći od vertikalnog
    if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > swipeThreshold) {
      if (distX < 0) {
        showNextCategory();
      } else {
        showPreviousCategory();
      }
    }
  }

  if (swipeContainer) {
    swipeContainer.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      touchstartX = t.screenX;
      touchstartY = t.screenY;
    });

    swipeContainer.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      touchendX = t.screenX;
      touchendY = t.screenY;
      handleGesture();
    });
  }

  function showNextCategory() {
    if (!firstSwipeOccurred) {
      firstSwipeOccurred = true;
      showGreenRectangle();
    }
    moveToCategory(1);
  }

  function showPreviousCategory() {
    if (!firstSwipeOccurred) {
      firstSwipeOccurred = true;
      showGreenRectangle();
    }
    moveToCategory(-1);
  }

  /**
   * Pomocna funkcija: prelaz na sledeću (dir=1) ili prethodnu (dir=-1) kategoriju
   */
  function moveToCategory(dir) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let currentIdx = categories.indexOf(currentCat);
    if (currentIdx < 0) currentIdx = 0;

    // Pomeri index
    currentIdx += dir;
    if (currentIdx < 0) currentIdx = 0;
    if (currentIdx >= categories.length) currentIdx = categories.length - 1;

    const nextCat = categories[currentIdx];
    clickTab(nextCat);
  }

  /**
   * Klik na tab i skrolujemo news-container na vrh (prva vest).
   */
  async function clickTab(cat) {
    const tab = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (!tab) return;

    // Imitiramo klik na tab
    tab.click();

    // Posle kratkog delay-a, skroluj na vrh liste
    setTimeout(() => {
      const container = document.getElementById('news-container');
      if (container) {
        container.scrollTop = 0;
      }
    }, 400); // 0.4s da stignu da se učitaju vesti
  }
}
