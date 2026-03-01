import { GoogleGenerativeAI } from '@google/generative-ai';
import { normalizeRole } from './questionGenerator';

// ─────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.0-flash';
const EMBEDDING_MODEL = 'text-embedding-004';
const GEMINI_TIMEOUT_MS = 15000;
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

// Lowered thresholds (bag-of-words fallback only)
const CONCEPT_COVERED_THRESHOLD = 0.3;
const CONCEPT_PARTIAL_THRESHOLD = 0.2;
const OFF_TOPIC_THRESHOLD = 0.2;
const RELEVANCE_CORRECT_THRESHOLD = 0.5;

const FALLBACK_THRESHOLDS = {
  covered: 0.25,
  partial: 0.15,
  offTopic: 0.15,
  relevanceCorrect: 0.4
};

const IMPORTANCE_WEIGHTS = {
  core: 0.6,
  supporting: 0.25,
  optional: 0.15
};

const VALID_IMPORTANCE = new Set(['core', 'supporting', 'optional']);

// ─────────────────────────────────────────────────
// STOPWORDS & TOKENIZER (kept for TAI/EDD/fallback)
// ─────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────
// COSINE SIMILARITY (works for both Map and Array)
// ─────────────────────────────────────────────────
const cosineSimilarity = (a, b) => {
  // Array-based (real embeddings)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Map-based (bag-of-words fallback)
  let dot = 0, normA = 0, normB = 0;
  a.forEach((value, key) => {
    normA += value * value;
    if (b.has(key)) dot += value * b.get(key);
  });
  b.forEach((value) => { normB += value * value; });
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ─────────────────────────────────────────────────
// BAG-OF-WORDS EMBEDDING (fallback only)
// ─────────────────────────────────────────────────
const buildVector = (tokens) => {
  const counts = new Map();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
};

const buildBagOfWordsEmbedding = (text) => buildVector(tokenize(text));

// ─────────────────────────────────────────────────
// REAL GEMINI EMBEDDINGS (text-embedding-004)
// ─────────────────────────────────────────────────
const embeddingCache = new Map();

const getEmbedding = async (text) => {
  const key = text.trim().slice(0, 300); // cap cache key length
  if (embeddingCache.has(key)) return embeddingCache.get(key);

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    const embedding = result.embedding?.values || null;
    if (embedding) embeddingCache.set(key, embedding);
    return embedding;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
const jaccardSimilarity = (tokensA, tokensB) => {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((token) => { if (setB.has(token)) intersection++; });
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
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch { return null; }
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

const getRoleWeights = (role) => {
  switch (role) {
    case 'frontend': return { relevanceWeight: 0.45, coverageWeight: 0.55 };
    case 'backend': return { relevanceWeight: 0.4, coverageWeight: 0.6 };
    case 'hr': return { relevanceWeight: 0.55, coverageWeight: 0.45 };
    default: return { relevanceWeight: 0.45, coverageWeight: 0.55 };
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
        ? item.synonyms.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
      return { concept, importance, synonyms };
    })
    .filter(Boolean);
};

const buildConceptPayload = (normalizedConcepts, question) => {
  const buildEntry = (item) => ({
    concept: item.concept,
    description: question.conceptDescriptions?.[item.concept] || '',
    synonyms: Array.isArray(item.synonyms) ? item.synonyms : []
  });
  return {
    core: normalizedConcepts.filter((i) => i.importance === 'core').map(buildEntry),
    supporting: normalizedConcepts.filter((i) => i.importance === 'supporting').map(buildEntry),
    optional: normalizedConcepts.filter((i) => i.importance === 'optional').map(buildEntry)
  };
};

// ─────────────────────────────────────────────────
// FAIRER GEMINI PROMPT (1-10 scale)
// ─────────────────────────────────────────────────
const buildGeminiPrompt = ({ question, answerText, conceptPayload }) => [
  'You are a fair and encouraging interview evaluator, like a senior engineer giving constructive feedback.',
  'Give credit for concepts explained correctly even if the candidate uses different words or phrasing.',
  'Do not penalize for minor omissions if the core idea is clearly conveyed.',
  'Return ONLY valid JSON. No markdown, no code fences, no extra text.',
  '',
  'Score the answer on a 1–10 scale using this rubric:',
  '  10 = Excellent: covers all core concepts clearly with good depth',
  '  7-9 = Good: covers most core concepts with reasonable depth',
  '  5-6 = Fair: covers the main idea but misses some important details',
  '  3-4 = Needs work: partial understanding, missing several key concepts',
  '  1-2 = Poor: off-topic or fundamentally incorrect',
  '',
  'Required JSON format:',
  '{"score": number (1-10), "label": "Excellent"|"Good"|"Fair"|"Needs Improvement"|"Poor", "missingConcepts": [string], "feedback": string}',
  '',
  `Question: ${question.text}`,
  `Answer: ${answerText}`,
  `Core concepts expected: ${JSON.stringify(conceptPayload.core)}`,
  `Supporting concepts: ${JSON.stringify(conceptPayload.supporting)}`,
].join('\n');

// ─────────────────────────────────────────────────
// CONCEPT GROUP STATS
// ─────────────────────────────────────────────────
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

  [['core', core], ['supporting', supporting], ['optional', optional]].forEach(([key, group]) => {
    if (group.total > 0) {
      activeWeights[key] = IMPORTANCE_WEIGHTS[key];
      weightTotal += IMPORTANCE_WEIGHTS[key];
    }
  });

  if (weightTotal === 0) return { coverage: 0, groups: { core, supporting, optional }, weights: {} };

  const normalizedWeights = Object.keys(activeWeights).reduce((acc, key) => {
    acc[key] = activeWeights[key] / weightTotal;
    return acc;
  }, {});

  const coverage =
    (normalizedWeights.core || 0) * core.score +
    (normalizedWeights.supporting || 0) * supporting.score +
    (normalizedWeights.optional || 0) * optional.score;

  return { coverage, groups: { core, supporting, optional }, weights: normalizedWeights };
};

// ─────────────────────────────────────────────────
// STAR SIGNAL DETECTOR (HR questions)
// ─────────────────────────────────────────────────
const detectStarSignals = (answerText) => {
  const lower = answerText.toLowerCase();
  return {
    situation: /(situation|context|background|challenge|problem)/.test(lower),
    task: /(task|goal|responsibilit|assigned|asked to)/.test(lower),
    action: /(action|i did|i took|i handled|i decided|implemented|resolved)/.test(lower),
    result: /(result|outcome|impact|resolved|improved|learned)/.test(lower)
  };
};

// ─────────────────────────────────────────────────
// FEEDBACK BUILDER
// ─────────────────────────────────────────────────
const buildFeedback = ({
  isOffTopic, isHr, correctnessLabel,
  missingCore, missingSupporting, missingOptional,
  relevanceScore, relevanceThreshold = RELEVANCE_CORRECT_THRESHOLD, starSignals
}) => {
  if (isOffTopic) return 'Your response appears off-topic. Focus on the core idea of the question next time.';

  if (isHr) {
    const missingStar = [];
    if (!starSignals?.situation) missingStar.push('Situation');
    if (!starSignals?.task) missingStar.push('Task');
    if (!starSignals?.action) missingStar.push('Action');
    if (!starSignals?.result) missingStar.push('Result');
    if (correctnessLabel === 'Correct') return 'Strong behavioral answer with clear Situation, Task, Action, and Result.';
    if (correctnessLabel === 'Partially Correct') {
      return missingStar.length
        ? `Good start. Add more STAR structure. Missing: ${missingStar.join(', ')}.`
        : 'Good start. Add more STAR structure for a stronger response.';
    }
    return 'Needs improvement. Structure your answer using Situation, Task, Action, and Result.';
  }

  if (correctnessLabel === 'Correct') {
    if (missingOptional.length > 0) return `Strong answer covering core and supporting ideas. Optional areas to improve: ${missingOptional.join(', ')}.`;
    return 'Strong answer covering the core and supporting concepts clearly.';
  }
  if (correctnessLabel === 'Partially Correct') {
    if (missingSupporting.length > 0) return `Good explanation of the core concept, but missing supporting ideas: ${missingSupporting.join(', ')}.`;
    return 'Core concepts are covered, but add more supporting detail to strengthen your response.';
  }
  if (missingCore.length > 0) return `Your answer is on topic but misses major concept(s): ${missingCore.join(', ')}.`;
  if (relevanceScore < relevanceThreshold) return 'Your answer is somewhat on topic, but lacks clear alignment with the question.';
  return 'Needs improvement. Add the core concepts and supporting details for a complete response.';
};

// ─────────────────────────────────────────────────
// CONCEPT EVALUATION (uses real embeddings if available, falls back to BoW)
// ─────────────────────────────────────────────────
const evaluateConcepts = async (answerText, question, normalizedConcepts, thresholds = {}) => {
  const coveredThreshold = thresholds.covered ?? CONCEPT_COVERED_THRESHOLD;
  const partialThreshold = thresholds.partial ?? CONCEPT_PARTIAL_THRESHOLD;

  // Try real embedding for answer
  const answerEmbedding = await getEmbedding(answerText) || buildBagOfWordsEmbedding(answerText);
  const usedRealEmbeddings = Array.isArray(answerEmbedding);

  const conceptResults = [];

  for (const conceptItem of normalizedConcepts) {
    const concept = conceptItem.concept;
    const conceptDescription = question.conceptDescriptions?.[concept] || concept;
    const candidateTexts = [conceptDescription, concept, ...conceptItem.synonyms]
      .map((t) => String(t || '').trim())
      .filter(Boolean);

    let bestSimilarity = 0;

    for (const candidate of candidateTexts) {
      let candidateEmbedding;
      if (usedRealEmbeddings) {
        candidateEmbedding = await getEmbedding(candidate) || buildBagOfWordsEmbedding(candidate);
      } else {
        candidateEmbedding = buildBagOfWordsEmbedding(candidate);
      }
      const sim = cosineSimilarity(answerEmbedding, candidateEmbedding);
      if (sim > bestSimilarity) bestSimilarity = sim;
    }

    let status = 'missing';
    if (bestSimilarity >= coveredThreshold) status = 'covered';
    else if (bestSimilarity >= partialThreshold) status = 'partial';

    conceptResults.push({
      concept,
      importance: conceptItem.importance,
      status,
      similarity: Number(bestSimilarity.toFixed(2))
    });
  }

  return conceptResults;
};

// ─────────────────────────────────────────────────
// PHASE 2 — EVALUATION INDICES
// ─────────────────────────────────────────────────

/**
 * CLT — Cognitive Latency Tolerance (Eq. 3)
 * Measures how quickly the candidate started responding.
 * 1.0 = responded instantly, 0.0 = exceeded max threshold
 */
const computeCLT = (answer, difficulty = 'medium') => {
  if (!answer?.questionReadyAt || !answer?.startedAt) return null;
  const T_delay = Math.max(0, (answer.startedAt - answer.questionReadyAt) / 1000); // seconds
  const T_max = { easy: 15, medium: 20, hard: 30 }[difficulty] ?? 20;
  const clt = Math.max(0, 1 - T_delay / T_max);
  return parseFloat(clt.toFixed(2));
};

/**
 * TAI — Terminology Alignment Index (Eq. 4)
 * Measures how much domain-specific terminology the candidate used.
 * N_aligned / N_domain
 */
const computeTAI = (answerText, question) => {
  const normalizedConcepts = normalizeExpectedConcepts(question);
  const domainTerms = new Set();

  normalizedConcepts.forEach((item) => {
    tokenize(item.concept).forEach((t) => domainTerms.add(t));
    item.synonyms?.forEach((s) => tokenize(s).forEach((t) => domainTerms.add(t)));
    const desc = question.conceptDescriptions?.[item.concept];
    if (desc) tokenize(desc).forEach((t) => domainTerms.add(t));
  });

  if (domainTerms.size === 0) return 1.0;

  const answerTokens = new Set(tokenize(answerText));
  let aligned = 0;
  domainTerms.forEach((term) => { if (answerTokens.has(term)) aligned++; });

  return parseFloat(Math.min(1, aligned / domainTerms.size).toFixed(2));
};

/**
 * ACE — Answer Compression Efficiency (Eq. 5)
 * Rewards concise answers that cover more concepts.
 * C_coverage / normalized_length
 */
const computeACE = (answerText, conceptResults) => {
  if (!conceptResults || conceptResults.length === 0) return null;

  const totalConcepts = conceptResults.length;
  const coveredCount = conceptResults.filter((c) => c.status === 'covered').length;
  const partialCount = conceptResults.filter((c) => c.status === 'partial').length;
  const C_coverage = (coveredCount + partialCount * 0.5) / totalConcepts;

  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 0;

  const idealWordsPerConcept = 30;
  const idealLength = totalConcepts * idealWordsPerConcept;
  const lengthRatio = wordCount / idealLength;

  let lengthPenalty;
  if (lengthRatio < 0.3) lengthPenalty = lengthRatio / 0.3;  // too brief
  else if (lengthRatio > 2) lengthPenalty = 2 / lengthRatio;    // rambling
  else lengthPenalty = 1.0;                  // sweet spot

  return parseFloat(Math.min(1, C_coverage * lengthPenalty).toFixed(2));
};

/**
 * EDD — Expectation Drift Detection (Eq. 6)
 * 1 - D_semantic where D_semantic measures how much the answer drifts off-topic.
 * Uses per-sentence cosine similarity with real embeddings when available.
 */
const computeEDD = async (answerText, questionText) => {
  const sentences = answerText.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter((s) => s.length > 10) || [];
  if (sentences.length === 0) return null;

  const questionEmbedding = await getEmbedding(questionText) || buildBagOfWordsEmbedding(questionText);

  if (sentences.length === 1) {
    const sentEmb = await getEmbedding(sentences[0]) || buildBagOfWordsEmbedding(sentences[0]);
    return parseFloat(Math.max(0, Math.min(1, cosineSimilarity(sentEmb, questionEmbedding))).toFixed(2));
  }

  const similarities = [];
  for (const sentence of sentences) {
    const sentEmb = await getEmbedding(sentence) || buildBagOfWordsEmbedding(sentence);
    similarities.push(cosineSimilarity(sentEmb, questionEmbedding));
  }

  const mid = Math.ceil(similarities.length / 2);
  const firstHalf = similarities.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalf = similarities.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, similarities.length - mid);

  // Drift = how much similarity dropped from beginning to end
  const D_semantic = Math.max(0, firstHalf - secondHalf);
  const edd = Math.max(0, Math.min(1, 1 - D_semantic));
  return parseFloat(edd.toFixed(2));
};

