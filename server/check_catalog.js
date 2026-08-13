const axios = require('axios');
const cheerio = require('cheerio');

async function checkCatalog() {
    const client = axios.create({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    console.log('Fetching main page https://examcademy.com/exams ...');
    try {
        const res = await client.get('https://examcademy.com/exams');
        const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        const $ = cheerio.load(html);
        
        const providerExams = {};

        $('a[href]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const m = href.match(/^\/exams\/([^\/]+)\/([^\/]+)$/);
            if (m) {
                const provider = m[1];
                const slug = m[2];
                if (!providerExams[provider]) providerExams[provider] = new Set();
                providerExams[provider].add(slug);
            }
        });

        const allMatches = html.match(/\/exams\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g) || [];
        allMatches.forEach(m => {
            const parts = m.split('/');
            if (parts.length >= 4) {
                const provider = parts[2];
                const slug = parts[3];
                if (!providerExams[provider]) providerExams[provider] = new Set();
                providerExams[provider].add(slug);
            }
        });

        console.log('\n=== SUMMARY ON https://examcademy.com/exams ===');
        for (const [provider, set] of Object.entries(providerExams)) {
            if (['microsoft', 'google', 'amazon'].includes(provider)) {
                console.log(`Provider: ${provider.toUpperCase()} -> Total exams listed: ${set.size}`);
            }
        }

        for (const provider of ['microsoft', 'google', 'amazon']) {
            const set = providerExams[provider] || new Set();
            console.log(`\n--- ${provider.toUpperCase()} (${set.size} exams) ---`);
            console.log(Array.from(set));
        }

    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

checkCatalog();
