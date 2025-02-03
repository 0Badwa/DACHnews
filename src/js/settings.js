/**
 * settings.js
 * 
 * Novi izgled menija: Quellen, Kategorien, Schriftgröße, Über.
 * Uklonjena opcija Dark/Licht modus. 
 * Kad kliknemo na Quellen/Kategorien, zatvori se Settings i otvori se odgovarajući modal.
 * 
 * Kod 'Schriftgröße' -> menja font-size "u živo" i 
 * ostavljamo polu-providan modal (opcionalno, ili zadržavamo normalnu pozadinu).
 */

export function initSettings() {
  let currentCardFontSize = parseInt(localStorage.getItem('cardFontSize') || '16');

  function applyCardFontSize(size) {
    const root = document.documentElement;
    root.style.setProperty('--card-font-size', size + 'px');
    // Možemo i title font
    root.style.setProperty('--news-title-font-size', (size * 0.9) + 'px');
  }

  // Odmah primenimo
  applyCardFontSize(currentCardFontSize);

  function changeFontSize(delta) {
    currentCardFontSize += delta;
    if (currentCardFontSize < 12) currentCardFontSize = 12;
    if (currentCardFontSize > 36) currentCardFontSize = 36;
    localStorage.setItem('cardFontSize', currentCardFontSize.toString());
    applyCardFontSize(currentCardFontSize);
  }

  const menuButton = document.getElementById('menu-button');
  const closeSettingsButton = document.getElementById('close-settings');
  // Nove stavke:
  const quellenButton = document.getElementById('quellen-button');
  const kategorienButton = document.getElementById('kategorien-button');
  const uberButton = document.getElementById('uber-button');

// Event listener za otvaranje Kontakt modala
const kontaktButton = document.getElementById('kontakt-button');
if (kontaktButton) {
  kontaktButton.addEventListener('click', () => {
    const kontaktModal = document.getElementById('kontakt-modal');
    if (kontaktModal) {
      kontaktModal.style.display = 'flex';
    }
  });
}

// Event listener za otvaranje Datenschutz modala
const datenschutzButton = document.getElementById('datenschutz-button');
if (datenschutzButton) {
  datenschutzButton.addEventListener('click', () => {
    const datenschutzModal = document.getElementById('datenschutz-modal');
    if (datenschutzModal) {
      datenschutzModal.style.display = 'flex';
    }
  });
}


  
  const fontIncreaseButton = document.getElementById('font-increase');
  const fontDecreaseButton = document.getElementById('font-decrease');

  function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'flex';
      // Da bi se video newsContainer ispod, možemo umesto full black 
      // staviti npr. background-color: rgba(0,0,0,0.5) u .modal 
      // (u styles.css)
    }
  }
  function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'none';
    }
  }

  if (menuButton) {
    menuButton.addEventListener('click', openSettingsModal);
  }
  if (closeSettingsButton) {
    closeSettingsButton.addEventListener('click', closeSettingsModal);
  }

  // Kada kliknemo na "Quellen" -> zatvori Settings, otvori quellen modal
  if (quellenButton) {
    quellenButton.addEventListener('click', () => {
      closeSettingsModal();
      openQuellenModal();
    });
  }
  // Isto za Kategorien
  if (kategorienButton) {
    kategorienButton.addEventListener('click', () => {
      closeSettingsModal();
      openKategorienModal();
    });
  }

  // Schriftgröße
  if (fontIncreaseButton) {
    fontIncreaseButton.addEventListener('click', () => changeFontSize(2));
  }
  if (fontDecreaseButton) {
    fontDecreaseButton.addEventListener('click', () => changeFontSize(-2));
  }

  // Über
  if (uberButton) {
    uberButton.addEventListener('click', () => {
      closeSettingsModal();
      openUberModal();
    });
  }
}

/**
 * Funkcije za otvaranje modala quellen / kategorien / über
 * Minimalna logika; u praksi treba popuniti spiskove, itd.
 */
function openQuellenModal() {
  const modal = document.getElementById('quellen-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Ovde možete popuniti .quellen-list prema available sources...
  }
  const closeBtn = document.getElementById('close-quellen-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}

function openKategorienModal() {
  const modal = document.getElementById('kategorien-modal');
  if (modal) {
    modal.style.display = 'flex';
    // popuniti listu kategorija
  }
  const closeBtn = document.getElementById('close-kategorien-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}

function openUberModal() {
  const modal = document.getElementById('uber-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
  const closeBtn = document.getElementById('close-uber-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
});
