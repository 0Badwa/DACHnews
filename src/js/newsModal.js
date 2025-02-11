/**
 * Otvara modal sa novom slikom bez kratkotrajnog prikaza stare slike.
 * Ceo modal ostaje sakriven dok se nova slika ne učita,
 * pa se sve prikaže odjednom, bez "treptanja".
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

  // Prvo sklonimo modal (da nema treptanja starog stanja)
  modal.style.display = 'none';
// Resetujemo sliku i dodajemo alt atribut
modalImage.src = ''; 
modalImage.alt = 'News image';

// Dodajemo CSS klasu koja sakriva alt tekst
modalImage.classList.add('hide-alt');

// Kada se slika učita, prikazujemo je ponovo
modalImage.onload = () => {
  modalImage.classList.remove('hide-alt');
};
  // Dohvati izvor sa aktivne kartice, ili feed.source
  const activeNewsCard = document.querySelector('.news-card.active');
  const sourceName = activeNewsCard
    ? activeNewsCard.querySelector('.source').textContent
    : (feed.source || 'Unbekannte Quelle');

  // Datumi
  const publishedDateTime = feed.date_published || '';
  let formattedDate = '';
  let formattedTime = '';
  if (publishedDateTime) {
    const dateObj = new Date(publishedDateTime);
    formattedDate = dateObj.toLocaleDateString('de-DE');
    formattedTime = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  modalSourceTime.innerHTML = `
    <span class="modal-source-bold-green">${sourceName.toUpperCase()}</span>
    ${formattedDate && formattedTime ? ` • ${formattedDate} • ${formattedTime}` : ''}
  `;

  // Popuni ostale elemente
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Dugme za zatvaranje
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // "Weiter" -> otvaramo link, zatvaramo modal posle 3s
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };

  // Napravi novi Image objekat pa sačekaj da se učita
  const tempImg = new Image();
  tempImg.onload = () => {
    // Kada se učita, tek onda postavi src i prikaži modal
    modalImage.src = tempImg.src;
    modal.style.display = 'flex';
  };
  tempImg.onerror = () => {
    // Ako nema slike, možemo postaviti fallback ili samo prikazati modal
    console.warn("[newsModal] Could not load image:", feed.image);
    modal.style.display = 'flex';
  };

 // Generišemo pun URL za sliku
const BASE_URL = window.location.hostname.includes("localhost")
? "http://localhost:3001"
: "https://www.dach.news";

if (feed.image && feed.image.startsWith('/')) {
// Ako u putanji već nema sufiks za modal, dodaj ":news-modal"
let imageUrl = BASE_URL + feed.image;
if (!feed.image.includes(':news-modal')) {
  imageUrl += ':news-modal';
}
// Preporučljivo enkodirati URL (posebno ako ima dvotačke)
tempImg.src = encodeURI(imageUrl);
} else {
// Fallback: koristi originalnu vrednost ili default sliku
tempImg.src = feed.image || (BASE_URL + '/img/noimg.png');
}
}
