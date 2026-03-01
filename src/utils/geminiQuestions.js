import { GoogleGenerativeAI } from '@google/generative-ai';
import { addGeneratedQuestions } from './storage';

const GEMINI_MODEL = 'gemini-2.5-flash';
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

// ── Question count: ~1 question per 4 minutes, minimum 3 ──────────────
const getSchedule = (durationLabel = '30') => {
  const mins = parseInt(durationLabel?.match(/\d+/)?.[0] || '30', 10);
  const total = Math.max(3, Math.round(mins / 4));
  const hr = 1;
  const project = Math.max(1, Math.round(total * 0.25)); // ~25% project
  const skill = Math.max(1, total - project - hr);      // rest = skill
  return { total, skill, project, hr };
};

// ── Experience-level depth instruction ───────────────────────────────
const getDepthInstruction = (experienceLevel = '') => {
  const l = experienceLevel.toLowerCase();
  if (l.includes('intern'))
    return 'Questions must be conceptual and definition-level only. No implementation details, no architecture. Focus on "what is" and "why".';
  if (l.includes('fresher'))
    return 'Questions should be basic implementation level. Avoid advanced architecture or system design. Focus on fundamentals and simple usage.';
  if (l.includes('junior'))
    return 'Mix of basic and intermediate questions. One moderately complex scenario is acceptable. Focus on practical coding and debugging.';
  if (l.includes('mid') || l.includes('middle'))
    return 'Practical implementation questions with tradeoffs. Include one system design or architecture question.';
  if (l.includes('senior') || l.includes('experienced'))
    return 'Advanced questions on architecture, scalability, design patterns, and optimisation. Include system design and open-ended problems.';
  return 'Balanced mix of conceptual and practical questions.';
};

// ── Difficulty flavour ────────────────────────────────────────────────
const getDifficultyFlavour = (difficulty = '') => {
  const d = difficulty.toLowerCase();
  if (d === 'easy') return 'Focus on fundamental concepts, syntax, and definitions. Questions should be answerable in 1–2 sentences.';
  if (d === 'hard') return 'Focus on design problems, edge cases, optimisation, and system thinking. Questions should require deep reasoning.';
  return 'Focus on practical scenarios, tradeoffs, and intermediate-level implementation.';
};

const buildPrompt = ({
  jobRole,
  difficulty,
  count,
  experienceLevel,
  duration,
  hasResume,
  mode,
  previousQuestions,
  previousAnswers
}) => {
  const baseRules = [
    'Return ONLY valid JSON (no markdown, no code fences).',
    'The output must be a JSON array of question objects.',
    'Each question object must include: questionId, text, skillTags, role, difficulty, expectedConcepts, conceptDescriptions, category.',
    'Do NOT include answers or hints.',
    'Ensure questions are concise, specific, and relevant to the role.',
    'role must be one of: frontend, backend, fullstack, hr, devops, data, any.',
    'category must be one of: skill, project, hr.',
    'expectedConcepts must be an array of objects: { concept, importance, synonyms }.',
    'importance must be one of: core, supporting, optional.',
    'synonyms is an optional array of short alternative phrases (empty array is fine).',
    'conceptDescriptions should be an object mapping each concept to a short explanation.',
    ...(hasResume ? ['The resume file is attached as binary data.'] : [])
  ];

  if (mode === 'followup') {
    return [
      ...baseRules,
      `Generate ${count || 1} follow-up interview questions that build on the previous question(s) or answer(s).`,
      `Job role: ${jobRole}`,
      `Difficulty: ${difficulty || 'medium'}`,
      `Previous questions: ${JSON.stringify(previousQuestions || [])}`,
      `User answers: ${JSON.stringify(previousAnswers || [])}`
    ].join('\n');
  }

  const schedule = getSchedule(duration);
  const total = count || schedule.total;
  const depthInstruction = getDepthInstruction(experienceLevel);
  const difficultyFlavour = getDifficultyFlavour(difficulty);

  const tailoringInstruction = hasResume
    ? 'Tailor at least 60% of questions directly to the skills and projects found in the attached resume.'
    : `Generate standard ${jobRole} interview questions relevant to the experience level and difficulty. Do NOT mention a resume.`;

  return [
    ...baseRules,
    '',
    `Generate exactly ${total} interview questions for a ${jobRole} candidate with the following distribution:`,
    `  - ${schedule.skill} skill/technical questions (category: skill)`,
    `  - ${schedule.project} project/scenario-based questions (category: project)`,
    `  - ${schedule.hr} HR/behavioural question (category: hr)`,
    '',
    `Experience level: ${experienceLevel || 'not specified'}`,
    `Depth instruction: ${depthInstruction}`,
    '',
    `Difficulty: ${difficulty || 'medium'}`,
    `Difficulty flavour: ${difficultyFlavour}`,
    '',
    `Job role: ${jobRole}`,
    tailoringInstruction
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
  const hasResume = !!params.resumeFile;
  const prompt = buildPrompt({ ...params, hasResume });
  const responseText = await fetchGemini({ prompt, resumeFile: params.resumeFile });
  const parsed = safeParseJsonArray(responseText);
  const normalized = parsed
    .map((item, index) => normalizeQuestion(item, index))
    .filter(Boolean);

  addGeneratedQuestions(normalized);
  return normalized;
};

