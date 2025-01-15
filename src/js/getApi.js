// gptApi.js
const fetch = require('node-fetch');
require('dotenv').config();

const CHATGPT_API_URL = 'https://api.openai.com/v1/completions';
const CHATGPT_API_KEY = process.env.OPENAI_API_KEY;

async function categorize(feed) {
  const response = await fetch(CHATGPT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CHATGPT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',  // Koristite validan model po potrebi
      prompt: `Odredi kategoriju za sledeću vest: ${feed.content}`,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API greška: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return { id: feed.id, category: data.choices[0].text.trim() };
}

module.exports = { categorize };
