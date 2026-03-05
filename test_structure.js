const https = require('https');

const url = 'https://ktunotes.in/?s=CS202';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        // Basic "grep" for class names around links
        const matches = data.match(/<article[^>]*>[\s\S]*?<\/article>/g);
        if (matches) {
            console.log('Found articles:', matches.length);
            console.log('First article:', matches[0].substring(0, 500));
        } else {
            console.log('No <article> tags found. Dumping h2s:');
            const h2s = data.match(/<h2[^>]*>[\s\S]*?<\/h2>/g);
            console.log(h2s ? h2s.slice(0, 3) : 'No h2s found');
        }
    });
});
