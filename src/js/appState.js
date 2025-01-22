/**
 * appState.js
 * 
 * Ovaj fajl se bavi čuvanjem i vraćanjem stanja aplikacije
 * (aktivni tab, scroll pozicija) pomoću LocalStorage-a.
 */

/**
 * Funkcija koja čuva aktivni tab i scroll poziciju u LocalStorage,
 * kako bi ih obnovili kasnije.
 */
export function saveAppState(currentTab) {
  const scrollPos = window.scrollY || 0;
  localStorage.setItem('activeTab', currentTab);
  localStorage.setItem('scrollPosition', scrollPos);
}

/**
 * Funkcija koja vraća aplikaciju na prethodno aktivni tab i scroll poziciju.
 */
export function restoreAppState() {
  const savedTab = localStorage.getItem('activeTab');
  const savedPosition = localStorage.getItem('scrollPosition');
  if (savedTab) {
    const tabButton = document.querySelector(`.tab[data-tab="${savedTab}"]`);
    if (tabButton) {
      tabButton.click();
    }
  } else {
    // Ako nema sacuvanog taba, kliknemo na Neueste
    const neuesteTab = document.querySelector('.tab[data-tab="Neueste"]');
    if (neuesteTab) {
      neuesteTab.click();
    }
  }
  if (savedPosition) {
    setTimeout(() => window.scrollTo(0, savedPosition), 100);
  }
}
