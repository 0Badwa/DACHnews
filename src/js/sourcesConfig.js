// sourcesConfig.js

/**
 * Ova mapa povezuje domen (npr. 'spiegel') sa ISO kodom države (npr. 'de'),
 * što se koristi za dodelu zastavice (flag) i za definisanje dozvoljenih izvora.
 */
export const brandMap = {
  // DE (Nemačka)
  'bild': 'de',
  'spiegel': 'de',
  'zeit': 'de',
  'taz': 'de',
  'freitag': 'de',
  'analyse-und-kritik': 'de',
  'cruisermagazin': 'de',
  'jungle-world': 'de',
  'neues-deutschland': 'de',
  'queer': 'de',
  'volksstimme': 'de',
  'anzeigerbonn': 'de',
  'die-welt': 'de',
  'sueddeutsche': 'de',
  'focus': 'de',
  'handelsblatt': 'de',
  'faz': 'de',
  'stern': 'de',
  'ndr': 'de',
  'zdf': 'de',
  'dw': 'de',
  // AT (Austrija)
  'falter': 'at',
  'kurier': 'at',
  'profil': 'at',
  'wienerzeitung': 'at',
  'derstandard': 'at',
  'salzburg': 'at',
  'augustin': 'at',
  'diepresse': 'at',
  'orf': 'at',
  'kleinezeitung': 'at',
  'nachrichten': 'at',
  // CH (Švajcarska)
  'blick': 'ch',
  'aargauerzeitung': 'ch',
  'woz': 'ch',
  'tagblatt': 'ch',
  'pszeitung': 'ch',
  'tagesanzeiger': 'ch',
  'vorwaerts': 'ch',
  'nzz': 'ch',
  'srf': 'ch'
};

/**
 * ALLOWED_SOURCES -> lista dozvoljenih izvora (u UPPERCASE),
 * generisana iz ključeva brandMap-a.
 */
export const ALLOWED_SOURCES = Object.keys(brandMap).map(key => key.toUpperCase());
