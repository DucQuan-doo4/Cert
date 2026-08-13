const cheerio = require('cheerio');

// ── RSC Helpers ──────────────────────────────────────────────────────────────

function extractRSCFromHTML(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  let raw = '';
  $('script:not([src])').each((_, el) => {
    raw += $(el).html() || '';
  });
  return raw;
}

/**
 * Extract choices object from choices={{...}}
 */
function parseChoices(mcqBlock) {
  const m = mcqBlock.match(/choices=\{+([\s\S]*?)\}+/);
  if (!m) return [];

  let inner = m[1];
  // Unescape backslashes: \"A\" -> "A"
  inner = inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  const options = [];
  const re = /"([A-Z])"\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = re.exec(inner)) !== null) {
    options.push({ letter: match[1], text: match[2] });
  }
  return options;
}

/**
 * Extract explanation string from explanation={...}
 */
function extractExplanation(mcqBlock) {
  const m = mcqBlock.match(/explanation=\{+\\?"([\s\S]*?)\\?"\}+/);
  if (!m) return null;
  return m[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Extract question text from string preceding <MCQuestion
 */
function extractQuestionText(textBefore) {
  const marker = '"mdxContent":"';
  const lastMarker = textBefore.lastIndexOf(marker);

  let raw = '';
  if (lastMarker !== -1) {
    raw = textBefore.slice(lastMarker + marker.length);
  } else {
    const lastDoubleNL = textBefore.lastIndexOf('\n\n');
    raw = lastDoubleNL !== -1 ? textBefore.slice(lastDoubleNL + 2) : textBefore.slice(-600);
  }

  // Unescape JSON string escapes
  let cleaned = raw
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
    
  // Clean RSC junk
  cleaned = cleaned.replace(/\["\$","button"[\s\S]*?false\]\}\]\s*/g, '');
  cleaned = cleaned.replace(/[0-9a-f]+:T[0-9a-f]+,/gi, '');
  cleaned = cleaned.replace(/^[\]\}\s,"\$L0-9a-f]+/, '');

  // Remove any trailing <MCQuestion...
  const mcqStart = cleaned.indexOf('<MCQuestion');
  if (mcqStart !== -1) {
    cleaned = cleaned.slice(0, mcqStart).trim();
  }

  return cleaned;
}

function extractDomains($) {
  const domains = [];
  if ($) {
    $('.topic-badge, [class*="topic-badge"]').each((_, el) => {
      domains.push($(el).text().trim());
    });
  }
  return domains;
}

function extractPaginationInfo(fullText, $) {
  let totalQuestions = null;
  let totalPages = null;

  const tqMatch = fullText.match(/"totalQuestions"\s*:\s*(\d+)/);
  if (tqMatch) totalQuestions = parseInt(tqMatch[1]);

  const tpMatch = fullText.match(/"totalPages"\s*:\s*(\d+)/);
  if (tpMatch) totalPages = parseInt(tpMatch[1]);

  if (!totalPages && $) {
    let maxPage = 0;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/\/(\d+)$/);
      if (m) {
        const p = parseInt(m[1]);
        if (p > maxPage) maxPage = p;
      }
    });
    if (maxPage > 0) totalPages = maxPage;
  }

  if (!totalPages && totalQuestions) {
    totalPages = Math.ceil(totalQuestions / 25);
  }

  return { totalQuestions, totalPages };
}

// ── Main Page Parsing Logic ──────────────────────────────────────────────────

function parseExamPage(html, rscText = '', page = 1) {
  const $ = html ? cheerio.load(html) : null;
  const domains = extractDomains($);
  const combinedText = (rscText || '') + (html ? extractRSCFromHTML(html) : '');

  const { totalQuestions, totalPages } = extractPaginationInfo(combinedText, $);

  // Strategy 1: Direct RSC payload parsing
  if (combinedText.includes('<MCQuestion')) {
    const questions = parseMCQuestionsFromRSC(combinedText, domains, page);
    if (questions.length > 0) {
      console.log(`[Parser] Parsed ${questions.length} questions from RSC stream (page ${page})`);
      return { questions, totalPages, totalQuestions, source: 'rsc' };
    }
  }

  // Strategy 2: HTML DOM fallback
  if ($) {
    console.log(`[Parser] Falling back to HTML DOM parser for page ${page}`);
    const questions = parseQuestionsFromDom($, page);
    return { questions, totalPages, totalQuestions, source: 'html' };
  }

  return { questions: [], totalPages, totalQuestions, source: 'none' };
}

