/**
 * swipe.js
 * 
 * Ovaj fajl sadrži logiku za swipe navigaciju (left/right) kroz kategorije.
 */

import { showGreenRectangle } from './ui.js';
import { displayNewsByCategory, displayNeuesteFeeds, displayAktuellFeeds } from './feeds.js';

/**
 * Funkcija za inicijalizaciju swipe (left/right) navigacije kroz kategorije.
 */
export function initSwipe() {
  let firstSwipeOccurred = false;
  const swipeContainer = document.getElementById('news-container');
  let touchstartX = 0;
  let touchendX = 0;
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
    if (!firstSwipeOccurred) {
      firstSwipeOccurred = true;
      showGreenRectangle();
    }
    if (touchendX < touchstartX - swipeThreshold) {
      showNextCategory();
    } else if (touchendX > touchstartX + swipeThreshold) {
      showPreviousCategory();
    }
  }

  if (swipeContainer) {
    swipeContainer.addEventListener('touchstart', e => {
      touchstartX = e.changedTouches[0].screenX;
    });

    swipeContainer.addEventListener('touchend', e => {
      touchendX = e.changedTouches[0].screenX;
      handleGesture();
    });
  }

  // Kad prelazimo na next/previous, radimo .click() i .scrollIntoView()
  function showNextCategory() {
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
