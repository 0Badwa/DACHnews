/**
 * newsModal.js
 * 
 * Ovaj fajl sadrži logiku za otvaranje i zatvaranje novog modala
 * koji prikazuje detalje o pojedinačnoj vesti (slika, naslov, opis, izvor, vreme).
 */

export function openNewsModal(feed) {
  // Nađemo elemente modala
  const modal = document.getElementById('news-modal');
  const modalImage = document.getElementById('news-modal-image');
  const modalTitle = document.getElementById('news-modal-title');
  const modalDescription = document.getElementById('news-modal-description');
  const modalSourceTime = document.getElementById('news-modal-source-time');
  const closeModalButton = document.getElementById('close-news-modal');
  const weiterButton = document.getElementById('news-modal-weiter');

  if (!modal || !modalImage || !modalTitle || !modalDescription || !modalSourceTime) {
    console.error("[newsModal] Modal elements not found in DOM.");
    return;
  }

  // Popuni modal
  modalImage.src = feed.image || 'https://via.placeholder.com/240';
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';
  
  // Formatiramo izvor i vreme
  const sourceName = feed.source || 'Unbekannte Quelle';
  const dateString = feed.date_published || '';
  modalSourceTime.textContent = `${sourceName} | ${dateString}`;

  // Pokažemo modal
  modal.style.display = 'flex';

  // Dugme za zatvaranje modala
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // Dugme Weiter -> otvaranje feed.url
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
  };
}
