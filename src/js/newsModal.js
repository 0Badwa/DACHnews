/**
 * newsModal.js
 * 
 * Klikom na 'Weiter' -> otvori link u novom tabu,
 * a modal zatvori posle 3 sekunde.
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

  // Postavimo sliku
  modalImage.src = feed.image || 'https://via.placeholder.com/240';

  // Naslov i opis
  modalTitle.classList.add('no-hyphenation');
  modalDescription.classList.add('no-hyphenation');
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Izvor (velika slova, zeleno/bold), datum i vreme
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

  // Dugme X -> odmah zatvara
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // Weiter -> otvori link, zatvori modal posle 3 sekunde
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000); // sada 3 sekunde
  };
}
