require('dotenv').config();
const { getClient } = require('../lib/auth');
const cheerio = require('cheerio');

async function testProvider(provider) {
  console.log(`\n=== Fetching provider: ${provider} ===`);
  const client = await getClient();
  const url = `https://examcademy.com/exams/${provider}`;
  try {
    const res = await client.get(url);
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const $ = cheerio.load(html);
    const exams = [];
    const seen = new Set();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(new RegExp(`^/exams/${provider}/([^/]+)(?:/\\d+)?$`));
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        const title = $(el).text().trim() || m[1];
        exams.push({ slug: `${provider}/${m[1]}`, title });
      }
    });

    // Also search in RSC payload JSON
    const rscMatch = html.match(/"exams"\s*:\s*(\[[\s\S]*?\])/);
    if (rscMatch) {
      try {
        const raw = JSON.parse(rscMatch[1]);
        raw.forEach(e => {
          if (e.slug && !seen.has(e.slug)) {
            seen.add(e.slug);
            exams.push({ slug: `${provider}/${e.slug}`, title: e.title || e.name || e.slug });
          }
        });
      } catch (_) {}
    }

    console.log(`Found ${exams.length} exams for ${provider}:`);
    exams.forEach(e => console.log(` - [${e.slug}] ${e.title}`));
    return exams;
  } catch (err) {
    console.error(`Error fetching ${provider}:`, err.message);
    return [];
  }
}

async function main() {
  for (const provider of ['amazon', 'microsoft', 'google']) {
    await testProvider(provider);
  }
}

main();
