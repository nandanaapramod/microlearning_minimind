const { getKTUOnlinePYQs } = require('./src/utils/scraper');

async function test() {
    console.log('Testing KTUOnline Scraper directly...');
    const results = await getKTUOnlinePYQs('CS202');
    console.log('Results:', results);
}

test();
