# NextHire — UML Architecture Diagrams Explanation

This document provides a detailed explanation of each UML diagram used to model the **NextHire AI Interview Platform**.

---

## 1. Use Case Diagram

**Type:** Behavioral

### Purpose

The Use Case Diagram identifies the primary **actors** (users) who interact with the system and the key **use cases** (functionalities) they can perform. It defines the system boundary and shows what the system does from the user's perspective.

### Actors

| Actor | Description |
|-------|-------------|
| **Candidate (🎓)** | A job applicant who uses the platform to practice AI-driven interviews. |
| **System Admin (🛡️)** | An administrator responsible for managing AI prompts and system configuration. |

### Use Cases

| Use Case | Description |
|----------|-------------|
| **Authenticate / Login** | Both actors must authenticate before accessing the system. |
| **Upload Resume** | The candidate uploads a PDF resume for AI parsing. |
| **Parse Resume via AI** | The system extracts text, skills, and experience from the uploaded resume. |
| **Generate Questions via Gemini API** | Based on parsed resume data, the AI generates personalized interview questions. |
| **Conduct Video Interview** | The candidate participates in a live video interview with an AI interviewer. |
| **Evaluate Responses** | The AI evaluates each answer and assigns a score. |
| **View Feedback & Score** | The candidate reviews their performance summary, score, and improvement suggestions. |
| **Manage AI Prompts** | The admin configures and fine-tunes the AI prompt templates. |

### Relationships

- **Include:** `Upload Resume` includes `Parse Resume via AI`, which in turn includes `Generate Questions via Gemini API`. This means uploading a resume automatically triggers parsing and question generation.
- **Include:** `Conduct Video Interview` includes `Evaluate Responses`, which includes `View Feedback & Score`. Completing an interview automatically triggers evaluation and feedback display.

---

## 2. Class Diagram

**Type:** Structural

### Purpose

The Class Diagram represents the **static structure** of the system by showing the main classes, their attributes, methods, and the relationships between them. It serves as the blueprint for the object-oriented design.

### Classes

| Class | Key Attributes | Key Methods | Role |
|-------|---------------|-------------|------|
| **User** | `userId`, `name`, `email`, `role` | `login()`, `logout()`, `getProfile()` | Base class for all users in the system. |
| **Candidate** | `resumeUrl`, `targetRole`, `yearsExperience` | `uploadResume()`, `startInterview()`, `viewFeedback()` | Inherits from User. Represents a job applicant. |
| **InterviewSession** | `sessionId`, `startTime`, `endTime`, `status`, `totalScore` | `startSession()`, `endSession()`, `saveSession()` | Represents a single interview attempt. |
| **Question** | `questionId`, `text`, `type`, `difficulty`, `expectedKeywords`, `category` | — | A single interview question with evaluation criteria. |
| **AIEngine** | `apiKey`, `apiVersion`, `modelName` | `generateQuestions()`, `evaluateAnswer()`, `generateFeedback()` | Handles all AI interactions with the Gemini API. |
| **ResumeParser** | `parserId` | `extractText()`, `identifySkills()`, `identifyExperience()` | Extracts structured data from resume PDFs. |
| **Feedback** | `feedbackId`, `score`, `summary`, `strengths`, `improvements` | — | Stores the evaluation result and improvement suggestions. |

### Relationships

| Relationship | Description |
|-------------|-------------|
| `User ◁— Candidate` | **Inheritance** — Candidate is a specialized type of User. |
| `Candidate 1 — many InterviewSession` | A candidate can have many interview sessions. |
| `InterviewSession 1 *— many Question` | **Composition** — Each session contains multiple questions. |
| `InterviewSession 1 *— 1 Feedback` | **Composition** — Each session produces exactly one feedback report. |
| `InterviewSession ‥> AIEngine` | **Dependency** — The session uses the AI engine for evaluation. |
| `Candidate ‥> ResumeParser` | **Dependency** — The candidate uses the resume parser. |
| `AIEngine ‥> Feedback` | **Dependency** — The AI engine produces the feedback. |

---

## 3. Data Flow Diagram (DFD)

**Type:** Data

### Purpose

