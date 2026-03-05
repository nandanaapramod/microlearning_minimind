const axios = require('axios');
const cheerio = require('cheerio');

const KTU_ONLINE_URL = 'https://www.ktuonline.com/btech-cs-question-papers.html';

async function getKTUOnlinePYQs(query) {
    try {
        console.log(`Fetching PYQs for query: ${query}`);
        const { data } = await axios.get(KTU_ONLINE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const results = [];
        const uniqueLinks = new Set();

        // Normalize query for better matching (e.g., "CS202" or "Computer Organization")
        const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const tokens = query.toLowerCase().split(' ').filter(t => t.length > 2);

        $('a').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');

            if (!href || !text) return;

            const normalizedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
            let match = false;

            // 1. Direct code match (e.g. CS202)
            if (normalizedText.includes(normalizedQuery)) {
                match = true;
            }
            // 2. Token match (e.g. "Computer" AND "Organization")
            else if (tokens.length > 0) {
                const allTokensMatch = tokens.every(token => normalizedText.includes(token));
                if (allTokensMatch) match = true;
            }

            if (match && !uniqueLinks.has(href)) {
                uniqueLinks.add(href);
                results.push({
                    text: text,
                    link: href
                });
            }
        });

        return results.slice(0, 10); // Return top 10

    } catch (error) {
        console.error('KTUOnline Scraper Error:', error.message);
        return [];
    }
}

module.exports = { getKTUOnlinePYQs };
