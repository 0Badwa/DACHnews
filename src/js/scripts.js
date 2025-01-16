// URL feed-a
const feedUrl = "https://rss.app/feeds/v1.1/_sf1gbLo1ZadJmc5e.json";

// Preuzimanje feedova
async function fetchFeeds() {
    try {
        const response = await fetch(feedUrl);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Greška prilikom preuzimanja feedova:", error);
        return [];
    }
}

// Keširanje feedova (Local Storage)
function cacheFeedsLocally(items) {
    const cachedFeeds = JSON.parse(localStorage.getItem('feeds') || '[]');
    const newFeeds = items.filter(item => !cachedFeeds.some(cached => cached.id === item.id));
    localStorage.setItem('feeds', JSON.stringify([...cachedFeeds, ...newFeeds]));
    return newFeeds;
}

// Prikaz feedova
function displayNewsCards(feeds) {
    const container = document.getElementById('news-container');
    if (!container) {
        console.error('Element "news-container" nije pronađen u DOM-u.');
        return;
    }

    // Očisti prethodni sadržaj
    container.innerHTML = '';

    feeds.forEach(feed => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        newsCard.innerHTML = `
            <h3 class="news-title">${feed.title}</h3>
            <p class="news-category">${feed.category}</p>
            <p class="news-date">${new Date(feed.date_published).toLocaleDateString()}</p>
            <img class="news-image" src="${feed.image || 'placeholder.jpg'}" alt="${feed.title}">
            <p class="news-content">${feed.content_text}</p>
            <a class="news-link" href="${feed.url}" target="_blank">Pročitaj više</a>
        `;
        container.appendChild(newsCard);
    });
}

// Glavna funkcija
async function main() {
    const feeds = await fetchFeeds();
    const newFeeds = cacheFeedsLocally(feeds);

    if (newFeeds.length > 0) {
        console.log(`Pronađeno ${newFeeds.length} novih feedova.`);

        try {
            const response = await fetch("/api/categorize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feeds: newFeeds })
            });

            if (!response.ok) {
                throw new Error(`API greška: ${response.status} ${response.statusText}`);
            }

            const categorizedFeeds = await response.json();
            displayNewsCards(categorizedFeeds);
        } catch (error) {
            console.error("Greška prilikom slanja feedova na OpenAI API:", error);
        }
    } else {
        console.log("Nema novih feedova za kategorizaciju.");
    }
}

// Pokretanje aplikacije
main();
