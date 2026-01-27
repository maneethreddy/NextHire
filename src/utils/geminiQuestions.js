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
    'conceptDescriptions should be an object mapping each expectedConcept to a short explanation.',
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
  const expectedConcepts = Array.isArray(question.expectedConcepts) ? question.expectedConcepts : [];

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

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.7 }
    });
    return result.response.text();
  } catch (error) {
    throw new Error(`Gemini request failed. ${error.message || ''}`.trim());
  }
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


