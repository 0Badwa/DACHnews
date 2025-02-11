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

  // Sakrij modal da bi se resetovao sadržaj
  modal.style.display = 'none';

  // Resetuj sliku i postavi alt tekst
  modalImage.src = '';
  modalImage.alt = 'News image';
  modalImage.classList.add('hide-alt');
  modalImage.onload = () => {
    modalImage.classList.remove('hide-alt');
  };

  // Dohvati izvor iz aktivne kartice ili koristi feed.source
  const activeNewsCard = document.querySelector('.news-card.active');
  const sourceName = activeNewsCard
    ? activeNewsCard.querySelector('.source').textContent
    : (feed.source || 'Unbekannte Quelle');

  // Formatiraj datum i vreme
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

  // Postavi naslov i opis vesti
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // --- Kreiraj sekciju za AI analizu ---
  const analysisContainer = document.createElement('div');
  analysisContainer.className = 'news-modal-analysis';

  // Naslov sekcije – zelena boja, usklađeno s dizajnom
  const analysisHeading = document.createElement('h3');
  analysisHeading.className = 'modal-analysis-title';
  analysisHeading.textContent = 'AI-Perspektive: Meinung & Kommentar';
  analysisContainer.appendChild(analysisHeading);

  // Tekst analize – font veličine 0.7rem, beli tekst
  const analysisText = document.createElement('p');
  analysisText.className = 'modal-analysis-text';
  analysisText.textContent = feed.analysis || 'Keine Meinung verfügbar.';
  analysisContainer.appendChild(analysisText);

  // U modalContent, umetni AI Analyse sekciju iznad kontejnera sa dugmadima
  const modalContent = modal.querySelector('.news-modal-content');
  if (modalContent) {
    const existingAnalysis = modalContent.querySelector('.news-modal-analysis');
    if (existingAnalysis) {
      existingAnalysis.remove();
    }
    const modalButtons = modalContent.querySelector('.modal-buttons');
    if (modalButtons) {
      modalContent.insertBefore(analysisContainer, modalButtons);
    } else {
      modalContent.appendChild(analysisContainer);
    }
  }

  // Dugme za zatvaranje modala
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // Dugme "Weiter" – otvori link i zatvori modal posle 3 sekunde
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };

  // Kreiraj privremeni Image objekat da sačekamo učitavanje slike
  const tempImg = new Image();
  tempImg.onload = () => {
    modalImage.src = tempImg.src;
    modal.style.display = 'flex';
  };
  tempImg.onerror = () => {
    console.warn("[newsModal] Could not load image:", feed.image);
    modal.style.display = 'flex';
  };

  // Generiši pun URL za sliku
  const BASE_URL = window.location.hostname.includes("localhost")
    ? "http://localhost:3001"
    : "https://www.dach.news";

  if (feed.image && feed.image.startsWith('/')) {
    let imageUrl = BASE_URL + feed.image;
    if (!feed.image.includes(':news-modal')) {
      imageUrl += ':news-modal';
    }
    tempImg.src = encodeURI(imageUrl);
  } else {
    tempImg.src = feed.image || (BASE_URL + '/img/noimg.png');
  }
}
