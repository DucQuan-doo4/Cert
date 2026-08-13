const { getClient, reLogin } = require('./auth');
const { parseExamPage, parseExamCatalog, parseExamMeta } = require('./parser');
const { questionCache, examCache } = require('./cache');

const BASE_URL = 'https://examcademy.com';

/**
 * Fetch a URL with the authenticated client; auto-retry once on auth failure.
 */
async function fetchPage(url, headers = {}) {
  let client = await getClient();
  const reqHeaders = {
    Accept: 'text/html,application/xhtml+xml,*/*',
    ...headers,
  };
  try {
    const res = await client.get(url, { headers: reqHeaders });
    return res.data;
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.log('[Scraper] Auth error, re-logging in...');
      client = await reLogin();
      const res = await client.get(url, { headers: reqHeaders });
      return res.data;
    }
    throw err;
  }
}

/**
 * Fetch exam page content via two requests:
 *  1. HTML → for domains + pagination
 *  2. RSC payload (Accept: text/x-component) → for clean question data (no escaping)
 */
async function fetchExamPage(examSlug, page = 1) {
  const cacheKey = `questions:${examSlug}:${page}`;
  const cached = questionCache.get(cacheKey);
  if (cached) {
    console.log(`[Scraper] Page ${page} of ${examSlug} from cache`);
    return cached;
  }

  const urlPath = examSlug.includes('/')
    ? `/exams/${examSlug}/${page}`
    : `/exams/${examSlug}/${page}`;
  const fullUrl = `${BASE_URL}${urlPath}`;

  console.log(`[Scraper] Fetching ${urlPath} (HTML + RSC)...`);

  // Parallel fetch: HTML for domains, RSC for question data
  const [html, rscText] = await Promise.all([
    fetchPage(fullUrl),
    fetchPage(fullUrl, {
      Accept: 'text/x-component',
      RSC: '1',
      'Next-Router-State-Tree': '%5B%22%22%2C%7B%7D%5D',
    }).then((d) => (typeof d === 'string' ? d : JSON.stringify(d))),
  ]);

  const result = parseExamPage(html, rscText, page);

  if (result.questions.length > 0) {
    questionCache.set(cacheKey, result, 10 * 60 * 1000);
  }
  return result;
}

/**
 * Fetch exam catalog (list of all exams).
 */
async function fetchExamCatalog() {
  const cacheKey = 'exam_catalog';
  const cached = examCache.get(cacheKey);
  if (cached) {
    console.log('[Scraper] Exam catalog from cache');
    return cached;
  }
  console.log('[Scraper] Fetching exam catalog...');
  const html = await fetchPage(`${BASE_URL}/exams`);
  const exams = parseExamCatalog(html);
  examCache.set(cacheKey, exams, 60 * 60 * 1000);
  return exams;
}

/**
 * Fetch exam metadata (title, totalQuestions, totalPages).
 */
async function fetchExamMeta(examSlug) {
  const cacheKey = `meta:${examSlug}`;
  const cached = examCache.get(cacheKey);
  if (cached) return cached;

  const urlPath = examSlug.includes('/')
    ? `/exams/${examSlug}/1`
    : `/exams/${examSlug}/1`;

  console.log(`[Scraper] Fetching exam meta for ${examSlug}...`);
  const [html, rscText] = await Promise.all([
    fetchPage(`${BASE_URL}${urlPath}`),
    fetchPage(`${BASE_URL}${urlPath}`, {
      Accept: 'text/x-component',
      RSC: '1',
    }).then((d) => (typeof d === 'string' ? d : JSON.stringify(d))),
  ]);

  const meta = parseExamMeta(html, rscText);
  examCache.set(cacheKey, meta, 60 * 60 * 1000);
  return meta;
}

module.exports = { fetchExamCatalog, fetchExamPage, fetchExamMeta };
