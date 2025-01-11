const fs = require('fs');
const RSSParser = require('rss-parser');
const parser = new RSSParser();

// Učitavanje RSS linkova iz JSON fajla
const rssLinks = JSON.parse(fs.readFileSync('rss_links.json', 'utf8'));

// Parsiranje svih feedova
async function fetchFeeds() {
  for (const url of rssLinks.feeds) {
    try {
      const feed = await parser.parseURL(url);
      console.log(`Feed Title: ${feed.title}`);
      feed.items.forEach(item => {
        console.log(`Title: ${item.title}`);
        console.log(`Link: ${item.link}`);
      });
    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error.message);
    }
  }
}

fetchFeeds();
