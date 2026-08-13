require('dotenv').config();
const path = require('path');
const { crawlAllProviders } = require('../lib/crawler');

async function main() {
  const provider = process.argv[2] || 'microsoft';
  console.log('==================================================');
  console.log(`  ExamMaster AI - Single Provider Crawler [${provider.toUpperCase()}]`);
  console.log('==================================================');

  try {
    await crawlAllProviders([provider]);
    console.log(`\n✅ Provider ${provider} crawling completed successfully!`);
  } catch (err) {
    console.error(`Fatal Crawler Error for ${provider}:`, err);
  }
}

main();
