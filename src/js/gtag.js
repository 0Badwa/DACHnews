// src/js/gtag.js
// Ova skripta učitava Google Tag Manager (GTM) kada se dogodi prvi scroll događaj

let gtagLoaded = false;

function loadGTag() {
  if (!gtagLoaded) {
    const script = document.createElement('script');
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-31LTMD7YMB";
    document.head.appendChild(script);

    script.onload = function() {
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'G-31LTMD7YMB', {
        'anonymize_ip': true,
        'storage': 'none',
        'client_storage': 'none',
        'cookie_flags': 'SameSite=None;Secure',
        'allow_ad_personalization_signals': false
      });
    };

    gtagLoaded = true;
  }
}

window.addEventListener('scroll', loadGTag, { once: true });
