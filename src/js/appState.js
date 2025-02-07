/**
 * Vraća stanje aplikacije iz localStorage.
 * Učitava feedove za aktivnu kategoriju i, nakon što se sadržaj učita,
 * postavlja scrollTop na 0 nakon zakašnjenja od 300ms.
 */
export function restoreAppState() {
  const savedTab = localStorage.getItem('activeTab') || 'Aktuell';
  const container = document.getElementById('news-container');
  if (!container) return;

  // Uvek resetuj scroll poziciju na 0, bez obzira na sačuvanu vrednost
  const resetScroll = () => {
    setTimeout(() => {
      container.scrollTop = 0;
      console.log('Scroll resetovan na 0 za kategoriju:', savedTab);
    }, 300);
  };

  if (savedTab === 'Aktuell') {
    displayAktuellFeeds(true)
      .then(resetScroll)
      .catch(error => console.error('Greška kod učitavanja Aktuell:', error));
  } else {
    displayNewsByCategory(savedTab, true)
      .then(resetScroll)
      .catch(error => console.error(`Greška kod učitavanja kategorije "${savedTab}":`, error));
  }
  
  updateCategoryIndicator(savedTab);
}
