/**
 * Otvara modal sa detaljima selektovane vesti.
 * Najpre obriše prethodni src i sakrije sliku,
 * zatim postavlja novi src i prikazuje sliku tek kada se učita.
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

  // Sakrij i isprazni sliku dok se ne učita nova
  modalImage.style.opacity = '0';
  modalImage.src = '';

  // Izvor
  const activeNewsCard = document.querySelector('.news-card.active');
  const sourceName = activeNewsCard
    ? activeNewsCard.querySelector('.source').textContent
    : (feed.source || 'Unbekannte Quelle');

  // Format datuma i vremena
  const publishedDateTime = feed.date_published || '';
  let formattedDate = '';
  let formattedTime = '';
  if (publishedDateTime) {
    const dateObj = new Date(publishedDateTime);
    formattedDate = dateObj.toLocaleDateString('de-DE');
    formattedTime = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  // Prikaz izvora sa datumom/vremenom
  modalSourceTime.innerHTML = `
    <span class="modal-source-bold-green">${sourceName.toUpperCase()}</span>
    ${formattedDate && formattedTime ? ` • ${formattedDate} • ${formattedTime}` : ''}
  `;

  // Postavi naslov i opis
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Klikom na "Schließen" zatvori modal
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // „Weiter“ otvara link u novom tabu, pa zatvara modal posle 3 sekunde
  weiterButton.onclick = () => {
    if (feed.url) window.open(feed.url, '_blank');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };

  // Kad se nova slika učita, prikaži je
  modalImage.addEventListener('load', () => {
    modalImage.style.opacity = '1';
  }, { once: true });

  // Odredi ispravan src za modalnu sliku
  const BASE_URL = (window.location.hostname.includes("localhost"))
    ? "http://localhost:3001"
    : "https://www.dach.news";

  if (feed.image && feed.image.startsWith('/')) {
    // Ako ima sufiks :news-modal, koristi ga, inače ga dodaj
    modalImage.src = feed.image.includes(':news-modal')
      ? BASE_URL + feed.image
      : BASE_URL + feed.image + ':news-modal';
  } else {
    // Fallback
    modalImage.src = feed.image || `${BASE_URL}/img/noimg.png`;
  }

  // Prikaži modal
  modal.style.display = 'flex';
}
