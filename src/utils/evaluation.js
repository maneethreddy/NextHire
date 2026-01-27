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

const getExperienceAdjustments = (experienceLevel) => {
  if (experienceLevel === 'experienced') {
    return { relevanceBoost: 0.06, coverageBoost: 0.06 };
  }
  return { relevanceBoost: -0.06, coverageBoost: -0.06 };
};

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

const getConceptThresholds = (experienceLevel) => {
  const adjustments = getExperienceAdjustments(experienceLevel);
  return {
    covered: 0.6 + adjustments.coverageBoost,
    partial: 0.4 + adjustments.coverageBoost / 2
  };
};

const getRelevanceBands = () => ({
  strong: 0.65,
  partial: 0.45
});

const getCoverageBands = () => ({
  correct: 0.7,
  partial: 0.4
});

const getConceptWeight = (question, concept) => {
  const importance = question.conceptImportance?.[concept];
  if (importance === 'core') return 1.2;
  if (importance === 'optional') return 0.7;
  return 1;
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

const evaluateConcepts = (answerText, question) => {
  const answerTokens = tokenize(answerText);
  const answerEmbedding = createEmbedding(answerText);
  const thresholds = getConceptThresholds(question.experienceLevel);
  const conceptResults = [];

  question.expectedConcepts.forEach((concept) => {
    const conceptDescription = question.conceptDescriptions?.[concept] || concept;
    const conceptEmbedding = createEmbedding(`${concept} ${conceptDescription}`);
    const conceptTokens = tokenize(`${concept} ${conceptDescription}`);
    const similarity = cosineSimilarity(answerEmbedding, conceptEmbedding);
    const keywordOverlap = jaccardSimilarity(answerTokens, conceptTokens);
    const combined = Math.max(similarity, keywordOverlap);
    const weight = getConceptWeight(question, concept);

    let status = 'missing';
    if (combined >= thresholds.covered) {
      status = 'covered';
    } else if (combined >= thresholds.partial) {
      status = 'partial';
    }

    conceptResults.push({ concept, status, similarity: Number(combined.toFixed(2)), weight });
  });

  return conceptResults;
};

const buildFeedback = ({ relevanceBand, coverageBand, missingConcepts, isHr }) => {
  if (relevanceBand === 'off-topic') {
    return 'Your response appears off-topic. Focus on the core idea of the question next time.';
  }

  if (isHr) {
    if (coverageBand === 'correct') {
      return 'Strong response. You addressed the situation and actions clearly and closed with a resolution.';
    }
    if (coverageBand === 'partial') {
      return 'Good start. Add more context or a clearer resolution to strengthen your response.';
    }
    return 'Needs improvement. Try structuring your answer using Situation, Action, and Resolution.';
  }

  if (coverageBand === 'correct') {
    return 'Strong answer. You addressed the key concepts with clear context.';
  }

  if (missingConcepts.length > 0) {
    return `Good start, but you missed: ${missingConcepts.join(', ')}. Add these for a more complete response.`;
  }

  return 'Partially correct. Expand with more structured reasoning and expected concepts.';
};

const detectStarSignals = (answerText) => {
  const lower = answerText.toLowerCase();
  const situation = /(situation|context|background|challenge|problem)/.test(lower);
  const action = /(action|i did|i took|i handled|i decided|implemented|resolved)/.test(lower);
  const resolution = /(result|outcome|impact|resolved|improved|learned)/.test(lower);
  return { situation, action, resolution };
};

export const evaluateAnswer = ({ answer, question, experienceLevel, targetRole }) => {
  const answerText = answer?.text?.trim() || '';
  const referenceText = `${question.text} ${question.expectedConcepts.join(' ')} ${
    Object.values(question.conceptDescriptions || {}).join(' ')
  }`;

  const answerEmbedding = createEmbedding(answerText);
  const referenceEmbedding = createEmbedding(referenceText);
  const relevanceScore = cosineSimilarity(answerEmbedding, referenceEmbedding);
  const answerTokens = tokenize(answerText);
  const referenceTokens = tokenize(referenceText);
  const relevanceBoost = jaccardSimilarity(answerTokens, referenceTokens);
  const combinedRelevance = Math.max(relevanceScore, relevanceBoost);

  const conceptResults = evaluateConcepts(answerText, {
    ...question,
    experienceLevel
  });

  const totalWeight = conceptResults.reduce((sum, item) => sum + (item.weight || 1), 0);
  const coveredWeight = conceptResults
    .filter((item) => item.status === 'covered')
    .reduce((sum, item) => sum + item.weight, 0);
  const partialWeight = conceptResults
    .filter((item) => item.status === 'partial')
    .reduce((sum, item) => sum + item.weight, 0);
  const coveragePercent =
    (coveredWeight + partialWeight * 0.5) / Math.max(1, totalWeight);

  const roleWeights = getRoleWeights(normalizeRole(targetRole));
  const weightedScore = combinedRelevance * roleWeights.relevanceWeight + coveragePercent * roleWeights.coverageWeight;
  const relevanceBands = getRelevanceBands();
  const coverageBands = getCoverageBands();
  const isHr = question.category === 'hr';

  const relevanceBand =
    combinedRelevance >= relevanceBands.strong
      ? 'strong'
      : combinedRelevance >= relevanceBands.partial
        ? 'partial'
        : 'off-topic';

  let adjustedCoverage = coveragePercent;

  if (isHr) {
    const star = detectStarSignals(answerText);
    const starCount = [star.situation, star.action, star.resolution].filter(Boolean).length;
    if (starCount >= 2) {
      adjustedCoverage = Math.max(adjustedCoverage, 0.45);
    }
    if (starCount >= 3) {
      adjustedCoverage = Math.max(adjustedCoverage, 0.7);
    }
  }

  let correctnessLabel = 'Needs Improvement';
  if (relevanceBand === 'off-topic') {
    correctnessLabel = 'Off-topic';
  } else if (adjustedCoverage >= coverageBands.correct) {
    correctnessLabel = 'Correct';
  } else if (adjustedCoverage >= coverageBands.partial) {
    correctnessLabel = 'Partially Correct';
  } else {
    correctnessLabel = 'Needs Improvement';
  }

  const missingConcepts = conceptResults
    .filter((item) => item.status === 'missing')
    .map((item) => item.concept);

  return {
    semanticRelevanceScore: Number(combinedRelevance.toFixed(2)),
    conceptCoveragePercent: Number((adjustedCoverage * 100).toFixed(0)),
    correctnessLabel,
    missingConcepts,
    feedback: buildFeedback({ relevanceBand, coverageBand: correctnessLabel === 'Correct' ? 'correct' : correctnessLabel === 'Partially Correct' ? 'partial' : 'needs', missingConcepts, isHr }),
    weightedScore: Number((weightedScore * 100).toFixed(0)),
    conceptResults
  };
};

export const evaluateInterview = ({ questions, answers, resumeData, config }) => {
  const configExperience = config?.experienceLevel?.toLowerCase();
  const experienceLevel =
    resumeData?.experienceLevel ||
    (['intern', 'fresher', 'junior'].includes(configExperience) ? 'fresher' : 'experienced');
  const targetRole = resumeData?.targetRole || config?.jobPosition;

  const questionResults = questions.map((question, index) =>
    evaluateAnswer({
      answer: answers?.[index],
      question,
      experienceLevel,
      targetRole
    })
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
