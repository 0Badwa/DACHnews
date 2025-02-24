/***********************************************
 * newsModal.js
 * 
 * Ovaj fajl prikazuje i ažurira modal za pojedinačnu vest.
 ***********************************************/


/**
 * Funkcija koja ažurira <title>, <meta> description, kao i Open Graph i Twitter card meta tagove
 * na osnovu prosleđene vesti (feed).
 */
function updateDynamicMeta(feed) {
  const maxTitleLength = 70;
  
  // Skrati naslov ako je predugačak
  let trimmedTitle = feed.title 
    ? (feed.title.length > maxTitleLength 
      ? feed.title.substring(0, maxTitleLength - 1) + '…' 
      : feed.title) 
    : 'DACH.news';

  // 1) Title
  document.title = `${trimmedTitle} – DACH.news`;

  // 2) Meta description (prvih ~160 karaktera)
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
    ogUrl.setAttribute('content', `https://www.dach.news/news/${feed.id}`);
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
 * Funkcija koja otvara modal za pojedinačnu vest (feed),
 * prikazuje detalje, inicijalno sakriva modal dok se slika ne učita
 * i nakon toga je prikazuje.
 */
export function openNewsModal(feed) {
  // Ažurira <title> i <meta> tagove
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

  // Sakrij modal dok se sve ne pripremi
  modal.style.display = 'none';

  // Reset
  modalImage.src = '';
  modalImage.alt = 'News image';
  modalImage.classList.add('hide-alt');
  modalImage.onload = () => {
    modalImage.classList.remove('hide-alt');
  };

  // Izvor
  const activeNewsCard = document.querySelector('.news-card.active');
  const sourceName = activeNewsCard
    ? activeNewsCard.querySelector('.source').textContent
    : (feed.source || 'Unbekannte Quelle');

  // Format datuma
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

  // Naslov i opis
  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  // Analiza (ako postoji)
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



// Dugme X - zatvaranje
closeModalButton.onclick = () => {
  modal.style.display = 'none';
  // Ako URL sadrži query parametar "newsId", ukloni ga i preusmeri na osnovnu stranicu
  if (window.location.search.includes('newsId')) {
    window.history.replaceState({}, '', '/');
  }
};


  // Dugme "Weiter" -> otvaranje originalnog URL-a
  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };

  // Definicija BASE_URL – podržava localhost, exyunews.onrender.com i www.exyunews.onrender.com,
  // a podrazumevano se koristi https://www.dach.news
  const hostname = window.location.hostname;
  const BASE_URL = hostname.includes("localhost") || hostname === "192.168.1.16"
    ? "http://localhost:3002"
    : hostname === "exyunews.onrender.com"
      ? "https://exyunews.onrender.com"
      : hostname === "www.exyunews.onrender.com"
        ? "https://www.exyunews.onrender.com"
        : "https://www.dach.news";

  // Domena koje smo ranije blokirali
  const invalidImageSources = [
    "https://p6.focus.de",
    "https://quadro.burda-forward.de"
  ];

  const tempImg = new Image();
  tempImg.onload = () => {
    // Kad se temp slika učita, postavimo je u modal i prikažemo modal
    modalImage.src = tempImg.src;
    modal.style.display = 'flex';
  };
  tempImg.onerror = () => {
    console.warn("[newsModal] Could not load image:", feed.image);
    // Umesto zatvaranja, koristimo fallback "no-image.png"
    modalImage.src = `${BASE_URL}/src/icons/no-image.png`;
    modal.style.display = 'flex';
  };

  // Ako je slika sa blokiranog domena -> fallback
  if (feed.image && invalidImageSources.some(src => feed.image.startsWith(src))) {
    console.warn("[newsModal] Blokirana slika:", feed.image);
    tempImg.src = `${BASE_URL}/src/icons/no-image.png`;
  } else {
    // Normalan slučaj
    let id;
    if (feed && feed.id) {
      // Umesto odsecanja dvotačke, koristimo ceo feed.id
      id = feed.id;
    } else if (feed.image && feed.image.startsWith('/')) {
      // Pokušaj da se izvuče id iz feed.image pretpostavljajući format "/image/{id}" ili "/image/{id}:news-card"
      const parts = feed.image.split('/');
      if (parts.length >= 3) {
        id = parts[2].split(':')[0];
      }
    }
    if (id) {
      // Učitava verziju za modal (240x180) koristeći dobijeni id
      tempImg.src = encodeURI(`${BASE_URL}/image/${id}:news-modal`);
    } else if (feed.image && feed.image.startsWith('/')) {
      // Ako ne možemo da izvučemo id, formiramo URL iz feed.image
      let finalUrl = BASE_URL + feed.image;
      if (!feed.image.includes(':news-modal')) {
        finalUrl += ':news-modal';
      }
      tempImg.src = encodeURI(finalUrl);
    } else {
      tempImg.src = feed.image || (`${BASE_URL}/src/icons/no-image.png`);
    }
  }}
