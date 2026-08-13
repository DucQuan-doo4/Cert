const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { fetchExamPage, fetchExamMeta } = require('../lib/scraper');

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUESTIONS_PER_PAGE = 25;

/**
 * Helper to read local exam file if exists
 */
function getLocalExamData(provider, slug) {
  const filePath = path.join(DATA_DIR, provider, `${slug}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (_) {}
  }
  return null;
}

/**
 * GET /api/questions/search?q=keyword&provider=microsoft
 * Search questions by keyword across local dataset
 */
router.get('/search', async (req, res) => {
  const { q, provider } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Query string `q` must be at least 2 characters' });
  }

  const queryLower = q.toLowerCase();
  const providersToSearch = provider ? [provider] : ['microsoft', 'google', 'amazon'];
  const matches = [];

  for (const prov of providersToSearch) {
    const pDir = path.join(DATA_DIR, prov);
    if (fs.existsSync(pDir)) {
      const files = fs.readdirSync(pDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const slug = file.replace('.json', '');
        const data = getLocalExamData(prov, slug);
        if (data && data.questions) {
          data.questions.forEach((question) => {
            const matchInQuestion = question.question && question.question.toLowerCase().includes(queryLower);
            const matchInOptions = question.options && question.options.some(o => o.text && o.text.toLowerCase().includes(queryLower));
            const matchInExplanation = question.explanation && question.explanation.toLowerCase().includes(queryLower);

            if (matchInQuestion || matchInOptions || matchInExplanation) {
              matches.push({
                provider: prov,
                slug,
                examTitle: data.title || slug,
                questionNumber: question.number,
                question: question.question,
                options: question.options,
                answer: question.answer,
                explanation: question.explanation
              });
            }
          });
        }
      }
    }
  }

  res.json({
    success: true,
    query: q,
    count: matches.length,
    results: matches.slice(0, 50) // Limit to top 50 matches
  });
});

/**
 * GET /api/questions/meta/:provider/:slug
 */
router.get('/meta/:provider/:slug', async (req, res) => {
  const { provider, slug } = req.params;
  const localData = getLocalExamData(provider, slug);

  if (localData) {
    const qCount = localData.questions ? localData.questions.length : 0;
    const totalPages = Math.ceil(qCount / QUESTIONS_PER_PAGE) || 1;
    return res.json({
      success: true,
      source: 'local_github_dataset',
      examSlug: `${provider}/${slug}`,
      data: {
        title: localData.title || slug,
        totalQuestions: qCount,
        totalPages,
        isComplete: localData.isComplete ?? true
      }
    });
  }

  // Fallback to live fetch
  const examSlug = `${provider}/${slug}`;
  try {
    const meta = await fetchExamMeta(examSlug);
    res.json({ success: true, source: 'live_scraper', examSlug, data: meta });
  } catch (err) {
    console.error(`[Route /api/questions/meta/${examSlug}]`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/questions/:provider/:slug/:page
 */
router.get('/:provider/:slug/:page', async (req, res) => {
  const { provider, slug, page } = req.params;
  const pageNum = parseInt(page);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ success: false, error: 'Invalid page number' });
  }

  const localData = getLocalExamData(provider, slug);

  if (localData && localData.questions && localData.questions.length > 0) {
    const totalQuestions = localData.questions.length;
    const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE) || 1;
    const startIndex = (pageNum - 1) * QUESTIONS_PER_PAGE;
    const pageQuestions = localData.questions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);

    return res.json({
      success: true,
      source: 'local_github_dataset',
      examSlug: `${provider}/${slug}`,
      title: localData.title || slug,
      page: pageNum,
      totalPages,
      totalQuestions,
      count: pageQuestions.length,
      data: pageQuestions
    });
  }

  // Fallback to live fetch
  const examSlug = `${provider}/${slug}`;
  try {
    const result = await fetchExamPage(examSlug, pageNum);

    if (!result.questions || result.questions.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No questions found for "${examSlug}" page ${pageNum}`
      });
    }

    res.json({
      success: true,
      source: result.source || 'live_scraper',
      examSlug,
      page: pageNum,
      totalPages: result.totalPages,
      totalQuestions: result.totalQuestions,
      count: result.questions.length,
      data: result.questions,
    });
  } catch (err) {
    console.error(`[Route /api/questions/${examSlug}/${pageNum}]`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