The DFD shows how **data flows** through the system — from external entities, through processing stages, and into data stores. It highlights the transformations applied to data at each step.

### Processes

| Process | Description |
|---------|-------------|
| **1.0 Resume Parser** | Receives the uploaded PDF, extracts text and skills, and stores the result. |
| **2.0 AI Question Generator** | Takes resume data, constructs a prompt, sends it to Gemini AI, and stores the generated questions. |
| **3.0 Interview Engine** | Presents questions to the candidate, records video/audio answers, stores media, and forwards transcripts. |
| **4.0 AI Evaluator** | Sends answer transcripts to Gemini AI for scoring, receives feedback, and generates the final report. |

### Data Stores

| Store | Contents |
|-------|----------|
| **DS1: Resume Store** | Extracted text, skills, and experience from resumes. |
| **DS2: Question Bank** | AI-generated interview questions in structured format. |
| **DS3: Media Storage** | Recorded video/audio responses from candidates. |
| **DS4: Feedback Store** | Evaluation scores, feedback summaries, and final reports. |

### External Entities

| Entity | Interaction |
|--------|-------------|
| **Candidate** | Uploads resume PDF, provides video/audio answers, receives feedback & score. |
| **Gemini AI API** | Receives prompts, returns generated questions and evaluation scores. |

### Data Flow Summary

```
Candidate → (Resume PDF) → Resume Parser → (Extracted Data) → AI Question Generator
     → (Prompt) → Gemini AI → (Questions JSON) → Question Bank
     → (Questions) → Interview Engine ← (Video/Audio Answers) ← Candidate
     → (Transcripts) → AI Evaluator → (Evaluation Prompt) → Gemini AI
     → (Scores & Feedback) → Feedback Store → (Final Report) → Candidate
```

---

## 4. Component Diagram

**Type:** Structural

### Purpose

The Component Diagram shows the **high-level architectural components** of the system and their interconnections. It maps the logical architecture to physical deployment tiers.

### Tiers

| Tier | Components | Description |
|------|-----------|-------------|
| **Client Tier** | React + Vite Web App | Single-page application running in the user's browser. |
| **API Gateway Tier** | Serverless API Gateway | Routes incoming HTTP requests to the appropriate backend function. |
| **Serverless Compute Tier** | Resume Parsing, Question Generation, Video Processing, Evaluation, Auth Functions | Individual Lambda/Cloud Functions for each backend capability. |
| **Data Tier** | NoSQL Database, Cloud Storage Bucket | Persistent storage for structured data and media files. |
| **External AI Services** | Google Gemini AI | Third-party AI service for question generation and answer evaluation. |

### API Endpoints

| Endpoint | Routed To | Purpose |
|----------|-----------|---------|
| `/api/upload` | Resume Parsing Function | Handles resume file uploads and text extraction. |
| `/api/generate` | Question Generation Function | Triggers AI-based question generation. |
| `/api/video` | Video Processing Function | Manages video recording uploads. |
| `/api/evaluate` | Evaluation Function | Sends transcripts for AI scoring. |
| `/api/auth` | Auth Function | Handles user authentication. |

---

## 5. Sequence Diagram

**Type:** Behavioral

### Purpose

The Sequence Diagram illustrates the **chronological order of interactions** between system participants during a complete interview workflow. It shows the exact message flow and timing.

### Participants

| Participant | Role |
|-------------|------|
| **Candidate** | The end user interacting with the platform. |
| **Frontend (React)** | The client-side web application. |
| **Auth Service** | Handles JWT-based authentication. |
| **API Gateway / Lambda** | Backend serverless processing. |
| **Cloud Storage** | Stores resume PDFs and video recordings. |
| **Gemini AI Service** | External AI for question generation and evaluation. |
| **NoSQL Database** | Persists questions, sessions, and evaluations. |

### Flow Sequence

