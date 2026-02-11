import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-2.0-flash';
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

const buildPrompt = (resumeText) => [
  'Return ONLY valid JSON (no markdown, no code fences).',
  'Output must be a JSON object with keys: skills, projects, experienceLevel.',
  'skills: array of strings',
  'projects: array of concise project descriptions',
  'experienceLevel: "fresher" or "experienced"',
  'Do NOT include extra keys.',
  `Resume text: ${resumeText}`
].join('\n');

const safeParseJsonObject = (text) => {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
};

const normalizeExtracted = (data) => ({
  skills: Array.isArray(data?.skills) ? data.skills.map((item) => String(item).toLowerCase()) : [],
  projects: Array.isArray(data?.projects) ? data.projects.map((item) => String(item)) : [],
  experienceLevel: data?.experienceLevel === 'experienced' ? 'experienced' : 'fresher'
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const extractResumeInsights = async (resumeText) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const prompt = buildPrompt(resumeText);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  let text = '';
  
  let attempt = 0;
  const maxRetries = 5;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      });
      text = result.response.text();
      break; // Success, exit retry loop
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';
      
      const isRetryable = errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('Resource exhausted');
      
      if (attempt < maxRetries && isRetryable) {
        attempt++;
        const waitTime = Math.min(Math.pow(2, attempt) * 2000 + Math.random() * 2000, 60000);
        console.warn(`Resume extraction rate limited. Retry ${attempt}/${maxRetries} in ${Math.round(waitTime / 1000)}s...`);
        await delay(waitTime);
        continue;
      }
      
      break; // Not retryable or max retries reached
    }
  }
  
  if (!text) {
    const errorMessage = lastError?.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('Resource exhausted')) {
      throw new Error(
        `Gemini API rate limit exhausted. Your API quota may be exceeded. ` +
        `Please check https://console.cloud.google.com/apis/dashboard or wait a few minutes.`
      );
    }
    throw new Error(`Gemini resume extraction failed. ${lastError?.message || ''}`.trim());
  }
  
  const parsed = safeParseJsonObject(text);

  if (!parsed) {
    throw new Error('Gemini returned invalid JSON for resume extraction.');
  }

  return normalizeExtracted(parsed);
};
