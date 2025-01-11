const fs = require('fs');
const RSSParser = require('rss-parser');
const express = require('express');

const parser = new RSSParser();
const app = express();
const PORT = process.env.PORT || 3000;

// Učitavanje RSS linkova iz JSON fajla
const rssLinks = JSON.parse(fs.readFileSync('rss_links.json', 'utf8'));

// Parsiranje svih feedova
async function fetchFeeds() {
  const allFeeds = [];
  for (const url of rssLinks.feeds) {
    try {
      const feed = await parser.parseURL(url);
      console.log(`Feed Title: ${feed.title}`);
      feed.items.forEach(item => {
        console.log(`Title: ${item.title}`);
        console.log(`Link: ${item.link}`);
      });
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

// API endpoint za dobijanje RSS feedova
app.get('/feeds', async (req, res) => {
  try {
    const feeds = await fetchFeeds();
    res.json(feeds);
  } catch (error) {
    res.status(500).send('Error fetching feeds.');
  }
});

// Pokretanje servera
app.listen(PORT, () => {
  console.log(`Server sluša na portu ${PORT}`);
});
