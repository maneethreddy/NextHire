// configure.js - Configuration file for NextHire interview settings

export const experienceLevels = [
  { id: 'intern', label: 'Intern', desc: 'Entry level questions', years: 'Starting out' },
  { id: 'fresher', label: 'Fresher', desc: 'Graduate level depth', years: '0-1 year' },
  { id: 'junior', label: 'Junior', desc: 'Foundational concepts', years: '1-2 years' },
  { id: 'mid', label: 'Mid-Level', desc: 'Practical experience', years: '3-5 years' },
];

export const jobRoles = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Engineer',
  'Software Engineer',
];

export const difficultyLevels = [
  { id: 'easy', label: 'Easy', desc: 'Fundamental concepts' },
  { id: 'medium', label: 'Medium', desc: 'Intermediate complexity' },
  { id: 'hard', label: 'Hard', desc: 'Advanced problems' },
];

export const durations = [
  { id: '15', label: '15 minutes', desc: 'Quick practice session' },
  { id: '30', label: '30 minutes', desc: 'Comprehensive interview' },
  { id: '45', label: '45 minutes', desc: 'Deep-dive session' },
];

// Default configuration
export const defaultConfig = {
  experienceLevel: '',
  jobPosition: '',
  difficulty: '',
  duration: '',
};

// Mock questions generator based on config
export const generateMockQuestions = (config) => {
  return [
    {
      id: 1,
      text: 'Have you ever started something from scratch? A project, club or activity? what was your learning?',
      followUp: null
    },
    {
      id: 2,
      text: `Explain the concept of ${config.jobPosition?.includes('Frontend') ? 'React hooks' : config.jobPosition?.includes('Backend') ? 'RESTful APIs' : 'system design'}.`,
      followUp: null
    },
    {
      id: 3,
      text: `What are the key differences between ${config.difficulty === 'Easy' ? 'synchronous and asynchronous' : 'microservices and monolithic'} architecture?`,
      followUp: null
    },
    {
      id: 4,
      text: `How would you handle ${config.jobPosition?.includes('Backend') ? 'database connection pooling' : 'state management'} in a production environment?`,
      followUp: null
    }
  ];
};