/**
 * IRI — Interview Robustness Index
 * Measures score consistency across all questions in the session.
 * High IRI = candidate performs consistently across all questions.
 */
const computeIRI = (questionResults) => {
  const scores = questionResults.map((r) => r.weightedScore).filter((s) => s !== null && s !== undefined);
  if (scores.length < 2) return 1.0; // single question = perfectly consistent

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Normalize stddev: 0 = perfect consistency (IRI=1), 50+ = very inconsistent (IRI~0)
  const iri = Math.max(0, 1 - stdDev / 50);
  return parseFloat(iri.toFixed(2));
};

// ─────────────────────────────────────────────────
// GEMINI ANSWER EVALUATION (fair 1-10 scale)
// ─────────────────────────────────────────────────
export const evaluateAnswerWithGemini = async (question, expectedConcepts, userAnswer) => {
  const normalizedConcepts = normalizeExpectedConcepts(question, expectedConcepts);
  const conceptPayload = buildConceptPayload(normalizedConcepts, question);
  const prompt = buildGeminiPrompt({ question, answerText: userAnswer || '', conceptPayload });

  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Missing Gemini API key.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await withTimeout(
    model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    }),
    GEMINI_TIMEOUT_MS,
    'Gemini evaluation timed out.'
  );

  const responseText = result.response.text();
  const parsed = safeParseJsonObject(responseText);
  if (!parsed) throw new Error('Gemini returned invalid JSON.');

  // Parse 1-10 score
  const rawScore = clampNumber(Number(parsed.score), 1, 10);
  const score100 = rawScore * 10; // convert to 0-100 for internal pipeline

  const label = parsed.label ||
    (rawScore >= 8 ? 'Excellent' : rawScore >= 6 ? 'Good' : rawScore >= 4 ? 'Fair' : 'Needs Improvement');

  const missingConcepts = Array.isArray(parsed.missingConcepts)
    ? parsed.missingConcepts.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  const feedback = String(parsed.feedback || '').trim() || 'No feedback provided.';

  return {
    label,
    score10: rawScore,
    result: {
      score: Math.round(score100),
      missingConcepts,
      feedback
    }
  };
};

