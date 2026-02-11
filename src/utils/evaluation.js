import { GoogleGenerativeAI } from '@google/generative-ai';
import { normalizeRole } from './questionGenerator';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'is', 'are', 'was', 'were',
  'to', 'of', 'in', 'on', 'for', 'with', 'as', 'by', 'at', 'from', 'it', 'this',
  'that', 'be', 'can', 'will', 'should', 'would', 'could', 'you', 'your', 'we',
  'they', 'their', 'our', 'i', 'my', 'me'
]);

const stemToken = (token) => {
  if (token.length <= 4) return token;
  return token
    .replace(/(ing|ed|ers|er|ly|ment|tion|s)$/i, '')
    .trim();
};

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !STOPWORDS.has(token))
    .map(stemToken)
    .filter(Boolean);

const buildVector = (tokens) => {
  const counts = new Map();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
};

const cosineSimilarity = (vectorA, vectorB) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  vectorA.forEach((value, key) => {
    normA += value * value;
    if (vectorB.has(key)) {
      dot += value * vectorB.get(key);
    }
  });

  vectorB.forEach((value) => {
    normB += value * value;
  });

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const createEmbedding = (text) => buildVector(tokenize(text));

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_TIMEOUT_MS = 15000;
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

const CONCEPT_COVERED_THRESHOLD = 0.6;
const CONCEPT_PARTIAL_THRESHOLD = 0.4;
const OFF_TOPIC_THRESHOLD = 0.3;
const RELEVANCE_CORRECT_THRESHOLD = 0.6;

const FALLBACK_THRESHOLDS = {
  covered: 0.5,
  partial: 0.3,
  offTopic: 0.2,
  relevanceCorrect: 0.5
};

const IMPORTANCE_WEIGHTS = {
  core: 0.6,
  supporting: 0.25,
  optional: 0.15
};

const VALID_IMPORTANCE = new Set(['core', 'supporting', 'optional']);

const getRoleWeights = (role) => {
  switch (role) {
    case 'frontend':
      return { relevanceWeight: 0.45, coverageWeight: 0.55 };
    case 'backend':
      return { relevanceWeight: 0.4, coverageWeight: 0.6 };
    case 'hr':
      return { relevanceWeight: 0.55, coverageWeight: 0.45 };
    default:
      return { relevanceWeight: 0.45, coverageWeight: 0.55 };
  }
};

const normalizeExpectedConcepts = (question, expectedConcepts = question.expectedConcepts) => {
  const raw = Array.isArray(expectedConcepts) ? expectedConcepts : [];
  return raw
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return {
          concept: item,
          importance: question.conceptImportance?.[item] || 'supporting',
          synonyms: []
        };
      }
      const concept = String(item.concept || '').trim();
      if (!concept) return null;
      const importance = VALID_IMPORTANCE.has(item.importance)
        ? item.importance
        : question.conceptImportance?.[concept] || 'supporting';
      const synonyms = Array.isArray(item.synonyms)
        ? item.synonyms.map((synonym) => String(synonym || '').trim()).filter(Boolean)
        : [];
      return { concept, importance, synonyms };
    })
    .filter(Boolean);
};

