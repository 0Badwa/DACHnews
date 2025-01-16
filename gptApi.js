async function categorize(feed) {
  try {
    // Validacija ulaznih podataka
    if (!feed.title || !feed.content_text) {
      console.warn(`Feed ${feed.id} nema validan sadržaj.`);
      return { id: feed.id, category: 'Nepoznata kategorija' };
    }

    const response = await fetch(CHATGPT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CHATGPT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ti si stručnjak za određivanje kategorija za vesti.',
          },
          {
            role: 'user',
            content: `Naslov: "${feed.title}". Tekst: "${feed.content_text}". 
            Odredi kategoriju iz sledećih: Technologie, Gesundheit, Sport, Wirtschaft, Kultur, Auto, Reisen, Lifestyle, Panorama, Politik, Unterhaltung, Welt, LGBT.`
          }
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API greška: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const validCategories = [
      "Technologie", "Gesundheit", "Sport", "Wirtschaft", "Kultur",
      "Auto", "Reisen", "Lifestyle", "Panorama", "Politik",
      "Unterhaltung", "Welt", "LGBT"
    ];

    const category = data.choices[0].message?.content?.trim();

    if (!validCategories.includes(category)) {
      console.warn(`Nepoznata kategorija za feed ${feed.id}: ${category}`);
      return { id: feed.id, category: 'Nepoznata kategorija' };
    }

    return { id: feed.id, category };
  } catch (error) {
    console.error(`Greška pri obradi API poziva: ${error.message}`);
    return { id: feed.id, category: 'Greška pri kategorizaciji' };
  }
}

module.exports = { categorize };
