const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { discoverExamsForProvider, crawlExam, DATA_DIR } = require('../lib/crawler');
const fs = require('fs');

// Concurrency limit: crawl 3 exam sets simultaneously
const CONCURRENCY = 3;

async function runMasterCrawl() {
    console.log('==================================================');
    console.log('    ⚡ MASTER FAST CRAWLER (Concurrency: ' + CONCURRENCY + ')  ');
    console.log('==================================================\n');

    const providers = ['microsoft', 'google', 'amazon'];
    const summary = [];

    for (const provider of providers) {
        console.log(`\n==============================================`);
        console.log(`  PROVIDER: ${provider.toUpperCase()}`);
        console.log(`==============================================\n`);

        const exams = await discoverExamsForProvider(provider);
        console.log(`[Master] Discovered ${exams.length} exams for ${provider}`);

        // Process in chunks of CONCURRENCY
        for (let i = 0; i < exams.length; i += CONCURRENCY) {
            const chunk = exams.slice(i, i + CONCURRENCY);
            console.log(`\n--- [${provider.toUpperCase()}] Processing batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(exams.length / CONCURRENCY)} (${chunk.map(e => e.slug).join(', ')}) ---`);

            await Promise.all(chunk.map(async (exam) => {
                try {
                    const result = await crawlExam(provider, exam.slug, exam.title);
                    summary.push({
                        provider,
                        slug: exam.slug,
                        fullSlug: exam.fullSlug,
                        title: result.title || exam.title,
                        totalQuestions: result.questions ? result.questions.length : 0,
                        totalPages: result.totalPages || 1,
                        isComplete: result.isComplete || false
                    });
                } catch (err) {
                    console.error(`[Master] ❌ Failed to crawl ${exam.fullSlug}: ${err.message}`);
                }
            }));
        }
    }

    // Write master index.json
    const indexPath = path.join(DATA_DIR, 'index.json');
    const indexData = {
        updatedAt: new Date().toISOString(),
        totalExams: summary.length,
        exams: summary
    };
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');

    console.log('\n==================================================');
    console.log(`🎉 Master crawl completed! Total exams in index: ${summary.length}`);
    console.log(`Saved master index to ${indexPath}`);
    console.log('==================================================');
}

runMasterCrawl().catch(err => {
    console.error('Fatal master crawler error:', err);
});
