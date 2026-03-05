const https = require('https');

const url = 'https://ktunotes.in/?s=CS202'; // Trying a search query

https.get(url, (res) => {
    console.log('StatusCode:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body Preview:', data.substring(0, 500));
        // Check if it looks like a search results page
        if (data.includes('Search Results') || data.includes('Nothing Found')) {
            console.log('Search pattern seems valid.');
        }
    });

}).on('error', (err) => {
    console.error('Error:', err.message);
});
