/**
 * newsModal.js
 * 
 * Klikom na 'Weiter' -> otvori link u novom tabu,
 * a modal zatvori posle 3 sekunde.
 * Slike su lazy + async decode radi bolje optimizacije.
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

  // Pronalazimo aktivnu news karticu (newsCard) koja je kliknuta
  const activeNewsCard = document.querySelector('.news-card.active');

  // Ako postoji aktivna kartica, uzimamo izvor iz nje, inače koristimo feed.source
  const sourceName = activeNewsCard 
    ? activeNewsCard.querySelector('.source').textContent 
    : (feed.source || 'Unbekannte Quelle');

  
// Pretpostavka da feed.date_published sadrži datum i vreme u ISO formatu
const publishedDateTime = feed.date_published || ''; 

let formattedDate = '';
let formattedTime = '';

if (publishedDateTime) {
  const dateObj = new Date(publishedDateTime);
  formattedDate = dateObj.toLocaleDateString('de-DE');  // Formatiran datum
  formattedTime = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });  // Formatirano vreme
}

// Prikaz izvora sa datumom i vremenom
modalSourceTime.innerHTML = `
  <span class="modal-source-bold-green">${sourceName.toUpperCase()}</span>
  ${formattedDate && formattedTime ? ` • ${formattedDate} • ${formattedTime}` : ''}
`;



  // Ostali elementi modala
  modalImage.src = feed.image || 'https://via.placeholder.com/240';
  modalImage.loading = 'lazy';
  modalImage.decoding = 'async';

  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Postavljanje modala da se prikaže
  modal.style.display = 'flex';

  // Dugme za zatvaranje modala
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
    }, 3000);
  };
}
