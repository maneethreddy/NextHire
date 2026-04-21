# NextHire — AI-Powered Interview Coach

> An end-to-end AI interview preparation platform built with React, Google Gemini AI, and Firebase — giving candidates real-time, research-grade feedback on their answers.

---

## Table of Contents

1. [Overview](#overview)  
2. [Tech Stack](#tech-stack)  
3. [Architecture](#architecture)  
4. [Features](#features)  
5. [Pages & Routes](#pages--routes)  
6. [AI Evaluation Engine](#ai-evaluation-engine)  
7. [Scoring Metrics](#scoring-metrics)  
8. [Firebase Integration](#firebase-integration)  
9. [PDF Report Generation](#pdf-report-generation)  
10. [Practice Mode](#practice-mode)  
11. [Running Locally](#running-locally)  
12. [Environment Variables](#environment-variables)  
13. [Project Structure](#project-structure)

---

## Overview

NextHire is a full-stack AI interview coaching application that simulates real technical interview sessions. Candidates answer aloud or in writing, and the platform evaluates their responses using a research-inspired multi-dimensional scoring engine powered by **Google Gemini AI** (`gemini-2.0-flash` & `text-embedding-004`).

The system is designed to provide feedback that goes far beyond a simple "keyword match" approach — it measures **semantic relevance**, **response timing**, **terminology correctness**, **answer conciseness**, and **topic focus drift** across every single answer.

---

## Tech Stack

| Layer           | Technology                                           |
|:----------------|:-----------------------------------------------------|
| **Frontend**    | React 19, Vite 7, React Router DOM 7                 |
| **Styling**     | Vanilla CSS, Tailwind utility classes, Framer Motion |
| **3D / Visual** | Three.js, `@react-three/fiber`, `@react-three/drei`  |
| **AI Engine**   | Google Generative AI SDK (`@google/generative-ai`)   |
| **Auth**        | Firebase Authentication (Google Sign-In)             |
| **Database**    | Google Cloud Firestore (NoSQL, realtime)             |
| **PDF Export**  | jsPDF                                                |
| **Icons**       | Lucide React                                         |

---

## Architecture

```
NextHire/
├── src/
│   ├── pages/           # All page-level components
│   ├── components/      # Shared reusable UI components
│   ├── context/         # React Context (AuthContext)
│   ├── services/        # Firebase initialization
│   ├── utils/           # Core business logic
│   │   ├── evaluation.js      # AI scoring engine (the heart of the app)
│   │   ├── geminiQuestions.js # Gemini-powered question generation
│   │   ├── storage.js         # All Firestore CRUD operations
│   │   ├── pdf.js             # PDF report generator
│   │   ├── questionBank.js    # Static curated question bank
│   │   └── questionGenerator.js
│   └── styles/
└── public/
```

Data flows strictly downward: Pages → Utils → Firebase / Gemini API. No circular dependencies.

---

## Features

### 🧠 AI Interview Simulation
- Realistic interview session with a talking AI interviewer avatar (video + speech synthesis)
- Questions auto-read aloud using the Web Speech API (TTS)
- Voice answer recording via `webkitSpeechRecognition` — transcripts captured in real time
- Configurable session duration, difficulty, experience level, and job role

### 📊 Multi-Dimensional AI Scoring
Five research-grade metrics computed per question using Gemini embeddings (see [Scoring Metrics](#scoring-metrics)):
- **SR** — Semantic Relevance
- **CLT** — Cognitive Latency Tolerance
- **TAI** — Terminology Alignment Index
- **ACE** — Answer Compression Efficiency
- **EDD** — Expectation Drift Detection
- **IRI** — Interview Robustness Index (session-level consistency)

### 📄 PDF Report Export
Full downloadable PDF with:
- Gradient cover page with score donut and performance label
- Session-level metric bar charts
- Side-by-side Strengths & Areas for Improvement panels
- Colour-coded per-question cards with AI feedback and answer preview

### ⭐ Bookmark & Practice Mode
- Manually bookmark any question after an interview using the ⭐ toggle
- Bookmarks appear in the dedicated **Bookmarks Hub** (accessible from the navbar)
- **Practice Mode** replays bookmarked questions one-by-one with live AI re-evaluation
- Voice recording supported in Practice Mode too
- One-click unbookmark directly from the Bookmarks Hub

### 🔐 Firebase Authentication
- Sign in exclusively with Google (OAuth 2.0 via Firebase)
- All user data is scoped under `users/{userId}/...` in Firestore — completely private per user

### ☁️ Cloud Data Persistence
All data stored in Firestore — no localStorage:
- `users/{uid}/interviewSessions` — full session results, scores, answers
- `users/{uid}/bookmarks` — per-question bookmarks
- Async reads/writes with optimistic UI updates where appropriate

---

## Pages & Routes

| Route              | Page             | Description                                      |
|:-------------------|:-----------------|:-------------------------------------------------|
| `/`                | `HomePage`       | Landing page with features, how-it-works, nav    |
| `/login`           | `LoginPage`      | Google Sign-In authentication                    |
| `/signup`          | `SignupPage`     | Account creation (also redirects to Google auth) |
| `/configure`       | `ConfigurePage`  | Set role, difficulty, experience level, resume   |
| `/interview`       | `InterviewPage`  | Live interview session with AI avatar            |
| `/feedback`        | `FeedbackPage`   | Full evaluation results — scores, radar chart    |
| `/history`         | `HistoryPage`    | Bookmarks Hub — manage saved questions           |
| `/review/:id`      | `ReviewPage`     | Detailed session review from Firestore           |
| `/practice`        | `PracticePage`   | Bookmarked question practice with live scoring   |

---

## AI Evaluation Engine

Located in `src/utils/evaluation.js` (757 lines).

### Primary Path — Gemini Embeddings
1. For each answer, the engine fetches a **768-dimensional vector embedding** using `text-embedding-004`
2. It computes **cosine similarity** against embeddings of expected concepts and the ideal answer
3. Each concept is tagged with an importance weight: `core (0.6)`, `supporting (0.25)`, `optional (0.15)`
4. The engine calls `gemini-2.0-flash` for a structured JSON evaluation including: `score10`, `feedback`, `correctnessLabel`, `missingConcepts`, and per-index scores

### Fallback Path — Bag-of-Words
If the Gemini API is unavailable or times out (15s timeout):
- Falls back to **TF-IDF-style bag-of-words** cosine similarity using stemmed tokens
- Jaccard similarity used for concept coverage
- All five indices still computed deterministically

### Role-Aware Weights
The engine adjusts relevance vs coverage weights based on the target role:

| Role       | Relevance Weight | Coverage Weight |
|:-----------|:-----------------|:----------------|
| Frontend   | 0.45             | 0.55            |
| Backend    | 0.40             | 0.60            |
| HR/General | 0.55             | 0.45            |

---

## Scoring Metrics

### 1. Semantic Relevance (SR)
Cosine similarity between the candidate's answer embedding and the ideal answer embedding.
```
SR(A, B) = (A⃗ · B⃗) / (‖A⃗‖ × ‖B⃗‖)
```
- **≥ 0.85** → Highly relevant
- **0.60–0.85** → Partially relevant
- **< 0.60** → Off-topic

### 2. Cognitive Latency Tolerance (CLT)
Measures whether the response time fell within an optimal cognitive window.
```
CLT = 1 − |Tᵣ − Tₒ| / Tₘₐₓ
```
- **≥ 0.80** → Optimal pacing
- **< 0.50** → Too rushed or too slow

### 3. Terminology Alignment Index (TAI)
Ratio of domain-specific keywords used correctly vs expected.
```
TAI = Σ(matchᵢ × contextScoreᵢ) / |Ke|
```
- **≥ 0.75** → Strong technical vocabulary

### 4. Answer Compression Efficiency (ACE)
Information density — penalizes both verbose and overly terse answers.
```
ACE_norm = ACEcandidate / ACEideal
```
- **0.85–1.15** → Perfectly balanced

### 5. Expectation Drift Detection (EDD)
Detects if the answer loses focus as it progresses by measuring SR drop across sentence segments.
```
EDD = (1/N) × Σ |SRᵢ − SRᵢ₋₁|
```
- **≤ 0.10** → Fully focused
- **> 0.25** → Significant topic drift

### Final Score
```
Score = (0.35 × SR) + (0.10 × CLT) + (0.20 × TAI) + (0.15 × ACE) + (0.20 × (1 − EDD))
```
Scaled to **0–100** for display.

---

## Firebase Integration

### Authentication
- Provider: **Google OAuth** via `signInWithPopup`
- User state exposed globally via `AuthContext`
- User profile: `{ uid, name, email, photoURL }`

### Firestore Schema
```
users/
  {userId}/
    interviewSessions/
      {sessionId}/
        config           — role, difficulty, level, numQuestions
        questions[]      — generated question objects
        answers[]        — transcribed text + timing data
        overallScore     — 0–100
        questionResults[]— per-question evaluations
        sessionIndices   — { clt, tai, ace, edd, iri }
        summary          — { missingConcepts[] }
        startedAt        — ISO timestamp
        completedAt      — ISO timestamp

    bookmarks/
      {questionId}/
        questionText     — string
        score            — last recorded score
        isBookmarked     — boolean
```

### Storage Functions (`src/utils/storage.js`)
All functions are `async` and scoped to `userId`:

| Function                  | Description                              |
|:--------------------------|:-----------------------------------------|
| `saveInterviewSession()`  | Create initial session document          |
| `updateInterviewSession()`| Enrich session with scores after eval    |
| `getAllInterviewSessions()`| Fetch all sessions, ordered by date     |
| `getInterviewSession()`   | Fetch a single session by ID             |
| `deleteInterviewSession()`| Hard delete a session document           |
| `toggleBookmark()`        | Set/unset isBookmarked on a question     |
| `getBookmarks()`          | Fetch all bookmarks for a user           |
| `getBookmark()`           | Fetch a single bookmark for init state   |
| `updateBookmarkScore()`   | Update score after a practice attempt    |

---

## PDF Report Generation

Located in `src/utils/pdf.js`. Uses `jsPDF` to produce a multi-page A4 document:

### Page 1 — Cover
- Full dark gradient background (pink → black)
- Centered white frosted card with role, date, score donut ring
- 3 stat chips: Questions completed, Avg Score, Performance Label
- Pink footer brand bar

### Page 2+ — Analysis
- White header band with role and "NextHire" brand
- Light lavender background for easy reading
- **Performance Metrics** — progress bar rows per index (CLT, TAI, ACE, EDD, IRI)
- **Strengths & Weaknesses** — side-by-side green/red boxes
- **Per-Question Cards** — colour-coded header (green/yellow/red), mini index badges, answer quote, AI feedback

---

## Practice Mode

`/practice` — `PracticePage.jsx`

1. Loads all bookmarked questions for the current user from Firestore
2. Presents them one-by-one with a progress bar
3. User can answer by **typing** or via **voice recording** (mic button)
4. Each answer is re-evaluated live using the full AI scoring pipeline
5. Score is updated in Firestore for that bookmark
6. If score improves to ≥ 70, the question is flagged as "removable"
7. Final summary shows average practice score

---

## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/maneethreddy/NextHire.git
cd NextHire

# 2. Install dependencies
npm install

# 3. Add your environment variables
cp .env.example .env
# (Fill in your keys — see below)

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the project root with the following:

```env
# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

> [!IMPORTANT]
> All Firebase variables come from your Firebase Console under **Project Settings → Your Apps → Web App**. The Gemini API key comes from [Google AI Studio](https://aistudio.google.com/).

---

## Project Structure

```
NextHire/
├── public/
├── src/
│   ├── assets/               # Logo and static assets
│   ├── components/
│   │   ├── 3d/               # SplineOrb 3D background
│   │   ├── BookmarkToggle.jsx
│   │   └── RadarChart.jsx    # Radar chart for index visualization
│   ├── context/
│   │   └── AuthContext.jsx   # Global auth state provider
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── ConfigurePage.jsx
│   │   ├── InterviewPage.jsx
│   │   ├── FeedbackPage.jsx
│   │   ├── HistoryPage.jsx   # Bookmarks Hub
│   │   ├── ReviewPage.jsx
│   │   └── PracticePage.jsx
│   ├── services/
│   │   └── firebase.js       # Firebase app + Firestore init
│   ├── styles/
│   ├── utils/
│   │   ├── evaluation.js     # Gemini AI scoring engine
│   │   ├── geminiQuestions.js
│   │   ├── geminiModels.js
│   │   ├── geminiResume.js
│   │   ├── pdf.js
│   │   ├── questionBank.js
│   │   ├── questionGenerator.js
│   │   ├── configure.js
│   │   └── storage.js
│   ├── App.jsx               # Route definitions
│   ├── main.jsx
│   └── index.css             # Global design system
├── .env
├── package.json
├── vite.config.js
├── AI_Evaluation_Metrics.md
├── Architecture_Document.md
└── Project_Mechanics_and_Calculations.md
```

---

*Built with ❤️ using React + Gemini AI + Firebase*
