/**
 * Ova mapa povezuje domen (npr. 'spiegel') sa ISO kodom države (npr. 'de'),
 * što se koristi za dodelu zastavice (flag) i za definisanje dozvoljenih izvora.
 */
export const brandMap = {
  // DE (Nemačka)
  'analyse-und-kritik': 'de',
  'ard-tagesschau': 'de',
  'cicero': 'de',
  'der-freitag': 'de',
  'der-spiegel': 'de',
  'die-tageszeitung': 'de',
  'frankfurter-rundschau': 'de',
  'jungle-world': 'de',
  'neues-deutschland': 'de',
  'queer': 'de',
  'sueddeutsche': 'de',
  'volksstimme': 'de',
  'zeit': 'de',
  'zdf': 'de',

  // AT (Austrija)
  'augustin': 'at',
  'derstandard': 'at',
  'falter': 'at',
  'kurier': 'at',
  'profil': 'at',
  'salzburger-nachrichten': 'at',
  'wienerzeitung': 'at',

  // CH (Švajcarska)
  'aargauerzeitung': 'ch',
  'blick': 'ch',
  'nzz': 'ch',
  'pszeitung': 'ch',
  'republik': 'ch',
  'st-galler-tagblatt': 'ch',
  'tagesanzeiger': 'ch',
  'vorwaerts': 'ch',
  'woz': 'ch'
};

/**
 * Alternativne domene za izvore – ako medij koristi više domena.
 */
export const sourceAliases = {
  // Nemački mediji
  'analyse-und-kritik': ['akweb.de'],
  'ard-tagesschau': ['tagesschau.de'],
  'cicero': ['cicero.de'],
  'der-freitag': ['freitag.de'],
  'der-spiegel': ['spiegel.de'],
  'die-tageszeitung': ['taz.de', 'taz-online.de'],
  'frankfurter-rundschau': ['fr.de', 'frankfurter-rundschau.de'],
  'jungle-world': ['jungle.world'],
  'neues-deutschland': ['nd-aktuell.de', 'nd-online.de'],
  'queer': ['queer.de'],
  'sueddeutsche': ['sueddeutsche.de'],
  'volksstimme': ['volksstimme.de'],
  'zeit': ['zeit.de', 'zeit-online.de'],
  'zdf': ['zdf.de'],

  // Austrijski mediji
  'augustin': ['der-augustin.at'],
  'derstandard': ['derstandard.at'],
  'falter': ['falter.at'],
  'kurier': ['kurier.at'],
  'profil': ['profil.at'],
  'salzburger-nachrichten': ['sn.at', 'salzburgernachrichten.at'],
  'wienerzeitung': ['wienerzeitung.at'],

  // Švajcarski mediji
  'aargauerzeitung': ['aargauerzeitung.ch'],
  'blick': ['blick.ch'],
  'nzz': ['nzz.ch', 'neuezuercherzeitung.ch'],
  'pszeitung': ['pszeitung.ch'],
  'republik': ['republik.ch'],
  'st-galler-tagblatt': ['tagblatt.ch', 'stgaller-tagblatt.ch'],
  'tagesanzeiger': ['tagesanzeiger.ch'],
  'vorwaerts': ['vorwaerts.ch'],
  'woz': ['woz.ch']
};

/**
 * ALLOWED_SOURCES -> lista dozvoljenih izvora (u UPPERCASE),
 * generisana iz ključeva brandMap-a.
 */
export const ALLOWED_SOURCES = Object.keys(brandMap).map(key => key.toUpperCase());
