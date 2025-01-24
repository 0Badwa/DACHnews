/**
 * swipe.js
 * 
 * Uklanjamo "Ohne Kategorie" i koristimo "Sonstiges".
 * Ostalo je slično - kad menjamo kategoriju swipe-om, 
 * skrolujemo news-container na vrh (da se vidi prva vest).
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

  // pun redosled
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
    "Sonstiges"
  ];

  function handleGesture() {
    const distX = touchendX - touchstartX;
    const distY = touchendY - touchstartY;
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
    moveCategory(1);
  }

  function showPreviousCategory() {
    if (!firstSwipeOccurred) {
      firstSwipeOccurred = true;
      showGreenRectangle();
    }
    moveCategory(-1);
  }

  function moveCategory(dir) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let idx = categories.indexOf(currentCat);
    if (idx < 0) idx = 0;

    idx += dir;
    if (idx < 0) idx = 0;
    if (idx >= categories.length) idx = categories.length - 1;

    clickTab(categories[idx]);
  }

  async function clickTab(cat) {
    const tab = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (!tab) return;
    tab.click();
    setTimeout(() => {
      // skrolujemo news-container na vrh
      if (swipeContainer) {
        swipeContainer.scrollTop = 0;
      }
    }, 300);
  }
}
