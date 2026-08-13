const axios = require('axios');

const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'];

/**
 * Call Gemini API directly via REST with automatic model fallback & retry
 */
async function generateContent(prompt, systemInstruction = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'placeholder') {
    throw new Error('GEMINI_API_KEY is not configured in .env file.');
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const modelsToTry = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...FALLBACK_MODELS] : FALLBACK_MODELS;
  let lastError = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      console.warn(`[Gemini API] Model ${model} returned ${status || err.message}, trying fallback...`);
      if (status !== 503 && status !== 429 && status !== 404) {
        // If it's a non-retriable client error (like 400 bad request), break immediately
        if (status === 400) break;
      }
    }
  }

  throw lastError || new Error('No content returned from Gemini API after retries.');
}

/**
 * Translate question, choices, and explanation to Vietnamese
 */
async function translateQuestion(questionData) {
  const systemInstruction =
    'You are a professional IT & Cloud certification translator (English to Vietnamese). ' +
    'Translate the given exam question, options, and explanation accurately into natural, fluent Vietnamese. ' +
    'Keep technical terms (like AWS service names: Amazon S3, AWS DataSync, EC2, CloudWatch, etc.) in English. ' +
    'Return ONLY a valid JSON object matching the requested schema without markdown code blocks.';

  const prompt = JSON.stringify({
    question: questionData.question,
    options: questionData.options,
    explanation: questionData.explanation,
  });

  const rawText = await generateContent(
    `Translate the following JSON object into Vietnamese:\n\n${prompt}\n\nReturn JSON in format: {"question": "...", "options": [{"letter": "A", "text": "..."}], "explanation": "..."}`,
    systemInstruction
  );

  // Clean JSON response (strip ```json ... ``` if present)
  const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedJson);
}

/**
 * AI Tutor: Answer user query or explain a specific question in detail
 */
async function askTutor(questionData, userQuery) {
  const systemInstruction =
    'You are AstroTutor, an expert AI Cloud & IT Certification Instructor. ' +
    'You help students understand exam questions deeply, breaking down complex concepts, ' +
    'why the correct answer is right, why distractor choices are wrong, and providing practical real-world examples. ' +
    'Respond in Vietnamese (or English if the user asks in English) in clear, supportive markdown format.';

  const context = `
Context Question:
- Question: ${questionData.question}
- Options: ${JSON.stringify(questionData.options)}
- Correct Answer: ${questionData.answer}
- Official Explanation: ${questionData.explanation || 'N/A'}

Student Question/Doubt:
${userQuery || 'Hãy giải thích chi tiết tại sao đáp án đúng lại là đáp án này và phân tích các lựa chọn còn lại.'}
`;

  return await generateContent(context, systemInstruction);
}

module.exports = { translateQuestion, askTutor };
