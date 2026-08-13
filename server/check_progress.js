const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_DIR = path.join(__dirname, 'data');

async function checkStatus() {
    const client = axios.create({
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    console.log('Fetching catalog from https://examcademy.com/exams...');
    const res = await client.get('https://examcademy.com/exams');
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    const catalog = { microsoft: new Set(), google: new Set(), amazon: new Set() };
    const allMatches = html.match(/\/exams\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g) || [];
    allMatches.forEach(m => {
        const parts = m.split('/');
        if (parts.length >= 4 && catalog[parts[2]]) {
            catalog[parts[2]].add(parts[3]);
        }
    });

    console.log('\n==================================================');
    console.log('            STATUS OVERVIEW                       ');
    console.log('==================================================');

    for (const [provider, set] of Object.entries(catalog)) {
        const dir = path.join(BASE_DIR, provider);
        let completed = 0;
        let partial = 0;
        let missing = 0;
        const missingList = [];
        const partialList = [];
        const completedList = [];

        set.forEach(slug => {
            const file = path.join(dir, `${slug}.json`);
            if (fs.existsSync(file)) {
                try {
                    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    if (data.isComplete && data.questions && data.questions.length > 0) {
                        completed++;
                        completedList.push({ slug, qCount: data.questions.length });
                    } else {
                        partial++;
                        partialList.push({ slug, qCount: data.questions ? data.questions.length : 0, page: data.crawledPages, totalPages: data.totalPages });
                    }
                } catch(e) {
                    missing++;
                    missingList.push(slug);
                }
            } else {
                missing++;
                missingList.push(slug);
            }
        });

        console.log(`\n--- ${provider.toUpperCase()} (Catalog Total: ${set.size}) ---`);
        console.log(`  ✅ Complete (${completed}/${set.size})`);
        console.log(`  ⏳ Incomplete / In-progress (${partial}):`, partialList);
        console.log(`  ❌ Not started (${missing}):`, missingList);
    }
}

checkStatus();
