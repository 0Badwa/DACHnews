/***********************************************
 * newsModal.js
 * 
 * Ovaj fajl prikazuje i ažurira modal za pojedinačnu vest.
 ***********************************************/

function updateDynamicMeta(feed) {
  const maxTitleLength = 70;
  
  let trimmedTitle = feed.title 
    ? (feed.title.length > maxTitleLength 
      ? feed.title.substring(0, maxTitleLength - 1) + '…' 
      : feed.title) 
    : 'DACH.news';

  document.title = `${trimmedTitle} – DACH.news`;
  const description = feed.content_text
    ? feed.content_text.substring(0, 160)
    : (feed.title || 'Aktuelle Nachrichten aus der DACH-Region');

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  }

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
 * Otvara modal i prikazuje detalje (velika slika, analiza i slično).
 * Sada prima i feedList (niz svih vesti) i currentIndex (pozicija u tom nizu),
 * kako bismo u modal-u mogli da pređemo na sledeću/prethodnu vest kad korisnik svajpuje.
 */
export function openNewsModal(feed, feedList = [], currentIndex = -1) {
  updateDynamicMeta(feed);

  const modal = document.getElementById('news-modal');
  const modalImage = document.getElementById('news-modal-image');
  const modalTitle = document.getElementById('news-modal-title');
  const modalDescription = document.getElementById('news-modal-description');
  const modalSourceTime = document.getElementById('news-modal-source-time');
  const closeModalButton = document.getElementById('close-news-modal');
  const weiterButton = document.getElementById('news-modal-weiter');

  if (!modal || !modalImage || !modalTitle || !modalDescription) {
    console.error("[newsModal] Modal elements not found in DOM.");
    return;
  }

  modal.style.display = 'none';

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

  // Datum
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

  modalTitle.textContent = feed.title || 'No title';
  modalDescription.textContent = feed.content_text || 'Keine Beschreibung';

  const analysisContainer = document.createElement('div');
  analysisContainer.className = 'news-modal-analysis';

  const analysisHeading = document.createElement('h3');
  analysisHeading.className = 'modal-analysis-title';
  analysisHeading.textContent = 'KI-Perspektive: Meinung & Kommentar';
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

  modalImage.onerror = function () {
    this.onerror = null;
    this.src = "src/icons/no-image.png";
  };

  if (feed.image) {
    modalImage.src = `${window.location.origin}/image/${feed.id}:news-modal`;
  } else {
    modalImage.src = "src/icons/no-image.png";
  }

  // ========== NOVO: SWIPE LEVO/DESNO ZA SLEDEĆU/PREDHODNU VEST ==========
  let startX = 0;
  let isDragging = false;
  const threshold = 50; // pikseli

  function onTouchStart(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    const deltaX = currentX - startX;

    // Ako deltaX > threshold => prelazimo na PRETHODNU vest
    if (deltaX > threshold) {
      isDragging = false;
      if (currentIndex > 0) {
        openNewsModal(feedList[currentIndex - 1], feedList, currentIndex - 1);
      }
    }
    // Ako deltaX < -threshold => prelazimo na SLEDEĆU vest
    else if (deltaX < -threshold) {
      isDragging = false;
      if (currentIndex < feedList.length - 1) {
        openNewsModal(feedList[currentIndex + 1], feedList, currentIndex + 1);
      }
    }
  }

  function onTouchEnd() {
    isDragging = false;
  }

  // Dodaj event listenere
  modal.addEventListener('touchstart', onTouchStart, { passive: true });
  modal.addEventListener('touchmove', onTouchMove, { passive: true });
  modal.addEventListener('touchend', onTouchEnd);

  modal.addEventListener('mousedown', onTouchStart);
  modal.addEventListener('mousemove', onTouchMove);
  modal.addEventListener('mouseup', onTouchEnd);
  modal.addEventListener('mouseleave', () => { if (isDragging) onTouchEnd(); });

  // ========== Kraj swipe logike ==========

  closeModalButton.onclick = () => {
    modal.style.display = 'none';
    if (window.location.search.includes('newsId')) {
      window.history.replaceState({}, '', '/');
    }

    // Očistimo event listenere da se ne gomilaju
    modal.removeEventListener('touchstart', onTouchStart);
    modal.removeEventListener('touchmove', onTouchMove);
    modal.removeEventListener('touchend', onTouchEnd);

    modal.removeEventListener('mousedown', onTouchStart);
    modal.removeEventListener('mousemove', onTouchMove);
    modal.removeEventListener('mouseup', onTouchEnd);
    modal.removeEventListener('mouseleave', () => { if (isDragging) onTouchEnd(); });
  };

  weiterButton.onclick = () => {
    if (feed.url) {
      window.open(feed.url, '_blank');
    }
    setTimeout(() => {
      modal.style.display = 'none';
    }, 3000);
  };

  modal.style.display = 'flex';
}