function parseMCQuestionsFromRSC(rscText, domains, page) {
  const questions = [];
  let searchFrom = 0;

  while (true) {
    const mcqIdx = rscText.indexOf('<MCQuestion', searchFrom);
    if (mcqIdx === -1) break;

    const closeIdx = rscText.indexOf('/>', mcqIdx);
    if (closeIdx === -1) break;

    const mcqBlock = rscText.slice(mcqIdx, closeIdx + 2);
    const textBefore = rscText.slice(0, mcqIdx);

    const questionText = extractQuestionText(textBefore);
    const options = parseChoices(mcqBlock);
    const correctAnswerMatch = mcqBlock.match(/correctAnswer=\{+\\"?([A-Z])\\"?\}+/);
    const correctAnswer = correctAnswerMatch ? correctAnswerMatch[1] : null;
    const explanation = extractExplanation(mcqBlock);
    const qNum = questions.length + 1 + (page - 1) * 25;

    questions.push({
      number: qNum,
      domain: domains[questions.length] || null,
      question: questionText,
      options,
      answer: correctAnswer,
      explanation,
    });

    searchFrom = closeIdx + 2;
  }

  return questions;
}

function parseQuestionsFromDom($, page) {
  const questions = [];

  $('.exam-top').each((i, block) => {
    const $block = $(block);
    const h2Text = $block.find('h2').text().trim();
    const numMatch = h2Text.match(/Q(\d+)$/);
    const qNum = numMatch ? parseInt(numMatch[1]) : i + 1 + (page - 1) * 25;
    const domain = $block.find('.topic-badge, [class*="topic-badge"]').first().text().trim();

    const $container = $block.parent();

    const questionText = $container.find('p').first().text().trim()
      || $container.text().replace(h2Text, '').replace(domain, '').trim().split('\n')[0];

    const options = [];
    $container.find('ul li').each((j, li) => {
      const text = $(li).text().trim();
      const m = text.match(/^([A-Z])\s+(.+)/);
      if (m) options.push({ letter: m[1], text: m[2].trim() });
    });

    if (options.length > 0) {
      questions.push({ number: qNum, domain, question: questionText, options, answer: null, explanation: null });
    }
  });

  return questions;
}

// ── Catalog Parsing ──────────────────────────────────────────────────────────

function parseExamCatalog(html) {
  const $ = cheerio.load(html);
  const rscText = extractRSCFromHTML(html);
  const exams = [];
  const seen = new Set();

  const jsonMatch = rscText.match(/"exams"\s*:\s*(\[[\s\S]*?\])/);
  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[1]);
      return raw.map((e) => ({
        id: e.slug || e.id,
        slug: e.slug,
        title: e.title || e.name,
        provider: e.provider || e.providerSlug,
        totalQuestions: e.totalQuestions || e.questionCount || null,
        description: e.description || null,
      }));
    } catch { /* fall through */ }
  }

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/^\/exams\/([^/]+)\/([^/]+)\/?$/);
    if (m && !seen.has(m[2])) {
      seen.add(m[2]);
      exams.push({
        id: m[2],
        slug: m[2],
        title: $(el).text().trim() || m[2],
        provider: m[1],
        totalQuestions: null,
        description: null,
      });
    }
  });

  return exams;
}

// ── Exam Metadata Parsing ────────────────────────────────────────────────────

function parseExamMeta(html, rscText = '') {
  const $ = html ? cheerio.load(html) : null;
  const combinedText = (rscText || '') + (html ? extractRSCFromHTML(html) : '');

  const tqMatch = combinedText.match(/"totalQuestions"\s*:\s*(\d+)/);
  const totalQuestions = tqMatch ? parseInt(tqMatch[1]) : null;
  const totalPages = totalQuestions ? Math.ceil(totalQuestions / 25) : null;

  const titleMatch = combinedText.match(/"title"\s*:\s*"([^"]+)"/);
  const title = titleMatch?.[1] || ($ ? $('h1').first().text().trim() : '') || 'Exam';

  const descMatch = combinedText.match(/"description"\s*:\s*"([^"]+)"/);
  const description = descMatch?.[1] || null;

  return { title, description, totalQuestions, totalPages };
}

module.exports = { parseExamPage, parseExamCatalog, parseExamMeta };