const jaccardSimilarity = (tokensA, tokensB) => {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

const clampNumber = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const safeParseJsonObject = (text) => {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
};

const withTimeout = (promise, ms, errorMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const buildConceptPayload = (normalizedConcepts, question) => {
  const buildEntry = (item) => {
    const description = question.conceptDescriptions?.[item.concept];
    return {
      concept: item.concept,
      description: description || '',
      synonyms: Array.isArray(item.synonyms) ? item.synonyms : []
    };
  };

  const core = normalizedConcepts.filter((item) => item.importance === 'core').map(buildEntry);
  const supporting = normalizedConcepts.filter((item) => item.importance === 'supporting').map(buildEntry);
  const optional = normalizedConcepts.filter((item) => item.importance === 'optional').map(buildEntry);

  return { core, supporting, optional };
};

const buildGeminiPrompt = ({ question, answerText, conceptPayload }) => [
  'You are a strict interview answer grader.',
  'Return ONLY valid JSON. Do not include markdown, code fences, or extra text.',
  'Evaluate only the content present in the answer. Do not infer or hallucinate.',
  'If a concept is not explicitly addressed (including synonyms), mark it missing.',
  'Use this rubric (total 100 points):',
  '- coreCoverage: 0-60 points (coverage of core concepts)',
  '- supportingCoverage: 0-25 points (coverage of supporting concepts)',
  '- clarity: 0-10 points (clarity and structure)',
  '- technicalAccuracy: 0-5 points (technical correctness)',
  'The score must equal the sum of the four subscores.',
  'Required JSON format:',
  '{"score": number, "coreCoverage": number, "supportingCoverage": number, "clarity": number, "technicalAccuracy": number, "missingConcepts": [string], "feedback": string}',
  '',
  `Question: ${question.text}`,
  `Answer: ${answerText}`,
  `Core concepts: ${JSON.stringify(conceptPayload.core)}`,
  `Supporting concepts: ${JSON.stringify(conceptPayload.supporting)}`,
  `Optional concepts: ${JSON.stringify(conceptPayload.optional)}`
].join('\n');

const evaluateConcepts = (answerText, question, normalizedConcepts, thresholds = {}) => {
  const answerEmbedding = createEmbedding(answerText);
  const conceptResults = [];
  const coveredThreshold = thresholds.covered ?? CONCEPT_COVERED_THRESHOLD;
  const partialThreshold = thresholds.partial ?? CONCEPT_PARTIAL_THRESHOLD;

  normalizedConcepts.forEach((conceptItem) => {
    const concept = conceptItem.concept;
    const conceptDescription = question.conceptDescriptions?.[concept] || concept;
    const candidateTexts = [
      conceptDescription,
      concept,
      ...conceptItem.synonyms
    ]
      .map((text) => String(text || '').trim())
      .filter(Boolean);

    let bestSimilarity = 0;
    candidateTexts.forEach((candidate) => {
      const candidateEmbedding = createEmbedding(candidate);
      const similarity = cosineSimilarity(answerEmbedding, candidateEmbedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
      }
    });

    let status = 'missing';
    if (bestSimilarity >= coveredThreshold) {
      status = 'covered';
    } else if (bestSimilarity >= partialThreshold) {
      status = 'partial';
    }

    conceptResults.push({
      concept,
      importance: conceptItem.importance,
      status,
      similarity: Number(bestSimilarity.toFixed(2))
    });
  });

  return conceptResults;
};

const buildFeedback = ({
  isOffTopic,
  isHr,
  correctnessLabel,
  missingCore,
  missingSupporting,
  missingOptional,
  relevanceScore,
  relevanceThreshold = RELEVANCE_CORRECT_THRESHOLD,
  starSignals
}) => {
  if (isOffTopic) {
    return 'Your response appears off-topic. Focus on the core idea of the question next time.';
  }

  if (isHr) {
    const missingStar = [];
    if (!starSignals?.situation) missingStar.push('Situation');
    if (!starSignals?.task) missingStar.push('Task');
    if (!starSignals?.action) missingStar.push('Action');
    if (!starSignals?.result) missingStar.push('Result');

    if (correctnessLabel === 'Correct') {
      return 'Strong behavioral answer with clear Situation, Task, Action, and Result.';
    }
    if (correctnessLabel === 'Partially Correct') {
      return missingStar.length
        ? `Good start. Add more STAR structure. Missing: ${missingStar.join(', ')}.`
        : 'Good start. Add more STAR structure for a stronger response.';
    }
    return 'Needs improvement. Structure your answer using Situation, Task, Action, and Result.';
  }

  if (correctnessLabel === 'Correct') {
    if (missingOptional.length > 0) {
      return `Strong answer covering core and supporting ideas. Optional areas to improve: ${missingOptional.join(', ')}.`;
    }
    return 'Strong answer covering the core and supporting concepts clearly.';
  }

  if (correctnessLabel === 'Partially Correct') {
    if (missingSupporting.length > 0) {
      return `Good explanation of the core concept, but missing supporting ideas: ${missingSupporting.join(', ')}.`;
    }
    return 'Core concepts are covered, but add more supporting detail to strengthen your response.';
  }

  if (missingCore.length > 0) {
    return `Your answer is on topic but misses major concept(s) required for correctness: ${missingCore.join(', ')}.`;
  }

  if (relevanceScore < relevanceThreshold) {
    return 'Your answer is somewhat on topic, but it lacks clear alignment with the question. Focus on the main idea and key concepts.';
  }

  return 'Needs improvement. Add the core concepts and supporting details for a complete response.';
};

const detectStarSignals = (answerText) => {
  const lower = answerText.toLowerCase();
  const situation = /(situation|context|background|challenge|problem)/.test(lower);
  const task = /(task|goal|responsibilit|assigned|asked to)/.test(lower);
  const action = /(action|i did|i took|i handled|i decided|implemented|resolved)/.test(lower);
  const result = /(result|outcome|impact|resolved|improved|learned)/.test(lower);
  return { situation, task, action, result };
};

const getConceptGroupStats = (conceptResults, importance) => {
  const items = conceptResults.filter((item) => item.importance === importance);
  const total = items.length;
  const covered = items.filter((item) => item.status === 'covered').length;
  const partial = items.filter((item) => item.status === 'partial').length;
  const missing = items.filter((item) => item.status === 'missing').map((item) => item.concept);
  const score = total ? (covered + partial * 0.5) / total : 0;
  return { total, covered, partial, missing, score };
};

const getWeightedCoverage = (conceptResults) => {
  const core = getConceptGroupStats(conceptResults, 'core');
  const supporting = getConceptGroupStats(conceptResults, 'supporting');
  const optional = getConceptGroupStats(conceptResults, 'optional');
  const activeWeights = {};
  let weightTotal = 0;

  [
    ['core', core],
    ['supporting', supporting],
    ['optional', optional]
  ].forEach(([key, group]) => {
    if (group.total > 0) {
      activeWeights[key] = IMPORTANCE_WEIGHTS[key];
      weightTotal += IMPORTANCE_WEIGHTS[key];
    }
  });

  if (weightTotal === 0) {
    return {
      coverage: 0,
      groups: { core, supporting, optional },
      weights: {}
    };
  }

  const normalizedWeights = Object.keys(activeWeights).reduce((acc, key) => {
    acc[key] = activeWeights[key] / weightTotal;
    return acc;
  }, {});

  const coverage =
    (normalizedWeights.core || 0) * core.score +
    (normalizedWeights.supporting || 0) * supporting.score +
    (normalizedWeights.optional || 0) * optional.score;

  return {
    coverage,
    groups: { core, supporting, optional },
    weights: normalizedWeights
  };
};

export const evaluateAnswerWithGemini = async (question, expectedConcepts, userAnswer) => {
  const normalizedConcepts = normalizeExpectedConcepts(question, expectedConcepts);
  const conceptPayload = buildConceptPayload(normalizedConcepts, question);
  const prompt = buildGeminiPrompt({
    question,
    answerText: userAnswer || '',
    conceptPayload
  });

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await withTimeout(
    model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 }
    }),
    GEMINI_TIMEOUT_MS,
    'Gemini evaluation timed out.'
  );

  const responseText = result.response.text();
  const parsed = safeParseJsonObject(responseText);
  if (!parsed) {
    throw new Error('Gemini returned invalid JSON.');
  }

  const coreCoverage = clampNumber(Number(parsed.coreCoverage), 0, 60);
  const supportingCoverage = clampNumber(Number(parsed.supportingCoverage), 0, 25);
  const clarity = clampNumber(Number(parsed.clarity), 0, 10);
  const technicalAccuracy = clampNumber(Number(parsed.technicalAccuracy), 0, 5);
  const computedScore = coreCoverage + supportingCoverage + clarity + technicalAccuracy;
  const scoreValue = Number.isFinite(Number(parsed.score)) ? Number(parsed.score) : computedScore;
  const score = clampNumber(scoreValue, 0, 100);

  const label = score >= 75 ? 'Correct' : score >= 50 ? 'Partially Correct' : 'Needs Improvement';

  const missingConcepts = Array.isArray(parsed.missingConcepts)
    ? parsed.missingConcepts.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  const feedback = String(parsed.feedback || '').trim() || 'No feedback provided.';

  return {
    label,
    result: {
      score: Math.round(score),
      coreCoverage: Math.round(coreCoverage),
      supportingCoverage: Math.round(supportingCoverage),
      clarity: Math.round(clarity),
      technicalAccuracy: Math.round(technicalAccuracy),
      missingConcepts,
      feedback
    }
  };
};

