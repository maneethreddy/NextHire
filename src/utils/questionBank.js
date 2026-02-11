export const QUESTION_BANK = [
  {
    questionId: 'fe-react-hooks-001',
    text: 'Explain how React hooks manage state and side effects. When would you use useEffect?',
    skillTags: ['react', 'hooks', 'state'],
    role: ['frontend', 'fullstack'],
    difficulty: 'easy',
    category: 'skill',
    expectedConcepts: [
      { concept: 'useState basics', importance: 'core', synonyms: [] },
      { concept: 'side effects', importance: 'core', synonyms: [] },
      { concept: 'dependency array', importance: 'supporting', synonyms: [] },
      { concept: 'cleanup', importance: 'supporting', synonyms: [] },
      { concept: 'stateful logic reuse', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'stateful logic reuse': 'Explain how hooks allow sharing stateful logic without classes.',
      'useState basics': 'Mention initializing state and updating it in function components.',
      'side effects': 'Describe effects like data fetching, subscriptions, or DOM updates.',
      'dependency array': 'Explain how dependencies control when the effect runs.',
      'cleanup': 'Mention returning a cleanup function for subscriptions or timers.'
    }
  },
  {
    questionId: 'fe-css-layout-002',
    text: 'How do Flexbox and CSS Grid differ, and when would you choose one over the other?',
    skillTags: ['css', 'layout'],
    role: ['frontend'],
    difficulty: 'easy',
    category: 'skill',
    expectedConcepts: [
      { concept: 'one-dimensional vs two-dimensional', importance: 'core', synonyms: [] },
      { concept: 'layout intent', importance: 'core', synonyms: [] },
      { concept: 'alignment control', importance: 'supporting', synonyms: [] },
      { concept: 'browser support', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'one-dimensional vs two-dimensional': 'Flexbox is one-dimensional, Grid is two-dimensional.',
      'alignment control': 'Explain how each handles alignment and spacing.',
      'layout intent': 'Flexbox for components, Grid for full-page layouts.',
      'browser support': 'Mention compatibility considerations if relevant.'
    }
  },
  {
    questionId: 'fe-performance-003',
    text: 'What steps would you take to improve the performance of a React application?',
    skillTags: ['react', 'performance'],
    role: ['frontend', 'fullstack'],
    difficulty: 'medium',
    category: 'skill',
    expectedConcepts: [
      { concept: 'avoid re-renders', importance: 'core', synonyms: [] },
      { concept: 'memoization', importance: 'core', synonyms: [] },
      { concept: 'code splitting', importance: 'supporting', synonyms: [] },
      { concept: 'profiling', importance: 'supporting', synonyms: [] },
      { concept: 'lazy loading', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'memoization': 'Use memo, useMemo, or useCallback appropriately.',
      'code splitting': 'Split bundles by route or component.',
      'avoid re-renders': 'Stabilize props and state updates.',
      'profiling': 'Use React DevTools or browser profiling.',
      'lazy loading': 'Load heavy components only when needed.'
    }
  },
  {
    questionId: 'fe-accessibility-004',
    text: 'How do you ensure accessibility (a11y) in a web application?',
    skillTags: ['accessibility', 'html', 'frontend'],
    role: ['frontend', 'fullstack'],
    difficulty: 'medium',
    category: 'skill',
    expectedConcepts: [
      { concept: 'semantic HTML', importance: 'core', synonyms: [] },
      { concept: 'keyboard navigation', importance: 'core', synonyms: [] },
      { concept: 'aria usage', importance: 'supporting', synonyms: [] },
      { concept: 'contrast', importance: 'supporting', synonyms: [] },
      { concept: 'screen reader testing', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'semantic HTML': 'Use correct tags for structure and meaning.',
      'keyboard navigation': 'Ensure focus order and visible focus.',
      'aria usage': 'Add ARIA labels only when necessary.',
      'contrast': 'Meet color contrast guidelines.',
      'screen reader testing': 'Test with screen readers or accessibility tools.'
    }
  },
  {
    questionId: 'be-rest-005',
    text: 'What are the key principles of designing a RESTful API?',
    skillTags: ['api', 'rest', 'backend'],
    role: ['backend', 'fullstack'],
    difficulty: 'easy',
    category: 'skill',
    expectedConcepts: [
      { concept: 'resource-based URLs', importance: 'core', synonyms: [] },
      { concept: 'http methods', importance: 'core', synonyms: [] },
      { concept: 'statelessness', importance: 'supporting', synonyms: [] },
      { concept: 'status codes', importance: 'supporting', synonyms: [] },
      { concept: 'versioning', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'resource-based URLs': 'Use nouns and consistent URL patterns.',
      'http methods': 'Use GET/POST/PUT/PATCH/DELETE correctly.',
      'status codes': 'Return appropriate HTTP status codes.',
      'statelessness': 'Each request contains all necessary context.',
      'versioning': 'Plan for API versioning strategy.'
    }
  },
  {
    questionId: 'be-database-index-006',
    text: 'Explain how database indexing works and when it can hurt performance.',
    skillTags: ['database', 'indexing', 'backend'],
    role: ['backend', 'data'],
    difficulty: 'medium',
    category: 'skill',
    expectedConcepts: [
      { concept: 'index structure', importance: 'core', synonyms: [] },
      { concept: 'read vs write tradeoff', importance: 'core', synonyms: [] },
      { concept: 'selectivity', importance: 'supporting', synonyms: [] },
      { concept: 'query planning', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'index structure': 'Mention B-trees or hash indexes.',
      'read vs write tradeoff': 'Indexes speed reads but slow writes.',
      'selectivity': 'High selectivity indexes are more valuable.',
      'query planning': 'Explain how the query planner chooses indexes.'
    }
  },
  {
    questionId: 'be-caching-007',
    text: 'Where would you add caching in a backend system and why?',
    skillTags: ['caching', 'backend', 'performance'],
    role: ['backend', 'fullstack'],
    difficulty: 'medium',
    category: 'skill',
    expectedConcepts: [
      { concept: 'cache layers', importance: 'core', synonyms: [] },
      { concept: 'cache invalidation', importance: 'core', synonyms: [] },
      { concept: 'read-heavy workloads', importance: 'supporting', synonyms: [] },
      { concept: 'ttl strategy', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'cache layers': 'In-memory, distributed cache, or CDN.',
      'cache invalidation': 'Describe strategies like write-through or TTL.',
      'read-heavy workloads': 'Caching benefits frequent reads.',
      'ttl strategy': 'Explain how expiration works.'
    }
  },
  {
    questionId: 'be-auth-008',
    text: 'How do you secure APIs and manage authentication?',
    skillTags: ['security', 'authentication', 'backend'],
    role: ['backend', 'fullstack'],
    difficulty: 'medium',
    category: 'skill',
    expectedConcepts: [
      { concept: 'token-based auth', importance: 'core', synonyms: [] },
      { concept: 'authorization', importance: 'core', synonyms: [] },
      { concept: 'secure storage', importance: 'supporting', synonyms: [] },
      { concept: 'rate limiting', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'token-based auth': 'JWT or opaque tokens.',
      'authorization': 'Role or scope-based access control.',
      'secure storage': 'Store secrets securely and hash passwords.',
      'rate limiting': 'Protect against abuse.'
    }
  },
  {
    questionId: 'project-impact-009',
    text: 'Pick a recent project from your resume. What problem did it solve and how did you measure success?',
    skillTags: ['project', 'impact', 'metrics'],
    role: ['frontend', 'backend', 'fullstack'],
    difficulty: 'easy',
    category: 'project',
    expectedConcepts: [
      { concept: 'problem statement', importance: 'core', synonyms: [] },
      { concept: 'solution approach', importance: 'core', synonyms: [] },
      { concept: 'metrics', importance: 'supporting', synonyms: [] },
      { concept: 'stakeholders', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'problem statement': 'Define the initial pain point or goal.',
      'solution approach': 'Describe implementation or design steps.',
      'metrics': 'Explain measurable outcomes or KPIs.',
      'stakeholders': 'Mention who benefited from the solution.'
    }
  },
  {
    questionId: 'project-tradeoffs-010',
    text: 'Describe a tradeoff you made in a project and why you chose that approach.',
    skillTags: ['project', 'tradeoffs', 'decision'],
    role: ['frontend', 'backend', 'fullstack'],
    difficulty: 'medium',
    category: 'project',
    expectedConcepts: [
      { concept: 'constraints', importance: 'core', synonyms: [] },
      { concept: 'decision rationale', importance: 'core', synonyms: [] },
      { concept: 'alternatives', importance: 'supporting', synonyms: [] },
      { concept: 'impact', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'constraints': 'Time, scope, or technical limits.',
      'alternatives': 'Other options you considered.',
      'decision rationale': 'Why the chosen option fit best.',
      'impact': 'Effect on the outcome or product.'
    }
  },
  {
    questionId: 'project-debug-011',
    text: 'Tell me about a production issue you resolved. How did you investigate and fix it?',
    skillTags: ['project', 'debugging', 'reliability'],
    role: ['frontend', 'backend', 'fullstack'],
    difficulty: 'medium',
    category: 'project',
    expectedConcepts: [
      { concept: 'root cause analysis', importance: 'core', synonyms: [] },
      { concept: 'fix validation', importance: 'core', synonyms: [] },
      { concept: 'issue detection', importance: 'supporting', synonyms: [] },
      { concept: 'prevention', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'issue detection': 'How you became aware of the issue.',
      'root cause analysis': 'Steps to find the root cause.',
      'fix validation': 'Testing or monitoring after the fix.',
      'prevention': 'Actions to prevent recurrence.'
    }
  },
  {
    questionId: 'hr-conflict-012',
    text: 'Describe a time you disagreed with a teammate. How did you resolve it?',
    skillTags: ['communication', 'conflict'],
    role: ['hr', 'any'],
    difficulty: 'easy',
    category: 'hr',
    expectedConcepts: [
      { concept: 'listening', importance: 'core', synonyms: [] },
      { concept: 'collaboration', importance: 'core', synonyms: [] },
      { concept: 'resolution', importance: 'supporting', synonyms: [] },
      { concept: 'professional tone', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'listening': 'Show you listened and understood the other side.',
      'collaboration': 'Focus on shared goals.',
      'resolution': 'Explain the agreed outcome.',
      'professional tone': 'Keep it respectful and constructive.'
    }
  },
  {
    questionId: 'hr-pressure-013',
    text: 'How do you prioritize tasks when everything feels urgent?',
    skillTags: ['prioritization', 'time management'],
    role: ['hr', 'any'],
    difficulty: 'easy',
    category: 'hr',
    expectedConcepts: [
      { concept: 'urgency vs importance', importance: 'core', synonyms: [] },
      { concept: 'planning', importance: 'core', synonyms: [] },
      { concept: 'communication', importance: 'supporting', synonyms: [] },
      { concept: 'tradeoffs', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'urgency vs importance': 'Use a prioritization framework.',
      'communication': 'Align with stakeholders on priorities.',
      'tradeoffs': 'Acknowledge what gets deprioritized.',
      'planning': 'Use a plan or checklist.'
    }
  },
  {
    questionId: 'be-system-design-014',
    text: 'How would you design a scalable URL shortener service?',
    skillTags: ['system design', 'scalability'],
    role: ['backend', 'fullstack'],
    difficulty: 'hard',
    category: 'skill',
    expectedConcepts: [
      { concept: 'data model', importance: 'core', synonyms: [] },
      { concept: 'hashing', importance: 'core', synonyms: [] },
      { concept: 'scalability', importance: 'core', synonyms: [] },
      { concept: 'caching', importance: 'supporting', synonyms: [] },
      { concept: 'rate limiting', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'data model': 'Short code mapping to full URL.',
      'hashing': 'Base62 or hashing strategy.',
      'scalability': 'Sharding or partitioning.',
      'caching': 'Cache hot URLs.',
      'rate limiting': 'Prevent abuse.'
    }
  },
  {
    questionId: 'fe-state-mgmt-015',
    text: 'When would you use local state vs a global store in a frontend app?',
    skillTags: ['state management', 'frontend'],
    role: ['frontend', 'fullstack'],
    difficulty: 'medium',
    category: 'skill',
    expectedConcepts: [
      { concept: 'scope of state', importance: 'core', synonyms: [] },
      { concept: 'state ownership', importance: 'core', synonyms: [] },
      { concept: 'prop drilling', importance: 'supporting', synonyms: [] },
      { concept: 'performance', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'scope of state': 'Who needs the data.',
      'prop drilling': 'Avoid excessive prop passing.',
      'state ownership': 'Single source of truth.',
      'performance': 'Global state can cause re-renders.'
    }
  },
  {
    questionId: 'hr-leadership-016',
    text: 'Tell me about a time you took initiative without being asked.',
    skillTags: ['initiative', 'ownership'],
    role: ['hr', 'any'],
    difficulty: 'medium',
    category: 'hr',
    expectedConcepts: [
      { concept: 'initiative', importance: 'core', synonyms: [] },
      { concept: 'impact', importance: 'core', synonyms: [] },
      { concept: 'communication', importance: 'supporting', synonyms: [] },
      { concept: 'reflection', importance: 'optional', synonyms: [] }
    ],
    conceptDescriptions: {
      'initiative': 'Proactive action you took.',
      'impact': 'Results achieved.',
      'communication': 'How you aligned with others.',
      'reflection': 'What you learned.'
    }
  }
];
