/**
 * settings.js
 * 
 * Ovaj fajl sadrži logiku za podešavanje teme (dark/light),
 * menjanje veličine fonta i otvaranje/ zatvaranje "Einstellungen" modala.
 */

export function initSettings() {
  // Učitavamo iz localStorage, ili default 16
  let currentCardFontSize = parseInt(localStorage.getItem('cardFontSize') || '16');

  /**
   * Primeni veličinu fonta na .news-card preko CSS varijable.
   */
  function applyCardFontSize(size) {
    const root = document.documentElement;
    root.style.setProperty('--card-font-size', size + 'px');
  }

  // Odmah primenimo vrednost
  applyCardFontSize(currentCardFontSize);

  /**
   * Funkcija za promenu teme (dark/light).
   */
  function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = newTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
    }
  }

  /**
   * Menja veličinu fonta za kartice (po 2px).
   */
  function changeFontSize(delta) {
    currentCardFontSize += delta;
    if (currentCardFontSize < 12) currentCardFontSize = 12;
    if (currentCardFontSize > 36) currentCardFontSize = 36;
    localStorage.setItem('cardFontSize', currentCardFontSize.toString());
    applyCardFontSize(currentCardFontSize);
  }

  const menuButton = document.getElementById('menu-button');
  const closeSettingsButton = document.getElementById('close-settings');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const fontIncreaseButton = document.getElementById('font-increase');
  const fontDecreaseButton = document.getElementById('font-decrease');

  function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'flex';
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
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
      closeSettingsModal();
    });
  }
  if (fontIncreaseButton) {
    fontIncreaseButton.addEventListener('click', () => changeFontSize(2));
  }
  if (fontDecreaseButton) {
    fontDecreaseButton.addEventListener('click', () => changeFontSize(-2));
  }

  // Učitaj prethodno sačuvana podešavanja teme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = savedTheme === 'light' ? 'Dark Modus' : 'Licht Modus';
  }
}
