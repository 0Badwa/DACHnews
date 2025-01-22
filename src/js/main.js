/**
 * main.js
 * 
 * Glavni fajl koji se poziva nakon učitavanja DOM-a.
 * Uvozi sve pomoćne module i inicijalizuje događaje, tabove i sl.
 */

import { checkAndShowTutorial, closeTutorialOverlay, removeActiveClass, showGreenRectangle, hideGreenRectangle } from './ui.js';
import { saveAppState, restoreAppState } from './appState.js';
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

  // Swipe logika
  initSwipe();

  // Kategorije (ostale sem Neueste i Aktuell generišemo kasnije)
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
      saveAppState("Neueste");
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
      saveAppState("Aktuell");
    });
  }

  // Generišemo ostale kategorije (tabove) posle Neueste i Aktuell
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
          saveAppState(cat);
        });

        tabsContainer.appendChild(btn);
      });
  }

  // Ako postoji sacuvan state, vratimo ga. U suprotnom: Neueste
  restoreAppState();
});
