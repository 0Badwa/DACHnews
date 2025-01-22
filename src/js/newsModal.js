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

  // Naslov i opis bez hifenacije
  modalTitle.classList.add('no-hyphenation');
  modalDescription.classList.add('no-hyphenation');

  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Izvor (velikim slovima) + datum + vreme
  const sourceName = (feed.source || 'Unbekannte Quelle').toUpperCase();

  let datePart = '';
  let timePart = '';
  if (feed.date_published) {
    const d = new Date(feed.date_published);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      datePart = `${day}.${month}.${year}.`;
      timePart = `${hours}:${minutes}`;
    }
  }
  // Primer formata: BILD • 22.01.2025. • 20:10
  modalSourceTime.textContent = `${sourceName}${datePart ? ' • ' + datePart : ''}${timePart ? ' • ' + timePart : ''}`;

  // Pokažemo modal (flex -> centrirano)
  modal.style.display = 'flex';

  // Dugme za zatvaranje modala
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // Dugme Weiter -> zatvori modal + otvori link
  weiterButton.onclick = () => {
    modal.style.display = 'none';
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
  };
}
