// src/js/search.js

import { openNewsModal } from './newsModal.js';

document.addEventListener('DOMContentLoaded', () => {
  // Dohvati elemente iz DOM-a
  const searchButton = document.getElementById('search-button');
  const searchContainer = document.getElementById('search-container');
  const searchInput = document.getElementById('search-input');
  const closeSearchModalBtn = document.getElementById('close-search-modal');

  if (!searchButton || !searchContainer || !searchInput || !closeSearchModalBtn) {
    console.error("Jedan ili više search elemenata nisu pronađeni u DOM-u.");
    return;
  }

  // Postavi placeholder na nemački jezik
  searchInput.placeholder = "Nachrichten suchen...";

  // Dodaj beli outline za lupu, da se uklopi sa hamburger dugmetom
  searchButton.style.outline = "1px solid #fff";
  
  // Kad se klikne na lupu, prikazujemo ili sakrivamo ceo search container
  searchButton.addEventListener('click', () => {
    if (searchContainer.style.display === 'none' || searchContainer.style.display === '') {
      searchContainer.style.display = 'block';
      searchInput.focus();
    } else {
      searchContainer.style.display = 'none';
    }
  });

  // Omogući pretragu pritiskom na Enter
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // Dugme za zatvaranje search modala
  closeSearchModalBtn.addEventListener('click', closeSearchModal);

  /**
   * Funkcija koja vrši pretragu keširanih "Aktuell" vijesti u localStorage.
   */
  function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    // Preuzmi keširane vijesti
    let feeds = [];
    const cachedFeeds = localStorage.getItem('feeds-Aktuell');
    if (cachedFeeds) {
      feeds = JSON.parse(cachedFeeds);
    }

    // Filtriraj vijesti prema naslovu ili sadržaju
    const results = feeds.filter(feed =>
      (feed.title && feed.title.toLowerCase().includes(query)) ||
      (feed.content_text && feed.content_text.toLowerCase().includes(query))
    );

    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) {
      console.error("Element 'search-results' nije pronađen.");
      return;
    }
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
      resultsContainer.innerHTML = '<p style="color: #fff;">Keine Ergebnisse gefunden.</p>';
    } else {
      results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = item.title;
        // Klikom na rezultat otvara se modal sa vestima
        div.addEventListener('click', () => {
          openNewsModal(item);
          closeSearchModal();
        });
        resultsContainer.appendChild(div);
      });
    }
    openSearchModal();
  }

  /**
   * Funkcija za otvaranje search modala.
   */
  function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Funkcija za zatvaranje search modala.
   */
  function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
});
