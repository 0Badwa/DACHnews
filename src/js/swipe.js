/**
 * swipe.js
 * 
 * Ovaj fajl sadrži logiku za swipe navigaciju (left/right) kroz kategorije.
 */

import { showGreenRectangle } from './ui.js';

/**
 * Inicijalizacija swipe (left/right) navigacije kroz kategorije,
 * pri čemu ne reagujemo na vertikalni swipe.
 */
export function initSwipe() {
  let firstSwipeOccurred = false;
  const swipeContainer = document.getElementById('news-container');
  let touchstartX = 0;
  let touchendX = 0;
  let touchstartY = 0;
  let touchendY = 0;
  const swipeThreshold = 50;

  // pun redosled: Neueste -> Aktuell -> ...categories
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

    // Treba da reagujemo samo ako je pomeraj po X
    // znatno veći od pomeraja po Y (vođeno horizontalnim swipe-om)
    if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > swipeThreshold) {
      // Ako je distX < 0 => showNextCategory, a ako je > 0 => showPreviousCategory
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
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let currentIdx = categories.indexOf(currentCat);
    if (currentIdx < 0) currentIdx = 0;

    if (currentIdx < categories.length - 1) {
      currentIdx++;
      const nextCat = categories[currentIdx];
      clickTab(nextCat);
    }
  }

  function showPreviousCategory() {
    if (!firstSwipeOccurred) {
      firstSwipeOccurred = true;
      showGreenRectangle();
    }
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const currentCat = activeTab.getAttribute('data-tab');
    let currentIdx = categories.indexOf(currentCat);
    if (currentIdx < 0) currentIdx = 0;

    if (currentIdx > 0) {
      currentIdx--;
      const prevCat = categories[currentIdx];
      clickTab(prevCat);
    }
  }

  async function clickTab(cat) {
    const tab = document.querySelector(`.tab[data-tab="${cat}"]`);
    if (!tab) return;
    tab.click();
    setTimeout(() => {
      tab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }, 150);
  }
}
