const express = require('express');
const router = express.Router();
const { askTutor } = require('../lib/gemini');
const { translateQuestionFast } = require('../lib/translator');

/**
 * POST /api/ai/translate
 * Fast translation via Google Translate (100ms) with Gemini fallback
 */
router.post('/translate', async (req, res) => {
  try {
    const { question, options, explanation } = req.body;
    if (!question || !options) {
      return res.status(400).json({ success: false, error: 'Missing question or options in request body' });
    }

    const translated = await translateQuestionFast({ question, options, explanation });
    res.json({ success: true, data: translated, engine: 'google_translate_fast' });
  } catch (err) {
    console.error('[Route /api/ai/translate]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ai/tutor
 * Returns markdown AI tutor response via Gemini
 */
router.post('/tutor', async (req, res) => {
  try {
    const { questionData, userQuery } = req.body;
    if (!questionData || !questionData.question) {
      return res.status(400).json({ success: false, error: 'Missing questionData in request body' });
    }

    const answer = await askTutor(questionData, userQuery);
    res.json({ success: true, data: { text: answer } });
  } catch (err) {
    console.error('[Route /api/ai/tutor]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