| Step | From → To | Action |
|------|-----------|--------|
| 1 | Candidate → Frontend | Open NextHire & Login |
| 2 | Frontend → Auth Service | Authenticate (JWT) |
| 3 | Auth Service → Frontend | Token Valid ✅ |
| 4 | Candidate → Frontend | Upload Resume PDF |
| 5 | Frontend → API Gateway | `POST /api/upload` (PDF file) |
| 6 | API Gateway → Cloud Storage | Store Resume PDF |
| 7 | Cloud Storage → API Gateway | Return File URL |
| 8 | API Gateway → API Gateway | Extract text from PDF |
| 9 | API Gateway → Gemini AI | `POST generate_content` (resume text + prompt) |
| 10 | Gemini AI → API Gateway | Generated Questions JSON |
| 11 | API Gateway → Database | Save questions |
| 12 | API Gateway → Frontend | `200 OK` + Questions |
| 13 | Frontend → Candidate | Display Interview Questions |
| 14 | Candidate → Frontend | Start Video Interview |
| 15 | Frontend → API Gateway | `GET /api/signed-url` |
| 16 | API Gateway → Frontend | Pre-signed Upload URL |
| 17 | Candidate → Frontend | Submit Answer (Video) |
| 18 | Frontend → Cloud Storage | Upload video via signed URL |
| 19 | Cloud Storage → Frontend | Upload Complete |
| 20 | Frontend → API Gateway | `POST /api/evaluate` (transcript) |
| 21 | API Gateway → Gemini AI | Evaluate answer |
| 22 | Gemini AI → API Gateway | Score + Feedback |
| 23 | API Gateway → Database | Save evaluation |
| 24 | API Gateway → Frontend | Feedback JSON |
| 25 | Frontend → Candidate | Show Score & Feedback |

---

## 6. Deployment Diagram

**Type:** Infrastructure

### Purpose

The Deployment Diagram maps **software components to physical/cloud infrastructure**. It shows where each part of the system runs and how they communicate over the network.

### Nodes

| Node | Environment | Components Hosted |
|------|-------------|-------------------|
| **Candidate Device** | Local machine | Web Browser, Vite/React SPA Build |
| **CDN (CloudFront / Vercel)** | Edge Network | Static assets (HTML, CSS, JS, images) |
| **API Gateway** | Cloud Compute | Request routing and throttling |
| **Lambda — Node.js Runtime** | Cloud Compute | Resume parsing, data CRUD operations |
| **Lambda — Python Runtime** | Cloud Compute | AI inference and evaluation tasks |
| **DynamoDB / Firestore** | Cloud Storage | Structured data (users, sessions, questions, feedback) |
| **S3 / GCS Bucket** | Cloud Storage | Binary files (resume PDFs, video recordings) |
| **Gemini API Endpoint** | External Provider | AI model inference |

### Communication

| From | To | Protocol |
|------|----|----------|
| Browser → CDN | HTTPS | Static asset delivery |
| Browser → API Gateway | HTTPS / REST | API calls |
| API Gateway → Lambda | Event Trigger | Function invocation |
| Lambda (Node.js) → DynamoDB | SDK (Read/Write) | Data persistence |
| Lambda (Node.js) → S3 | SDK (Upload/Download) | File storage |
| Lambda (Python) → Gemini API | HTTPS (AI Inference) | AI model calls |

---

## 7. Activity Diagram

**Type:** Behavioral

### Purpose

The Activity Diagram models the **complete workflow** of a candidate using the NextHire platform, from login to receiving feedback. It includes decision points, loops, and error-handling paths.

### Workflow Steps

