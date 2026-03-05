const https = require('https');

const url = 'https://www.ktunotes.in/ktu-cs202-computer-organisation-and-architecture-full-notes/';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        // Dump all links
        const links = data.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/g);
        if (links) {
            console.log('Found links:', links.length);
            const pyqLinks = links.filter(l => l.toLowerCase().includes('question') || l.toLowerCase().includes('qp'));
            console.log('Potential PYQ Links:', pyqLinks.slice(0, 10));
        }
    });
});
