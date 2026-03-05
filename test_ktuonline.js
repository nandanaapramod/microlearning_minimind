const https = require('https');

const url = 'https://www.ktuonline.com/btech-cs-question-papers.html';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        // We need to find how subjects are listed. 
        // Usually lists of links. 
        const links = data.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/g);
        if (links) {
            console.log('Total links:', links.length);
            // Filter for CS related or just visually inspect a few
            console.log('Sample links:', links.slice(100, 120));

            // Check for specific subject codes if possible to see pattern
            const csLinks = links.filter(l => l.includes('CS202') || l.includes('Computer Org'));
            console.log('CS202 Links:', csLinks);
        }
    });
});
