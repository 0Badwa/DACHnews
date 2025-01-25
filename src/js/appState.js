export function saveAppState(currentTab) {
  const container = document.getElementById('news-container');
  const scrollPos = container ? container.scrollTop : 0;
  
  localStorage.setItem(`${currentTab}_scroll`, scrollPos);
  localStorage.setItem('activeTab', currentTab);
}

export function restoreAppState() {
  const savedTab = localStorage.getItem('activeTab') || 'Aktuell';
  const scrollPos = localStorage.getItem(`${savedTab}_scroll`) || 0;

  // Restore category
  const tab = document.querySelector(`.tab[data-tab="${savedTab}"]`);
  if (tab) {
    tab.click();
    updateCategoryIndicator(savedTab);
  }

  // Restore scroll
  const container = document.getElementById('news-container');
  if (container) {
    requestAnimationFrame(() => {
      container.scrollTop = scrollPos;
    });
  }
}