/**
 * main.js
 * 
 * Glavni fajl koji se poziva nakon učitavanja DOM-a.
 * Uvešćemo ostale module i inicijalizovati događaje, tabove, itd.
 * Sada bez LocalStorage za aktivnu kategoriju:
 * - Po svakom reload-u bira se "Neueste"
 */

import { checkAndShowTutorial, closeTutorialOverlay, removeActiveClass, showGreenRectangle, hideGreenRectangle } from './ui.js';
import { initSettings } from './settings.js';
import { initSwipe } from './swipe.js';
import { displayNeuesteFeeds, displayAktuellFeeds, displayNewsByCategory } from './feeds.js';

document.addEventListener("DOMContentLoaded", () => {
  // Tutorial overlay
  checkAndShowTutorial();
  const closeTutorialBtn = document.getElementById('close-tutorial');
  if (closeTutorialBtn) {
    closeTutorialBtn.addEventListener('click', closeTutorialOverlay);
  }

  // Sakrij zeleni okvir za prvi tab
  hideGreenRectangle();

  // Inicijalizuj podešavanja (tema, font, itd.)
  initSettings();

  // Swipe logika (horizontalno menjanje kategorija)
  initSwipe();

  // Definišemo ostale kategorije (osim Neueste, Aktuell)
  const categories = [
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

  // Hvatamo tab elemente
  const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
  const aktuellTab = document.querySelector('.tab[data-tab="Aktuell"]');
  const tabsContainer = document.getElementById('tabs-container');

  // Klik: Neueste
  if (neuesteTab) {
    neuesteTab.addEventListener('click', async (e) => {
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      await displayNeuesteFeeds();
      showGreenRectangle();
      // Nema više saveAppState
    });
  }

  // Klik: Aktuell
  if (aktuellTab) {
    aktuellTab.addEventListener('click', async (e) => {
      removeActiveClass();
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      await displayAktuellFeeds();
      showGreenRectangle();
    });
  }

  // Generišemo ostale kategorije (tabove)
  if (tabsContainer) {
    const skipList = ["Neueste", "Aktuell"];
    categories
      .filter(cat => !skipList.includes(cat))
      .forEach(cat => {
        const btn = document.createElement('button');
        btn.classList.add('tab');
        btn.setAttribute('data-tab', cat);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.textContent = cat;

        btn.addEventListener('click', async (ev) => {
          removeActiveClass();
          ev.target.classList.add('active');
          ev.target.setAttribute('aria-selected', 'true');
          showGreenRectangle();
          await displayNewsByCategory(cat);
        });

        tabsContainer.appendChild(btn);
      });
  }

  // Po svakom refresh-u -> uvek Neueste tab
  if (neuesteTab) {
    neuesteTab.click();
  }
});
