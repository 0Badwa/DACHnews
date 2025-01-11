const fs = require('fs');
const RSSParser = require('rss-parser');
const express = require('express');
const path = require('path');

const parser = new RSSParser();
const app = express();
const PORT = process.env.PORT || 3000;

// Učitavanje RSS linkova
const rssLinks = JSON.parse(fs.readFileSync('rss_links.json', 'utf8'));

// Parsiranje RSS feedova
async function fetchFeeds() {
  const allFeeds = [];
  for (const url of rssLinks.feeds) {
    try {
      const feed = await parser.parseURL(url);
      console.log(`Feed Title: ${feed.title}`);
      allFeeds.push({
        title: feed.title,
        items: feed.items.map(item => ({ title: item.title, link: item.link }))
      });
    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error.message);
    }
  }
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

// Posluživanje `index.html` za `/`
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Posluživanje statičkih fajlova
app.use('/src', express.static(path.join(__dirname, 'src')));

// Pokretanje servera
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
