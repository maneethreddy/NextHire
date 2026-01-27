const ATTEMPTED_QUESTION_KEY = 'nexthire_attempted_questions';
const INTERVIEW_SESSION_KEY = 'nexthire_interview_sessions';
const GENERATED_QUESTION_BANK_KEY = 'nexthire_generated_question_bank';

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (error) {
    return fallback;
  }
};

export const getAttemptedQuestionIds = () => {
  const stored = localStorage.getItem(ATTEMPTED_QUESTION_KEY);
  return stored ? safeJsonParse(stored, []) : [];
};

export const setAttemptedQuestionIds = (ids) => {
  localStorage.setItem(ATTEMPTED_QUESTION_KEY, JSON.stringify(ids));
};

export const saveInterviewSession = (session) => {
  const stored = localStorage.getItem(INTERVIEW_SESSION_KEY);
  const sessions = stored ? safeJsonParse(stored, []) : [];
  sessions.push(session);
  localStorage.setItem(INTERVIEW_SESSION_KEY, JSON.stringify(sessions));
};

export const updateInterviewSession = (sessionId, updates) => {
  const stored = localStorage.getItem(INTERVIEW_SESSION_KEY);
  const sessions = stored ? safeJsonParse(stored, []) : [];
  const updated = sessions.map((session) =>
    session.id === sessionId ? { ...session, ...updates } : session
  );
  localStorage.setItem(INTERVIEW_SESSION_KEY, JSON.stringify(updated));
};

export const getGeneratedQuestionBank = () => {
  const stored = localStorage.getItem(GENERATED_QUESTION_BANK_KEY);
  return stored ? safeJsonParse(stored, []) : [];
};

export const addGeneratedQuestions = (questions) => {
  if (!questions?.length) return;
  const existing = getGeneratedQuestionBank();
  const byId = new Map(existing.map((question) => [question.questionId, question]));

  questions.forEach((question) => {
    if (!byId.has(question.questionId)) {
      byId.set(question.questionId, question);
    }
  });

  localStorage.setItem(GENERATED_QUESTION_BANK_KEY, JSON.stringify(Array.from(byId.values())));
};
