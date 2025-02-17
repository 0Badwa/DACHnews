/**
 * swipe.js
 * 
 * Implementacija kontinuiranog (carousel-like) swipe efekta 
 *
 * Ako želite da se stvarno vide dve “stranice” odjednom (kao kod mobilnih “home screen”
 * swipe efekata), bilo bi potrebno i u HTML-u postaviti wrapper i dve .carousel-page,
 * ali ovde, pošto ne menjamo ništa van ovog fajla, radimo “virtualni” prikaz –
 * dok povlačite, #news-container se pomera levo/desno, a na kraju se vrati na 0 i
 * učita novu kategoriju.
 *
 */

import { displayAktuellFeeds, displayNewsByCategory } from './feeds.js';
import { showGreenRectangle } from './ui.js';

export function initSwipe() {
  const swipeContainer = document.getElementById('news-container');
  if (!swipeContainer) return;

  // Da li smo već detektovali prvi swipe (pozvaćemo showGreenRectangle jednom).
  let firstSwipeOccurred = false;

  // Koordinate dodira i merenje translacije
  let startX = 0;
  let currentTranslate = 0;
  let previousTranslate = 0;
  let animationID = 0;
  let dragging = false;

  // Indeks aktivne kategorije (0 => "Aktuell", 1 => "Technologie", itd.)
  let currentIndex = 0;

  // Lista kategorija (redom). Možete je uskladiti sa redosledom u aplikaciji.
  const categories = [
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
    "Sonstiges"
  ];

  // Prag pomeraja u pikselima koji određuje da li prelazimo na sledeću kategoriju
  const threshold = 60;

  /**
   * Počinje gest (touchstart/mousedown).
   */
  function touchStart(e) {
    dragging = true;
    startX = getXPosition(e);
    // Ukidamo transition dok se vuče (da pomeranje bude “praćenje prsta”).
    swipeContainer.style.transition = 'none';
    // Pokrećemo kontinualni raf animation da bi setSliderPosition radio i dok vučemo.
    animationID = requestAnimationFrame(animation);
  }

  /**
   * Nastavlja se gest (touchmove/mousemove) – ažuriramo currentTranslate.
   */
  function touchMove(e) {
    if (!dragging) return;
    const currentX = getXPosition(e);
    const deltaX = currentX - startX;
    currentTranslate = previousTranslate + deltaX;
  }

  /**
   * Kraj gesta (touchend/mouseup) – proveravamo da li prelazimo na sledeću/prethodnu kat.
   */
  function touchEnd() {
    dragging = false;
    cancelAnimationFrame(animationID);

    // Vraćamo transition za glatko vraćanje/odlazak
    swipeContainer.style.transition = 'transform 0.3s ease-out';

    const movedBy = currentTranslate - previousTranslate;

    // Ako je pomeraj ispod -threshold => prelazak napred (sledeća kategorija)
    if (movedBy < -threshold && currentIndex < categories.length - 1) {
      currentIndex++;
      if (!firstSwipeOccurred) {
        firstSwipeOccurred = true;
        showGreenRectangle(); // indikator da je prvi swipe detektovan
      }
    }
    // Ako je pomeraj iznad threshold => prelazak unazad (prethodna kategorija)
    else if (movedBy > threshold && currentIndex > 0) {
      currentIndex--;
      if (!firstSwipeOccurred) {
        firstSwipeOccurred = true;
        showGreenRectangle();
      }
    }

    // Pošto imamo samo jedan container (ne više “stranica”),
    // posle prelaska na novu kategoriju resetujemo poziciju na 0.
    currentTranslate = 0;
    previousTranslate = 0;
    setSliderPosition();

    // Učitavamo novu kategoriju
    if (currentIndex === 0) {
      displayAktuellFeeds();
    } else {
      displayNewsByCategory(categories[currentIndex]);
    }
  }

  /**
   * Kontinualna animacija dok je dragging = true (da se transform prati u realnom vremenu).
   */
  function animation() {
    setSliderPosition();
    if (dragging) {
      requestAnimationFrame(animation);
    }
  }

  /**
   * Primena transformacije na #news-container.
   */
  function setSliderPosition() {
    swipeContainer.style.transform = `translateX(${currentTranslate}px)`;
  }

  /**
   * Pomoćna funkcija za dobijanje X koordinate (touch ili mouse).
   */
  function getXPosition(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
  }

  // Dodajemo event listenere za touch
  swipeContainer.addEventListener('touchstart', touchStart);
  swipeContainer.addEventListener('touchmove', touchMove);
  swipeContainer.addEventListener('touchend', touchEnd);

  // Opciona podrška za desktop mišem
  swipeContainer.addEventListener('mousedown', touchStart);
  swipeContainer.addEventListener('mousemove', touchMove);
  swipeContainer.addEventListener('mouseup', touchEnd);
  swipeContainer.addEventListener('mouseleave', () => {
    if (dragging) touchEnd();
  });
}
