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

/**
 * Inicijalizuje svajp funkcionalnost za promenu kategorija.
 */
export function initSwipe() {
  const swipeContainer = document.getElementById('news-container');
  if (!swipeContainer) return;

  // Deklaracija i inicijalizacija currentIndex ovde, u opsegu funkcije initSwipe
  let currentIndex = 0;

  // Da li smo već detektovali prvi swipe (pozvaćemo showGreenRectangle jednom).
  let firstSwipeOccurred = false;

  // Koordinate dodira i merenje translacije
  let startX = 0;
  let currentTranslate = 0;
  let previousTranslate = 0;
  let animationID = 0;
  let dragging = false;

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
   * Kraj gesta (touchend/mouseup) – proveravamo da li prelazimo na sledeću/prethodnu kategoriju.
   */
  function touchEnd() {
    dragging = false;
    cancelAnimationFrame(animationID);

    // Uzimamo pomeraj
    const movedBy = currentTranslate - previousTranslate;

    if (movedBy < -threshold && currentIndex < categories.length - 1) {
      currentIndex++;
      if (!firstSwipeOccurred) {
        firstSwipeOccurred = true;
        showGreenRectangle();
      }
    } else if (movedBy > threshold && currentIndex > 0) {
      currentIndex--;
      if (!firstSwipeOccurred) {
        firstSwipeOccurred = true;
        showGreenRectangle();
      }
    }

    // Umesto direktnog resetovanja pozicije, pozovite animaciju:
    applySwipeAnimation('swipe-out-left', 'swipe-in-right');

    // Učitavanje nove kategorije nakon 400ms (nakon završetka animacije)
    setTimeout(() => {
      if (currentIndex === 0) {
        displayAktuellFeeds();
      } else {
        displayNewsByCategory(categories[currentIndex]);
      }
      // Resetovanje pozicije nakon animacije
      previousTranslate = currentTranslate;
    }, 400);
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
  
  // DODATA FUNKCIJA applySwipeAnimation
  function applySwipeAnimation(outClass, inClass) {
    // Pretpostavljamo da su swipeContainer i swipeOverlay definisani
    // Ako swipeOverlay nije definisan, pokušajte da ga dobijete iz DOM-a
    const swipeOverlay = document.getElementById('swipe-overlay');
    swipeContainer.classList.add(outClass);
    if (swipeOverlay) {
      swipeOverlay.classList.add(inClass);
    }
    setTimeout(() => {
      swipeContainer.classList.remove(outClass);
      if (swipeOverlay) {
        swipeOverlay.classList.remove(inClass);
      }
      currentTranslate = 0;
      setSliderPosition();
      previousTranslate = 0;
    }, 400); // Trajanje animacije
  }
}