// ─────────────────────────────────────────────────
// DETERMINISTIC FALLBACK EVALUATION
// ─────────────────────────────────────────────────
const evaluateAnswerDeterministic = async ({ answer, question, targetRole, difficulty, thresholds = {} }) => {
  const answerText = answer?.text?.trim() || '';
  const normalizedConcepts = normalizeExpectedConcepts(question);

  // Build reference text for relevance check
  const conceptText = normalizedConcepts.map((item) => item.concept).join(' ');
  const synonymText = normalizedConcepts.flatMap((item) => item.synonyms || []).filter(Boolean).join(' ');
  const descriptionText = normalizedConcepts.map((item) => question.conceptDescriptions?.[item.concept]).filter(Boolean).join(' ');
  const referenceText = `${question.text} ${conceptText} ${descriptionText} ${synonymText}`.trim();

  // Real embeddings for relevance
  const answerEmb = await getEmbedding(answerText) || buildBagOfWordsEmbedding(answerText);
  const referenceEmb = await getEmbedding(referenceText) || buildBagOfWordsEmbedding(referenceText);
  const relevanceScore = cosineSimilarity(answerEmb, referenceEmb);

  // Jaccard boost (BoW always)
  const answerTokens = tokenize(answerText);
  const referenceTokens = tokenize(referenceText);
  const relevanceBoost = jaccardSimilarity(answerTokens, referenceTokens);
  const combinedRelevance = Math.max(relevanceScore, relevanceBoost);

  const isHr = question.category === 'hr';
  const conceptResults = isHr
    ? []
    : await evaluateConcepts(answerText, question, normalizedConcepts, {
      covered: thresholds.covered ?? CONCEPT_COVERED_THRESHOLD,
      partial: thresholds.partial ?? CONCEPT_PARTIAL_THRESHOLD
    });

  const { coverage: rawCoverage, groups } = getWeightedCoverage(conceptResults);
  const roleWeights = getRoleWeights(normalizeRole(targetRole));
  let adjustedCoverage = rawCoverage;

  const starSignals = detectStarSignals(answerText);
  const starCount = [starSignals.situation, starSignals.task, starSignals.action, starSignals.result].filter(Boolean).length;
  if (isHr) adjustedCoverage = starCount / 4;

  const weightedScore = combinedRelevance * roleWeights.relevanceWeight + adjustedCoverage * roleWeights.coverageWeight;

  const offTopicThreshold = thresholds.offTopic ?? OFF_TOPIC_THRESHOLD;
  const relevanceCorrectThreshold = thresholds.relevanceCorrect ?? RELEVANCE_CORRECT_THRESHOLD;
  const isOffTopic = combinedRelevance < offTopicThreshold;

  const hasCore = groups.core.total > 0;
  const coreGroup = hasCore ? groups.core : groups.supporting.total > 0 ? groups.supporting : groups.optional;
  const coreCoveredAll = coreGroup.total > 0 && coreGroup.missing.length === 0;
  const missingCore = coreGroup.missing;
  const missingSupporting = hasCore ? groups.supporting.missing : [];
  const missingOptional = groups.optional.missing;

  let correctnessLabel = 'Needs Improvement';
  if (isOffTopic) correctnessLabel = 'Off-topic';
  else if (isHr) correctnessLabel = starCount >= 3 ? 'Correct' : starCount >= 2 ? 'Partially Correct' : 'Needs Improvement';
  else if (combinedRelevance >= relevanceCorrectThreshold && coreCoveredAll)
    correctnessLabel = missingSupporting.length > 0 ? 'Partially Correct' : 'Correct';

  const missingConcepts = Array.from(new Set([...missingCore, ...missingSupporting, ...missingOptional]));

  // Compute per-question Phase 2 indices (except IRI which is session-level)
  const clt = computeCLT(answer, difficulty);
  const tai = computeTAI(answerText, question);
  const ace = computeACE(answerText, conceptResults);
  const edd = await computeEDD(answerText, question.text);

  return {
    semanticRelevanceScore: Number(combinedRelevance.toFixed(2)),
    conceptCoveragePercent: Number((adjustedCoverage * 100).toFixed(0)),
    correctnessLabel,
    missingConcepts,
    feedback: buildFeedback({
      isOffTopic, isHr, correctnessLabel,
      missingCore, missingSupporting, missingOptional,
      relevanceScore: combinedRelevance,
      relevanceThreshold: relevanceCorrectThreshold,
      starSignals
    }),
    weightedScore: Number((weightedScore * 100).toFixed(0)),
    conceptResults,
    indices: { clt, tai, ace, edd }
  };
};

