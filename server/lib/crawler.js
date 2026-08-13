const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getClient } = require('./auth');
const { fetchExamPage, fetchExamMeta } = require('./scraper');

const BASE_URL = 'https://examcademy.com';
const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scan provider page & main catalog to discover all exam slugs for a given provider
 */
async function discoverExamsForProvider(provider) {
  console.log(`[Crawler] Discovering exams for provider: ${provider}...`);
  const client = await getClient();
  const exams = [];
  const seen = new Set();

  const urlsToScan = [
    `${BASE_URL}/exams`,
    `${BASE_URL}/exams/${provider}`
  ];

  for (const url of urlsToScan) {
    try {
      const res = await client.get(url);
      const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const $ = cheerio.load(html);

      // Strategy 1: HTML anchor tags
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const m = href.match(new RegExp(`^/exams/${provider}/([^/]+)(?:/\\d+)?$`));
        if (m && !seen.has(m[1])) {
          seen.add(m[1]);
          const title = $(el).text().trim() || m[1];
          exams.push({ provider, slug: m[1], fullSlug: `${provider}/${m[1]}`, title });
        }
      });

      // Strategy 2: Regex matching /exams/<provider>/<slug>
      const reg = new RegExp(`/exams/${provider}/([a-zA-Z0-9_-]+)`, 'g');
      let match;
      while ((match = reg.exec(html)) !== null) {
        const slug = match[1];
        if (!seen.has(slug)) {
          seen.add(slug);
          exams.push({ provider, slug, fullSlug: `${provider}/${slug}`, title: slug });
        }
      }
    } catch (err) {
      console.warn(`[Crawler] Warning scanning ${url}: ${err.message}`);
    }
  }

  console.log(`[Crawler] Found ${exams.length} exams for ${provider}`);
  return exams;
}

/**
 * Crawl a single exam with progress saving & resume capability
 */
async function crawlExam(provider, slug, title) {
  const providerDir = path.join(DATA_DIR, provider);
  ensureDir(providerDir);

  const filePath = path.join(providerDir, `${slug}.json`);
  let existingData = {
    provider,
    slug,
    fullSlug: `${provider}/${slug}`,
    title: title || slug,
    totalQuestions: 0,
    totalPages: 0,
    crawledPages: 0,
    isComplete: false,
    questions: [],
  };

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      existingData = JSON.parse(raw);
    } catch (_) {}
  }

  if (existingData.isComplete && existingData.questions.length > 0) {
    console.log(`[Crawler] ⏩ Skipping ${provider}/${slug} (already complete - ${existingData.questions.length} questions)`);
    return existingData;
  }

  console.log(`[Crawler] 🚀 Starting crawl for ${provider}/${slug}...`);

  // Fetch metadata first
  const fullSlug = `${provider}/${slug}`;
  let meta = { totalPages: 1, totalQuestions: 0, title };
  try {
    meta = await fetchExamMeta(fullSlug);
  } catch (err) {
    console.warn(`[Crawler] Warning: Could not fetch meta for ${fullSlug}: ${err.message}`);
  }

  existingData.title = meta.title || existingData.title;
  existingData.totalQuestions = meta.totalQuestions || existingData.totalQuestions;
  existingData.totalPages = meta.totalPages || existingData.totalPages || 1;

  const startPage = (existingData.crawledPages || 0) + 1;
  const totalPages = existingData.totalPages;

  for (let page = startPage; page <= totalPages; page++) {
    console.log(`[Crawler] [${provider}/${slug}] Crawling page ${page}/${totalPages}...`);

    try {
      const result = await fetchExamPage(fullSlug, page);
      if (result.questions && result.questions.length > 0) {
        // Append new questions avoid duplicates by question number
        const existingNums = new Set(existingData.questions.map((q) => q.number));
        result.questions.forEach((q) => {
          if (!existingNums.has(q.number)) {
            existingData.questions.push(q);
          }
        });
      }

      existingData.crawledPages = page;
      if (result.totalPages) existingData.totalPages = result.totalPages;
      if (result.totalQuestions) existingData.totalQuestions = result.totalQuestions;

      if (page >= existingData.totalPages) {
        existingData.isComplete = true;
      }

      // Save progress to JSON after each page
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');

      // Politeness delay (optimized to 300ms for fast crawling)
      await sleep(300 + Math.random() * 200);
    } catch (err) {
      console.error(`[Crawler] ❌ Error on ${fullSlug} page ${page}: ${err.message}`);
      // Save current progress before error
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
      // Wait a bit longer on error before continuing or retrying
      await sleep(5000);
    }
  }

  existingData.isComplete = true;
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
  console.log(`[Crawler] ✅ Finished ${fullSlug}: ${existingData.questions.length} questions collected.`);
  return existingData;
}

/**
 * Master crawl routine for targeted providers
 */
async function crawlAllProviders(providers = ['amazon', 'microsoft', 'google']) {
  ensureDir(DATA_DIR);

  const allExamsSummary = [];

  for (const provider of providers) {
    console.log(`\n==============================================`);
    console.log(`  PROCESSING PROVIDER: ${provider.toUpperCase()}`);
    console.log(`==============================================\n`);

    const exams = await discoverExamsForProvider(provider);

    for (let i = 0; i < exams.length; i++) {
      const exam = exams[i];
      console.log(`\n--- Exam ${i + 1}/${exams.length}: ${exam.fullSlug} ---`);
      const data = await crawlExam(exam.provider, exam.slug, exam.title);

      allExamsSummary.push({
        provider: data.provider,
        slug: data.slug,
        fullSlug: data.fullSlug,
        title: data.title,
        totalQuestions: data.questions.length,
        totalPages: data.totalPages,
        filePath: `data/${data.provider}/${data.slug}.json`,
      });
    }
  }

  // Save index.json
  const indexPath = path.join(DATA_DIR, 'index.json');
  const indexData = {
    updatedAt: new Date().toISOString(),
    totalExams: allExamsSummary.length,
    providers,
    exams: allExamsSummary,
  };
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log(`\n🎉 All done! Saved master index to ${indexPath}`);

  return indexData;
}

module.exports = { discoverExamsForProvider, crawlExam, crawlAllProviders, DATA_DIR };
