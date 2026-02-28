import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-2.5-flash';
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

const buildPrompt = () => [
  'Return ONLY valid JSON (no markdown, no code fences).',
  'Output must be a JSON object with the following keys:',
  '- name: string (candidate name)',
  '- role: string (current or target job title)',
  '- summary: string (brief professional summary)',
  '- experience: array of objects { role: string, company: string, duration: string }',
  '- highlights: array of strings (key achievements or projects)',
  '- skills: array of strings',
  '- education: array of objects { degree: string, institution: string, duration: string }',
  'Do NOT include extra keys.',
  'The resume file is attached as binary data.'
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
  name: data?.name || 'Unknown Candidate',
  role: data?.role || 'Professional',
  summary: data?.summary || '',
  experience: Array.isArray(data?.experience) ? data.experience : [],
  highlights: Array.isArray(data?.highlights) ? data.highlights : [],
  skills: Array.isArray(data?.skills) ? data.skills : [],
  education: Array.isArray(data?.education) ? data.education : []
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toBase64 = async (file) => {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const extractResumeInsights = async (resumeFile) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  if (!resumeFile) {
    throw new Error('No resume file provided.');
  }

  if (resumeFile.size > 4 * 1024 * 1024) {
    throw new Error('Resume file is too large for Gemini inline upload. Please use a smaller file.');
  }

  const prompt = buildPrompt();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  let text = '';

  let attempt = 0;
  const maxRetries = 5;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      const data = await toBase64(resumeFile);
      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: resumeFile.type || 'application/octet-stream',
            data
          }
        }
      ];

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
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