// ─────────────────────────────────────────────────
// MAIN ANSWER EVALUATION (Gemini first, fallback to deterministic)
// ─────────────────────────────────────────────────
export const evaluateAnswer = async ({ answer, question, targetRole, difficulty }) => {
  const answerText = answer?.text?.trim() || '';

  const fallback = async () => {
    const det = await evaluateAnswerDeterministic({
      answer, question, targetRole, difficulty,
      thresholds: FALLBACK_THRESHOLDS
    });
    return { ...det, evaluationSource: 'deterministic' };
  };

  try {
    const geminiResult = await evaluateAnswerWithGemini(question, question.expectedConcepts, answerText);
    if (!geminiResult?.result) return fallback();

    const rubric = geminiResult.result;
    const score10 = geminiResult.score10; // 1-10

    // Also compute Phase 2 indices (deterministic)
    const normalizedConcepts = normalizeExpectedConcepts(question);
    const conceptResults = question.category === 'hr'
      ? []
      : await evaluateConcepts(answerText, question, normalizedConcepts, {
        covered: CONCEPT_COVERED_THRESHOLD,
        partial: CONCEPT_PARTIAL_THRESHOLD
      });

    const clt = computeCLT(answer, difficulty);
    const tai = computeTAI(answerText, question);
    const ace = computeACE(answerText, conceptResults);
    const edd = await computeEDD(answerText, question.text);

    return {
      semanticRelevanceScore: Number((score10 / 10).toFixed(2)),
      conceptCoveragePercent: Math.round(score10 * 10), // approximate
      correctnessLabel: geminiResult.label,
      missingConcepts: rubric.missingConcepts,
      feedback: rubric.feedback,
      weightedScore: rubric.score,
      score10,
      conceptResults,
      indices: { clt, tai, ace, edd },
      evaluationSource: 'gemini'
    };
  } catch (error) {
    console.warn('Gemini evaluation failed, using deterministic fallback.', error);
    return fallback();
  }
};

