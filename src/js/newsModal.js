/**
 * newsModal.js
 * 
 * Ovaj fajl sadrži logiku za otvaranje i zatvaranje novog modala
 * koji prikazuje detalje o pojedinačnoj vesti (slika, naslov, opis, izvor, vreme).
 * Sada modal ostaje otvoren i zatvara se tek kada se korisnik vrati (focus) u tab iz originalnog linka.
 */

let closeOnFocusReturn = false;

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

  // Naslov i opis - bez hifenacije
  modalTitle.classList.add('no-hyphenation');
  modalDescription.classList.add('no-hyphenation');

  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Izvor (velikim slovima, bold + zelena boja),
  // dok datum i vreme ostaju u normalnoj boji
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

  // Izvor i vreme stavljamo u innerHTML, da bi izvor bio posebno stilizovan
  // Primer: <span class="modal-source-bold-green">BILD</span> • 22.01.2025. • 20:10
  const dateTimeString = datePart && timePart 
    ? ` • ${datePart} • ${timePart}`
    : (datePart ? ` • ${datePart}` : (timePart ? ` • ${timePart}` : ''));
  modalSourceTime.innerHTML = `<span class="modal-source-bold-green">${sourceName}</span>${dateTimeString}`;

  // Pokažemo modal
  modal.style.display = 'flex';

  // Dugme X
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // "Weiter" -> otvaranje linka u novom tabu, 
  // i setovanje "closeOnFocusReturn=true" da se modal zatvori kad se korisnik vrati
  weiterButton.onclick = () => {
    if (feed.url) {
      closeOnFocusReturn = true; // Kad se vrati u prozor, zatvaramo modal
      window.open(feed.url, '_blank');
    }
  };

  // Event za zatvaranje modala pri povratku (fokus) sa sajta
  window.addEventListener('focus', handleFocus);
  
  // Pomoćna funkcija
  function handleFocus() {
    if (closeOnFocusReturn) {
      modal.style.display = 'none';
      closeOnFocusReturn = false; 
      window.removeEventListener('focus', handleFocus);
    }
  }
}