const evaluateAnswerDeterministic = ({ answer, question, targetRole, thresholds = {} }) => {
  const answerText = answer?.text?.trim() || '';
  const normalizedConcepts = normalizeExpectedConcepts(question);
  const conceptText = normalizedConcepts.map((item) => item.concept).join(' ');
  const synonymText = normalizedConcepts
    .flatMap((item) => item.synonyms || [])
    .filter(Boolean)
    .join(' ');
  const descriptionText = normalizedConcepts
    .map((item) => question.conceptDescriptions?.[item.concept])
    .filter(Boolean)
    .join(' ');
  const referenceText = `${question.text} ${conceptText} ${descriptionText} ${synonymText}`.trim();

  const answerEmbedding = createEmbedding(answerText);
  const referenceEmbedding = createEmbedding(referenceText);
  const relevanceScore = cosineSimilarity(answerEmbedding, referenceEmbedding);
  const answerTokens = tokenize(answerText);
  const referenceTokens = tokenize(referenceText);
  const relevanceBoost = jaccardSimilarity(answerTokens, referenceTokens);
  const combinedRelevance = Math.max(relevanceScore, relevanceBoost);

  const isHr = question.category === 'hr';
  const conceptResults = isHr
    ? []
    : evaluateConcepts(answerText, question, normalizedConcepts, {
        covered: thresholds.covered ?? CONCEPT_COVERED_THRESHOLD,
        partial: thresholds.partial ?? CONCEPT_PARTIAL_THRESHOLD
      });

  const { coverage: rawCoverage, groups } = getWeightedCoverage(conceptResults);

  const roleWeights = getRoleWeights(normalizeRole(targetRole));
  let adjustedCoverage = rawCoverage;

  const starSignals = detectStarSignals(answerText);
  const starCount = [starSignals.situation, starSignals.task, starSignals.action, starSignals.result].filter(Boolean).length;

  if (isHr) {
    adjustedCoverage = starCount / 4;
  }

  const weightedScore =
    combinedRelevance * roleWeights.relevanceWeight + adjustedCoverage * roleWeights.coverageWeight;

  const offTopicThreshold = thresholds.offTopic ?? OFF_TOPIC_THRESHOLD;
  const relevanceCorrectThreshold = thresholds.relevanceCorrect ?? RELEVANCE_CORRECT_THRESHOLD;
  const isOffTopic = combinedRelevance < offTopicThreshold;
  const hasCore = groups.core.total > 0;
  const coreGroup = hasCore
    ? groups.core
    : groups.supporting.total > 0
      ? groups.supporting
      : groups.optional;
  const coreCoveredAll = coreGroup.total > 0 && coreGroup.missing.length === 0;
  const missingCore = coreGroup.missing;
  const missingSupporting = hasCore ? groups.supporting.missing : [];
  const missingOptional = groups.optional.missing;

  let correctnessLabel = 'Needs Improvement';
  if (isOffTopic) {
    correctnessLabel = 'Off-topic';
  } else if (isHr) {
    if (starCount >= 3) {
      correctnessLabel = 'Correct';
    } else if (starCount >= 2) {
      correctnessLabel = 'Partially Correct';
    } else {
      correctnessLabel = 'Needs Improvement';
    }
  } else if (combinedRelevance >= relevanceCorrectThreshold && coreCoveredAll) {
    correctnessLabel = missingSupporting.length > 0 ? 'Partially Correct' : 'Correct';
  }

  const missingConcepts = Array.from(
    new Set([...missingCore, ...missingSupporting, ...missingOptional])
  );

  return {
    semanticRelevanceScore: Number(combinedRelevance.toFixed(2)),
    conceptCoveragePercent: Number((adjustedCoverage * 100).toFixed(0)),
    correctnessLabel,
    missingConcepts,
    feedback: buildFeedback({
      isOffTopic,
      isHr,
      correctnessLabel,
      missingCore,
      missingSupporting,
      missingOptional,
      relevanceScore: combinedRelevance,
      relevanceThreshold: relevanceCorrectThreshold,
      starSignals
    }),
    weightedScore: Number((weightedScore * 100).toFixed(0)),
    conceptResults
  };
};

