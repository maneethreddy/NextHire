# NextHire AI Coding Guidelines

## Architecture Overview
NextHire is a React SPA for AI-powered mock interviews with glassmorphism UI. Core flow: Dashboard → Config Modals → Loading → Interview Session → Feedback. State managed via `currentView` in `App.jsx` with AnimatePresence for transitions.

## Component Patterns
- **Modals**: Use `motion.div` with backdrop blur for glass effects. Position fixed with `z-50`. Example: `InterviewDetailsModal.jsx` handles config with controlled state.
- **Interview Components**: `ProfessionalInterviewSession.jsx` uses flex layout (sidebar, main, controls). Timer via `useEffect` setInterval. Recording state toggles UI.
- **Styling**: Tailwind with custom glass classes in `index.css`. Neon red (#FF1744) accents. Framer Motion for all animations.

## Key Conventions
- **State Management**: Local `useState` in App for view transitions. Props drilling for config (e.g., `interviewConfig`).
- **Icons**: Lucide React exclusively. Import specific icons: `import { Mic, Video } from 'lucide-react'`.
- **3D Elements**: Use `@react-three/fiber` and `@react-three/drei` in `src/components/3d/`. Example: `Scene3D.jsx` for animated sphere.
- **File Structure**: Components in `src/components/` subfolders (interview/, modals/, layout/). Pages in `src/pages/`.

## Development Workflow
- **Start**: `npm run dev` (Vite dev server on :5173)
- **Build**: `npm run build` (outputs to `dist/`)
- **Lint**: `npm run lint` (ESLint with React hooks rules)
- **No Tests**: Currently no test suite; add Jest/Vitest if implementing.

## Common Patterns
- **Modal Flow**: Config → Prerequisite → Loading → Session. Use `onClose`/`onStart` callbacks.
- **Timer Logic**: `useEffect(() => { const timer = setInterval(...); return () => clearInterval(timer); }, [])`
- **Animation Variants**: Define in component or import from utils. Use `AnimatePresence` for enter/exit.
- **Color Scheme**: Gray-800/900 backgrounds, white text, teal (#14B8A6) for active states.

## Integration Points
- **Future Backend**: Mock data in App.jsx (e.g., `mockQuestions`, `mockFeedback`). Replace with API calls.
- **Media Controls**: Camera/mic toggles in `InterviewControls.jsx`. No actual WebRTC yet.
- **Analytics**: Metrics display in sidebar; IRI Score calculation placeholder.

Reference: `README.md` for setup, `App.jsx` for state flow, `ProfessionalInterviewSession.jsx` for interview UI.</content>
<parameter name="filePath">/Users/maneethreddy/Documents/Nexthire/.github/copilot-instructions.md