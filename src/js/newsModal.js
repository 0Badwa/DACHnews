/***********************************************
 * newsModal.js
 ***********************************************/

/**
 * Ažurira <title>, <meta> description, kao i
 * Open Graph i Twitter card meta tagove
 * na osnovu prosledjene vesti (feed).
 */
function updateDynamicMeta(feed) {
  // 1) Title
  document.title = feed.title
    ? `${feed.title} – DACH.news`
    : 'DACH.news';

  // 2) Meta description (uzmi prvih ~160 karaktera iz content_text, ako postoji)
  const description = feed.content_text
    ? feed.content_text.substring(0, 160)
    : (feed.title || 'Aktuelle Nachrichten aus der DACH-Region');
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  }

  // 3) Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', document.title);
  }
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    ogDesc.setAttribute('content', description);
  }
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    ogImage.setAttribute('content', feed.image || 'https://dach.news/preview.jpg');
  }
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    // Ako hoćeš da menjaš url za svaku vest, možeš npr:
    // ogUrl.setAttribute('content', `https://www.dach.news/news/${feed.id}`);
    ogUrl.setAttribute('content', 'https://dach.news');
  }

  // 4) Twitter
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) {
    twTitle.setAttribute('content', document.title);
  }
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) {
    twDesc.setAttribute('content', description);
  }
  const twImage = document.querySelector('meta[name="twitter:image"]');
  if (twImage) {
    twImage.setAttribute('content', feed.image || 'https://dach.news/preview.jpg');
  }
}

/**
 * Otvara modal sa novom slikom bez kratkotrajnog prikaza stare slike.
 * Ceo modal ostaje sakriven dok se nova slika ne učita,
 * pa se sve prikaže odjednom, bez "treptanja".
 */
export function openNewsModal(feed) {
  // Prvo ažuriramo <title> i <meta> tagove za SEO
  updateDynamicMeta(feed);

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

  // Ako postoji aktivna news-card, uzmi source odatle, inače iz feed.source
  const activeNewsCard = document.querySelector('.news-card.active');
  const sourceName = activeNewsCard
    ? activeNewsCard.querySelector('.source').textContent
    : (feed.source || 'Unbekannte Quelle');

  // Formatiraj datum i vreme za prikaz
  const publishedDateTime = feed.date_published || '';
  let formattedDate = '';
  let formattedTime = '';
  if (publishedDateTime) {
    const dateObj = new Date(publishedDateTime);
    formattedDate = dateObj.toLocaleDateString('de-DE');
    formattedTime = dateObj.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  modalSourceTime.innerHTML = `
    <span class="modal-source-bold-green">${sourceName.toUpperCase()}</span>
    ${formattedDate && formattedTime ? ` • ${formattedDate} • ${formattedTime}` : ''}
  `;

  // Popuni naslov i opis vesti
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Kreiraj sekciju za AI analizu (ako je ima)
  const analysisContainer = document.createElement('div');
  analysisContainer.className = 'news-modal-analysis';

  const analysisHeading = document.createElement('h3');
  analysisHeading.className = 'modal-analysis-title';
  analysisHeading.textContent = 'AI-Perspektive: Meinung & Kommentar';
  analysisContainer.appendChild(analysisHeading);

  const analysisText = document.createElement('p');
  analysisText.className = 'modal-analysis-text';
  analysisText.textContent = feed.analysis || 'Keine Meinung verfügbar.';
  analysisContainer.appendChild(analysisText);

  // Umetni analysisContainer iznad dugmadi
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

  // Dugme za zatvaranje
  closeModalButton.onclick = () => {
    modal.style.display = 'none';
  };

  // Dugme "Weiter" -> otvaranje originalnog url-a
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    // Zatvori modal posle par sekundi ili odmah (po želji)
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };

  // Sada kreiramo privremeni <img> da se učita slika
  const BASE_URL = window.location.hostname.includes("localhost")
    ? "http://localhost:3001"
    : "https://www.dach.news";

  const tempImg = new Image();
  tempImg.onload = () => {
    modalImage.src = tempImg.src;
    modal.style.display = 'flex';
  };
  tempImg.onerror = () => {
    console.warn("[newsModal] Could not load image:", feed.image);
    modal.style.display = 'flex';
  };

  // Ako je putanja feed.image relativna (počinje sa "/"), dodaj base URL
  if (feed.image && feed.image.startsWith('/')) {
    let finalUrl = BASE_URL + feed.image;
    // Ako nije već suffix ":news-modal", dodaj ga
    if (!feed.image.includes(':news-modal')) {
      finalUrl += ':news-modal';
    }
    tempImg.src = encodeURI(finalUrl);
  } else {
    // Fallback ako nema slike
    tempImg.src = feed.image || (BASE_URL + '/src/icons/no-image.png');
  }
}
