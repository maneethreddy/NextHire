export const QUESTION_BANK = [
  {
    questionId: 'fe-react-hooks-001',
    text: 'Explain how React hooks manage state and side effects. When would you use useEffect?',
    skillTags: ['react', 'hooks', 'state'],
    role: ['frontend', 'fullstack'],
    difficulty: 'easy',
    category: 'skill',
    expectedConcepts: ['stateful logic reuse', 'useState basics', 'side effects', 'dependency array', 'cleanup'],
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
    expectedConcepts: ['one-dimensional vs two-dimensional', 'alignment control', 'layout intent', 'browser support'],
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
    expectedConcepts: ['memoization', 'code splitting', 'avoid re-renders', 'profiling', 'lazy loading'],
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
    expectedConcepts: ['semantic HTML', 'keyboard navigation', 'aria usage', 'contrast', 'screen reader testing'],
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
    expectedConcepts: ['resource-based URLs', 'http methods', 'status codes', 'statelessness', 'versioning'],
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
    expectedConcepts: ['index structure', 'read vs write tradeoff', 'selectivity', 'query planning'],
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
    expectedConcepts: ['cache layers', 'cache invalidation', 'read-heavy workloads', 'ttl strategy'],
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
    expectedConcepts: ['token-based auth', 'authorization', 'secure storage', 'rate limiting'],
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
    expectedConcepts: ['problem statement', 'solution approach', 'metrics', 'stakeholders'],
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
    expectedConcepts: ['constraints', 'alternatives', 'decision rationale', 'impact'],
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
    expectedConcepts: ['issue detection', 'root cause analysis', 'fix validation', 'prevention'],
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
    expectedConcepts: ['listening', 'collaboration', 'resolution', 'professional tone'],
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
    expectedConcepts: ['urgency vs importance', 'communication', 'tradeoffs', 'planning'],
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
    expectedConcepts: ['data model', 'hashing', 'scalability', 'caching', 'rate limiting'],
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
    expectedConcepts: ['scope of state', 'prop drilling', 'state ownership', 'performance'],
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
    expectedConcepts: ['initiative', 'impact', 'communication', 'reflection'],
    conceptDescriptions: {
      'initiative': 'Proactive action you took.',
      'impact': 'Results achieved.',
      'communication': 'How you aligned with others.',
      'reflection': 'What you learned.'
    }
  }
];
