import { QUESTION_BANK } from './questionBank';
import { getGeneratedQuestionBank } from './storage';

const ROLE_MAP = {
  'Frontend Developer': 'frontend',
  'Backend Developer': 'backend',
  'Full Stack Developer': 'fullstack',
  'DevOps Engineer': 'devops',
  'Data Engineer': 'data',
  'Software Engineer': 'fullstack',
  'HR': 'hr'
};

export const normalizeRole = (roleLabel) => {
  if (!roleLabel) return 'frontend';
  return ROLE_MAP[roleLabel] || roleLabel.toLowerCase();
};

export const getQuestionCountFromDuration = (durationLabel) => {
  const durationMatch = durationLabel?.match(/(\d+)/);
  const totalMinutes = durationMatch ? Number.parseInt(durationMatch[1], 10) : 30;
  if (totalMinutes <= 15) return 4;
  if (totalMinutes <= 30) return 6;
  return 8;
};

const roleMatches = (questionRole, targetRole) => {
  if (!questionRole || questionRole.includes('any')) return true;
  if (questionRole.includes(targetRole)) return true;
  if (targetRole === 'fullstack' && (questionRole.includes('frontend') || questionRole.includes('backend'))) {
    return true;
  }
  return false;
};

const difficultyMatches = (questionDifficulty, configDifficulty) => {
  if (!configDifficulty) return true;
  return questionDifficulty === configDifficulty.toLowerCase();
};

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickQuestions = (pool, count, usedSet) => {
  const picks = [];
  const shuffled = shuffle(pool);
  for (const question of shuffled) {
    if (picks.length >= count) break;
    if (!usedSet.has(question.questionId)) {
      picks.push(question);
      usedSet.add(question.questionId);
    }
  }
  return picks;
};

export const generateInterviewQuestions = ({
  resumeData,
  config,
  attemptedQuestionIds,
  totalQuestions
}) => {
  const targetRole = normalizeRole(resumeData?.targetRole || config?.jobPosition);
  const difficulty = config?.difficulty?.toLowerCase();
  const resumeSkills = resumeData?.skills || [];
  const attemptedSet = new Set(attemptedQuestionIds || []);
  const usedSet = new Set();

  const generatedBank = getGeneratedQuestionBank();
  const combinedBank = [...QUESTION_BANK, ...generatedBank];

  const eligible = combinedBank.filter((question) =>
    roleMatches(question.role, targetRole) && difficultyMatches(question.difficulty, difficulty)
  );

  const skillQuestions = eligible.filter((question) =>
    question.category === 'skill' &&
    question.skillTags.some((tag) => resumeSkills.includes(tag))
  );

  const fallbackSkillQuestions = eligible.filter((question) => question.category === 'skill');
  const projectQuestions = eligible.filter((question) => question.category === 'project');
  const hrQuestions = eligible.filter((question) => question.category === 'hr');

  const count = totalQuestions || 6;
  const hrCount = 1;
  const projectCount = Math.max(1, Math.floor(count * 0.3));
  const skillCount = Math.max(1, count - projectCount - hrCount);

  const availableSkill = skillQuestions.filter((q) => !attemptedSet.has(q.questionId));
  const availableProject = projectQuestions.filter((q) => !attemptedSet.has(q.questionId));
  const availableHr = hrQuestions.filter((q) => !attemptedSet.has(q.questionId));

  const picks = [];

  if (skillCount > 0) {
    picks.push(...pickQuestions(availableSkill.length ? availableSkill : fallbackSkillQuestions, skillCount, usedSet));
  }

  if (projectCount > 0) {
    picks.push(...pickQuestions(availableProject.length ? availableProject : projectQuestions, projectCount, usedSet));
  }

  if (hrCount > 0) {
    picks.push(...pickQuestions(availableHr.length ? availableHr : hrQuestions, hrCount, usedSet));
  }

  const remainingNeeded = count - picks.length;
  if (remainingNeeded > 0) {
    const remainingPool = eligible.filter((question) => !usedSet.has(question.questionId));
    picks.push(...pickQuestions(remainingPool, remainingNeeded, usedSet));
  }

  const usedQuestionIds = Array.from(usedSet);

  return {
    questions: picks,
    usedQuestionIds,
    breakdown: {
      skill: picks.filter((q) => q.category === 'skill').length,
      project: picks.filter((q) => q.category === 'project').length,
      hr: picks.filter((q) => q.category === 'hr').length
    }
  };
};
