/************************************************
 * slug.js
 ************************************************/
// Ova funkcija prima naslov (string) i vraća SEO-friendly slug.
export function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Uklanja neželjene karaktere
    .trim()
    .replace(/[\s-]+/g, '-');     // Zamenjuje više razmaka i crtica jednom crticom
}
