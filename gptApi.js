require('dotenv').config();

const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';
const CHATGPT_API_KEY = process.env.OPENAI_API_KEY;

async function categorize(feed) {
  try {
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
            content: 'Ti si AI koji pomaže u određivanju kategorije za vesti.',
          },
          {
            role: 'user',
            content: `Odredi kategoriju za sledeću vest: ${feed.content}`,
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API greška: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API odgovor:', JSON.stringify(data, null, 2)); // Dodato za dijagnostiku

    if (!data.choices || !data.choices.length) {
      throw new Error('API nije vratio valjan odgovor.');
    }

    return {
      id: feed.id,
      category: data.choices[0].message?.content?.trim() || 'Nepoznata kategorija',
    };
  } catch (error) {
    console.error(`Greška pri obradi API poziva: ${error.message}`);
    return { id: feed.id, category: 'Greška pri kategorizaciji' };
  }
}

module.exports = { categorize };