// ─────────────────────────────────────────────────
// PHASE 5 — EXPERIENCE-LEVEL MULTIPLIER
// ─────────────────────────────────────────────────
const getExperienceMultiplier = (level = '') => {
  const l = level.toLowerCase();
  if (l.includes('intern') || l.includes('fresher')) return 1.25;
  if (l.includes('junior')) return 1.10;
  if (l.includes('senior') || l.includes('experienced')) return 0.95;
  return 1.00;
};

// ─────────────────────────────────────────────────
// SESSION-LEVEL EVALUATION
// ─────────────────────────────────────────────────
export const evaluateInterview = async ({ questions, answers, resumeData, config }) => {
  const configExperience = config?.experienceLevel?.toLowerCase();
  const experienceLevel = resumeData?.experienceLevel ||
    (['intern', 'fresher', 'junior'].includes(configExperience) ? 'fresher' : 'experienced');
  const targetRole = resumeData?.targetRole || config?.jobPosition;
  const difficulty = config?.difficulty?.toLowerCase() || 'medium';

  const questionResults = await Promise.all(
    questions.map((question, index) =>
      evaluateAnswer({ answer: answers?.[index], question, targetRole, difficulty })
    )
  );

  // Phase 5: apply experience-level multiplier, cap at 100
  const multiplier = getExperienceMultiplier(config?.experienceLevel || experienceLevel);
  const rawAvg = questionResults.reduce((total, result) => total + result.weightedScore, 0) /
    Math.max(1, questionResults.length);
  const overallScore = Math.min(100, Math.round(rawAvg * multiplier));

  // Session-level IRI
  const iri = computeIRI(questionResults);

  // Average per-question indices across session
  const avgIndex = (key) => {
    const vals = questionResults.map((r) => r.indices?.[key]).filter((v) => v !== null && v !== undefined);
    if (!vals.length) return null;
    return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  };

  const sessionIndices = {
    clt: avgIndex('clt'),
    tai: avgIndex('tai'),
    ace: avgIndex('ace'),
    edd: avgIndex('edd'),
    iri
  };

  const missingConcepts = Array.from(
    new Set(questionResults.flatMap((result) => result.missingConcepts))
  );

  return {
    overallScore,
    questionResults,
    sessionIndices,
    summary: {
      experienceLevel,
      targetRole,
      missingConcepts
    }
  };
};
