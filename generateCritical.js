import { generate } from 'critical';

generate({
  inline: true, // Inline-uje kritični CSS direktno u HTML
  base: '.',    // Osnovni direktorijum projekta
  src: 'index.html', // HTML fajl koji optimizujemo
  target: 'index-critical.html', // Fajl sa inline CSS-om
  css: ['src/css/styles.css'], // CSS fajl iz kojeg se izvlači kritični CSS

  // Definišemo više rezolucija za bolje performanse na različitim uređajima
  dimensions: [
    {
      width: 375,
      height: 667, // iPhone X
    },
    {
      width: 768,
      height: 1024, // iPad
    },
    {
      width: 1300,
      height: 900, // Desktop
    }
  ]
}).then(() => {
  console.log('✅ Kritični CSS je generisan i inline-ovan u index-critical.html!');
}).catch(err => {
  console.error('❌ Greška pri generisanju kritičnog CSS-a:', err);
});
