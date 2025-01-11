const fs = require('fs');
const RSSParser = require('rss-parser');
const express = require('express');
const path = require('path');

const parser = new RSSParser();
const app = express();
const PORT = process.env.PORT || 3000;

// Učitavanje RSS linkova
const rssLinks = JSON.parse(fs.readFileSync('rss_links.json', 'utf8'));

// Keširanje podataka
let cachedFeeds = null;
let lastCacheTime = null;
const CACHE_DURATION = 60 * 60 * 1000; // Keš traje 1 sat

// Parsiranje RSS feedova sa keširanjem
async function fetchFeeds() {
  const now = Date.now();

  // Proveri da li je keš validan
  if (cachedFeeds && lastCacheTime && (now - lastCacheTime < CACHE_DURATION)) {
    console.log('Serving feeds from cache');
    return cachedFeeds;
  }

  console.log('Fetching new feeds...');
  const allFeeds = [];
  for (const url of rssLinks.feeds) {
    try {
      const feed = await parser.parseURL(url);
      allFeeds.push({
        title: feed.title,
        items: feed.items.map(item => ({ title: item.title, link: item.link }))
      });
    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error.message);
    }
  }

  // Ažuriraj keš
  cachedFeeds = allFeeds;
  lastCacheTime = now;

  return allFeeds;
}

// Posluživanje RSS podataka
app.get('/feeds', async (req, res) => {
  try {
    const feeds = await fetchFeeds();
    res.json(feeds);
  } catch (error) {
    res.status(500).send('Error fetching feeds.');
  }
});

// Posluživanje statičkih fajlova
app.use('/src', express.static(path.join(__dirname, 'src')));

// Posluživanje `index.html`
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Pokretanje servera
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