| Step | Activity | Description |
|------|----------|-------------|
| 1 | **Candidate Opens NextHire** | The user navigates to the application. |
| 2 | **Authenticated?** | Decision point — checks if the user is logged in. |
| 3 | **Login / Sign Up** | If not authenticated, the user must log in or create an account. |
| 4 | **Navigate to Configure Interview** | The user accesses the interview configuration page. |
| 5 | **Upload Resume PDF** | The candidate uploads their resume. |
| 6 | **Resume Parser Extracts Text** | The system extracts raw text from the PDF. |
| 7 | **AI Engine Identifies Skills & Experience** | AI analyzes the extracted text for relevant skills. |
| 8 | **Construct Prompt for Gemini API** | A tailored prompt is built from the resume data. |
| 9 | **Gemini API Generates Questions** | The AI generates personalized interview questions. |
| 10 | **Questions Generated Successfully?** | Decision point — checks for API success. |
| 11 | **Retry with Fallback Model** | If the API fails, a fallback model is used. |
| 12 | **Display Questions to Candidate** | Successfully generated questions are shown to the user. |
| 13 | **Start Video Interview** | The candidate begins the AI-driven interview. |
| 14 | **AI Asks Question via Video** | The AI interviewer presents a question. |
| 15 | **Candidate Records Video Answer** | The user records their response. |
| 16 | **Upload Video to Cloud Storage** | The recorded video is uploaded. |
| 17 | **Transcribe Answer** | The answer is transcribed for AI evaluation. |
| 18 | **More Questions?** | Decision point — loops back if more questions remain. |
| 19 | **Submit All Answers for Evaluation** | All responses are submitted once the interview is complete. |
| 20 | **AI Evaluator Scores Responses** | The AI evaluates and scores each answer. |
| 21 | **Generate Feedback Summary** | A comprehensive feedback report is created. |
| 22 | **Display Score & Feedback** | The candidate views their results. |
| 23 | **Retry Interview?** | Decision point — the candidate can retry or exit. |

### Key Decision Points

- **Authentication check** — loops back to login if not authenticated.
- **Question generation success** — retries with a fallback model on failure.
- **More questions** — loops through all questions during the interview.
- **Retry interview** — allows the candidate to start over or end the session.

---

## 8. State Machine Diagram

**Type:** Behavioral

### Purpose

The State Machine Diagram shows the **lifecycle states** of an interview session and the transitions triggered by events. It captures the system's behavior over time.

### States

| State | Description |
|-------|-------------|
| **Idle** | The system is waiting for user interaction. |
| **Authenticating** | The user is in the process of logging in. |
| **Authenticated** | The user is successfully logged in and can interact with the system. |
| **ResumeUploading** | A resume file is being uploaded to storage. |
| **ResumeParsing** | The uploaded resume is being processed for text extraction. |
| **QuestionGeneration** | The AI is generating interview questions from resume data. |
| **GenerationFailed** | The question generation API encountered an error. |
| **QuestionsReady** | Questions have been successfully generated and are ready. |
| **InterviewInProgress** | The candidate is actively participating in the interview (composite state). |
| **Evaluating** | The AI is scoring and evaluating all responses. |
| **FeedbackReady** | Evaluation is complete and results are available. |
| **SessionComplete** | The interview session has ended. |

### Composite State: InterviewInProgress

The `InterviewInProgress` state is a **composite state** containing its own sub-states:

| Sub-State | Description |
|-----------|-------------|
| **AskingQuestion** | The AI interviewer is presenting a question via video. |
| **RecordingAnswer** | The candidate is recording their video response. |
| **UploadingVideo** | The recorded video is being uploaded to cloud storage. |
| **TranscribingAnswer** | The answer is being transcribed from video to text. |
| **AllAnswered** | All interview questions have been answered. |

### Key Transitions

| From | Event | To |
|------|-------|----|
| Idle → Authenticating | User opens app |
| Authenticating → Authenticated | Login success |
| Authenticating → Idle | Login failed |
| QuestionGeneration → GenerationFailed | API error / timeout |
| GenerationFailed → QuestionGeneration | Retry with fallback model |
| FeedbackReady → InterviewInProgress | Retry interview |
| FeedbackReady → SessionComplete | User exits |
| SessionComplete → Authenticated | Start new session |
| SessionComplete → [End] | Logout |

---

## Summary

| # | Diagram | Type | Focus |
|---|---------|------|-------|
| 1 | Use Case | Behavioral | Who uses the system and what they can do |
| 2 | Class | Structural | Object-oriented design and relationships |
| 3 | DFD | Data | How data flows through processing stages |
| 4 | Component | Structural | High-level architecture and deployment tiers |
| 5 | Sequence | Behavioral | Chronological message flow for a full interview |
| 6 | Deployment | Infrastructure | Software-to-hardware mapping |
| 7 | Activity | Behavioral | Complete user workflow with decision points |
| 8 | State Machine | Behavioral | Interview session lifecycle and transitions |