export const evaluateAnswer = async ({ answer, question, targetRole }) => {
  const answerText = answer?.text?.trim() || '';
  const fallback = () =>
    evaluateAnswerDeterministic({
      answer,
      question,
      targetRole,
      thresholds: FALLBACK_THRESHOLDS
    });

  try {
    const geminiResult = await evaluateAnswerWithGemini(
      question,
      question.expectedConcepts,
      answerText
    );

    if (!geminiResult?.result) {
      return { ...fallback(), evaluationSource: 'deterministic' };
    }

    const rubric = geminiResult.result;
    const coveragePercent = ((rubric.coreCoverage + rubric.supportingCoverage) / 85) * 100;

    return {
      semanticRelevanceScore: Number((rubric.score / 100).toFixed(2)),
      conceptCoveragePercent: Number(coveragePercent.toFixed(0)),
      correctnessLabel: geminiResult.label,
      missingConcepts: rubric.missingConcepts,
      feedback: rubric.feedback,
      weightedScore: rubric.score,
      conceptResults: [],
      rubric,
      evaluationSource: 'gemini'
    };
  } catch (error) {
    console.warn('Gemini evaluation failed, using fallback.', error);
    return { ...fallback(), evaluationSource: 'deterministic' };
  }
};

export const evaluateInterview = async ({ questions, answers, resumeData, config }) => {
  const configExperience = config?.experienceLevel?.toLowerCase();
  const experienceLevel =
    resumeData?.experienceLevel ||
    (['intern', 'fresher', 'junior'].includes(configExperience) ? 'fresher' : 'experienced');
  const targetRole = resumeData?.targetRole || config?.jobPosition;

  const questionResults = await Promise.all(
    questions.map((question, index) =>
      evaluateAnswer({
        answer: answers?.[index],
        question,
        targetRole
      })
    )
  );

  const overallScore = Math.round(
    questionResults.reduce((total, result) => total + result.weightedScore, 0) /
      Math.max(1, questionResults.length)
  );

  const missingConcepts = Array.from(
    new Set(questionResults.flatMap((result) => result.missingConcepts))
  );

  return {
    overallScore,
    questionResults,
    summary: {
      experienceLevel,
      targetRole,
      missingConcepts
    }
  };
};
