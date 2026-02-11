import { GoogleGenerativeAI } from '@google/generative-ai';
import { addGeneratedQuestions } from './storage';

const GEMINI_MODEL = 'gemini-2.0-flash';
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

const buildPrompt = ({
  jobRole,
  difficulty,
  count,
  mode,
  previousQuestions,
  previousAnswers
}) => {
  const baseRules = [
    'Return ONLY valid JSON (no markdown, no code fences).',
    'The output must be a JSON array of question objects.',
    'Each question object must include: questionId, text, skillTags, role, difficulty, expectedConcepts, conceptDescriptions, category.',
    'Do NOT include answers or hints.',
    'Ensure questions are concise, specific, and relevant to the resume and role.',
    'role must be one of: frontend, backend, fullstack, hr, devops, data, any.',
    'category must be one of: skill, project, hr.',
    'expectedConcepts must be an array of objects: { concept, importance, synonyms }.',
    'importance must be one of: core, supporting, optional.',
    'synonyms is an optional array of short alternative phrases (empty array is fine).',
    'conceptDescriptions should be an object mapping each concept to a short explanation.',
    'The resume file is attached as binary data.'
  ];

  const contextLines = [
    `Job role: ${jobRole}`,
    `Difficulty: ${difficulty || 'mixed'}`
  ];

  if (mode === 'followup') {
    contextLines.push(`Previous questions: ${JSON.stringify(previousQuestions || [])}`);
    contextLines.push(`User answers (summary): ${JSON.stringify(previousAnswers || [])}`);
    return [
      ...baseRules,
      `Generate ${count || 2} follow-up interview questions that build on the previous question(s) or answer(s).`,
      ...contextLines
    ].join('\n');
  }

  return [
    ...baseRules,
    `Generate ${count || 6} interview questions balanced across skills, projects, and one HR question.`,
    ...contextLines
  ].join('\n');
};

const safeParseJsonArray = (text) => {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        return Array.isArray(parsed) ? parsed : [];
      } catch (innerError) {
        return [];
      }
    }
    return [];
  }
};

const normalizeQuestion = (question, index) => {
  const questionId =
    question.questionId ||
    `gemini-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
  const text = String(question.text || '').trim();
  if (!text) return null;

  const role = Array.isArray(question.role) ? question.role : [question.role || 'any'];
  const expectedConceptsRaw = Array.isArray(question.expectedConcepts) ? question.expectedConcepts : [];
  const expectedConcepts = expectedConceptsRaw
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { concept: item, importance: 'supporting', synonyms: [] };
      }
      const concept = String(item.concept || '').trim();
      if (!concept) return null;
      const importance =
        item.importance === 'core' || item.importance === 'supporting' || item.importance === 'optional'
          ? item.importance
          : 'supporting';
      const synonyms = Array.isArray(item.synonyms)
        ? item.synonyms.map((synonym) => String(synonym || '').trim()).filter(Boolean)
        : [];
      return { concept, importance, synonyms };
    })
    .filter(Boolean);

  return {
    questionId,
    text,
    skillTags: Array.isArray(question.skillTags) ? question.skillTags : [],
    role,
    difficulty: question.difficulty || 'medium',
    expectedConcepts,
    conceptDescriptions: question.conceptDescriptions || {},
    category: question.category || 'skill'
  };
};

const toBase64 = async (file) => {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchGemini = async ({ prompt, resumeFile }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  if (resumeFile && resumeFile.size > 4 * 1024 * 1024) {
    throw new Error('Resume file is too large for Gemini inline upload. Please use a smaller file.');
  }

  const parts = [{ text: prompt }];
  if (resumeFile) {
    const data = await toBase64(resumeFile);
    parts.push({
      inlineData: {
        mimeType: resumeFile.type || 'application/octet-stream',
        data
      }
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  let attempt = 0;
  const maxRetries = 5; // Increased from 3 to 5 for better resilience
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.7 }
      });
      return result.response.text();
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';

      // Retry on 429 (Resource Exhausted) or 503 (Service Unavailable)
      const isRetryable = errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('Resource exhausted');

      if (attempt < maxRetries && isRetryable) {
        attempt++;
        // Increased backoff: starts at 2s, goes to 64s max with jitter
        const waitTime = Math.min(Math.pow(2, attempt) * 2000 + Math.random() * 2000, 60000);
        console.warn(`API rate limited (429). Retry ${attempt}/${maxRetries} in ${Math.round(waitTime / 1000)}s...`);
        await delay(waitTime);
        continue;
      }

      // If we're here, it's either not retryable or we ran out of retries
      break;
    }
  }

  const errorMessage = lastError?.message || '';
  if (errorMessage.includes('429') || errorMessage.includes('Resource exhausted')) {
    throw new Error(
      `Gemini API rate limit exhausted after ${attempt} retries. Your API quota may be exceeded. ` +
      `Please check your API usage at https://console.cloud.google.com/apis/dashboard or ` +
      `wait a few minutes before trying again.`
    );
  }

  throw new Error(`Gemini request failed after ${attempt} attempts. ${lastError?.message || ''}`.trim());
};

export const generateGeminiQuestions = async (params) => {
  const prompt = buildPrompt(params);
  const responseText = await fetchGemini({ prompt, resumeFile: params.resumeFile });
  const parsed = safeParseJsonArray(responseText);
  const normalized = parsed
    .map((item, index) => normalizeQuestion(item, index))
    .filter(Boolean);

  addGeneratedQuestions(normalized);
  return normalized;
};

