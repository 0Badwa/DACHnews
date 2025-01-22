/**
 * newsModal.js
 * 
 * Logika za otvaranje i zatvaranje modala sa detaljima o vesti (slika, naslov, opis, izvor, vreme).
 * Klik na 'Weiter' -> sačekamo 1s i zatvorimo modal.
 */

export function openNewsModal(feed) {
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

  // Ubacujemo podatke
  modalImage.src = feed.image || 'https://via.placeholder.com/240';

  // Naslov i opis bez hifenacije, centrirani
  modalTitle.classList.add('no-hyphenation');
  modalDescription.classList.add('no-hyphenation');
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Izvor (velika slova, zeleno/bold), datum i vreme ostaju belim slovima
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

  const dateTimeString = datePart && timePart
    ? ` • ${datePart} • ${timePart}`
    : (datePart ? ` • ${datePart}` : (timePart ? ` • ${timePart}` : ''));
  modalSourceTime.innerHTML = `<span class="modal-source-bold-green">${sourceName}</span>${dateTimeString}`;

  // Prikažemo modal
  modal.style.display = 'flex';

  // Dugme X
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // Klik na Weiter:
  // 1) Otvaramo link u novom tabu
  // 2) Posle 1s zatvaramo modal
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };
}
