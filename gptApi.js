// gptApi.js

const fetch = require('node-fetch');  // ako si na Node 18+, možeš i bez ovoga
require('dotenv').config();

const CHATGPT_API_URL = 'https://api.openai.com/v1/completions';
const CHATGPT_API_KEY = process.env.OPENAI_API_KEY;

async function categorize(feed) {
  // Primer: koristimo text-davinci-003
  // Napomena: Ako hoćeš chat model (gpt-3.5-turbo), moraš da koristiš /v1/chat/completions 
  // i drugačiji payload.
  const response = await fetch(CHATGPT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CHATGPT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      prompt: `Odredi kategoriju za sledeću vest: ${feed.content}`,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API greška: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // U data.choices[0].text se nalazi odgovor
  return { id: feed.id, category: data.choices[0].text.trim() };
}

module.exports = { categorize };
