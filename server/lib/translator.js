const axios = require('axios');
const { translateQuestion: translateWithGemini } = require('./gemini');

/**
 * Fast Google Translate API (GTX gratis endpoint)
 */
async function fastTranslateText(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await axios.get(url, { timeout: 6000 });
    if (res.data && Array.isArray(res.data[0])) {
      return res.data[0].map(item => item[0]).join('');
    }
  } catch (err) {
    console.warn('[FastTranslate] Fallback error:', err.message);
  }
  return text;
}

/**
 * Fast Translate Question Package (Question, Options, Explanation)
 */
async function translateQuestionFast(questionData) {
  try {
    const questionPromise = fastTranslateText(questionData.question);
    const explanationPromise = questionData.explanation ? fastTranslateText(questionData.explanation) : Promise.resolve('');

    const optionsPromises = (questionData.options || []).map(async (opt) => {
      const translatedText = await fastTranslateText(opt.text);
      return {
        letter: opt.letter,
        text: translatedText
      };
    });

    const [translatedQuestion, translatedExplanation, translatedOptions] = await Promise.all([
      questionPromise,
      explanationPromise,
      Promise.all(optionsPromises)
    ]);

    return {
      question: translatedQuestion,
      options: translatedOptions,
      explanation: translatedExplanation
    };
  } catch (err) {
    console.warn('[FastTranslate] Switching to Gemini fallback:', err.message);
    return await translateWithGemini(questionData);
  }
}

module.exports = { fastTranslateText, translateQuestionFast };
