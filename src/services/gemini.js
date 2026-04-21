import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL  = 'gemini-2.0-flash';
const TIMEOUT_MS    = 12000;
const getApiKey     = () => import.meta.env.VITE_GEMINI_API_KEY;

const withTimeout = (promise, ms) => {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error('Gemini follow-up timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
};

/**
 * Generate ONE concise follow-up interview question.
 *
 * Trigger conditions (either):
 *   • semanticRelevanceScore > 0.6  — candidate is on-topic, probe deeper
 *   • ace < 0.4                     — shallow / too brief answer
 *
 * @param {string} question   Original interview question text
 * @param {string} answer     Candidate's answer text
 * @returns {Promise<string>} Follow-up question string, or '' on failure
 */
export const generateFollowUp = async (question, answer) => {
  const apiKey = getApiKey();
  if (!apiKey) return '';

  const prompt = [
    'You are a senior technical interviewer conducting a live interview.',
    'The candidate just answered the following question:',
    '',
    `Original Question: ${question}`,
    `Candidate Answer: ${answer}`,
    '',
    'Generate exactly ONE concise follow-up interview question that:',
    '  1. Probes DEEPER into the candidate\'s understanding',
    '  2. Is directly relevant and technical',
    '  3. Is a single clear sentence',
    '  4. Does NOT repeat the original question',
    '',
    'Return ONLY the question text. No explanation, no numbering, no quotes.'
  ].join('\n');

  try {
    const genAI  = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 120 }
      }),
      TIMEOUT_MS
    );
    const text = result.response.text().trim();
    return text || '';
  } catch (err) {
    console.warn('[gemini.js] Follow-up generation failed:', err.message);
    return '';
  }
};
