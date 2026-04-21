# NextHire: Project Mechanics and Evaluation Calculations

This document explains how the NextHire platform operates, specifically focusing on the advanced AI evaluation metrics and how the final interview scores are calculated.

---

## 1. Core Workflow
NextHire uses a multi-stage serverless architecture to provide a seamless interview experience:
1.  **Resume Parsing**: Extracted text from uploaded resumes is used to personalize questions via the **Gemini API**.
2.  **Interview Session**: A video-based interface where questions are asked via Text-to-Speech (TTS) and answers are recorded and transcribed in real-time.
3.  **Real-time Metrics**: Timestamps (like when a question finishes and when an answer starts) are captured to measure cognitive load and pacing.
4.  **AI Evaluation**: After the interview, responses are evaluated using **Gemini-2.0-flash** for semantic content and deterministic algorithms for research-grade indices.

---

## 2. Evaluation Metrics (Research-Grade Indices)

NextHire calculates five primary indices for each question to provide a multi-dimensional assessment of the candidate's performance.

### 2.1 Semantic Relevance (SR)
*   **What it calculates**: The alignment in meaning between the candidate's answer and the ideal/expected answer.
*   **How it works**: Uses **Gemini text-embedding-004** to convert text into 768-dimensional vectors. It then calculates the **Cosine Similarity** between the candidate's answer vector and the reference vector (derived from question text and expected concepts).
*   **Range**: 0.0 to 1.0 (Higher is more relevant).

### 2.2 Cognitive Latency Tolerance (CLT)
*   **What it calculates**: The candidate's response pacing and "thinking time."
*   **How it works**: Measures the time delay ($T_{delay}$) between the end of the question being read and the start of the candidate's response.
*   **Formula**: $CLT = 1 - \frac{T_{delay}}{T_{max}}$
    *   $T_{max}$: 15s (Easy), 20s (Medium), 30s (Hard).
*   **Range**: 0.0 to 1.0 (1.0 = instant response; 0.0 = exceeded max threshold).

### 2.3 Terminology Alignment Index (TAI)
*   **What it calculates**: Proficiency in using domain-specific technical vocabulary.
*   **How it works**: Build a set of "Domain Terms" from expected concepts and synonyms. It then counts how many of these terms appear in the candidate's tokenized response.
*   **Formula**: $\frac{\text{Unique Domain Terms Used}}{\text{Total Expected Domain Terms}}$
*   **Range**: 0.0 to 1.0.

### 2.4 Answer Compression Efficiency (ACE)
*   **What it calculates**: Information density—how concisely the candidate covers the core concepts.
*   **How it works**: Combines the concept coverage fraction with a length penalty.
*   **Formula**: $ACE = \text{Coverage} \times \text{LengthPenalty}$
    *   **Length Penalty**: Penalizes both extremely brief (lacking depth) and overly verbose (rambling) answers. The "sweet spot" is roughly 30 words per concept.
*   **Range**: 0.0 to 1.0.

### 2.5 Expectation Drift Detection (EDD)
*   **What it calculates**: Semantic coherence and focus. It detects if a candidate starts on-topic but drifts away as they continue speaking.
*   **How it works**: Splits the answer into sentences and calculates the similarity of each sentence to the question. It then compares the similarity of the first half of the answer to the second half.
*   **Formula**: $1 - (Similarity_{FirstHalf} - Similarity_{SecondHalf})$
*   **Range**: 0.0 to 1.0 (Higher means less drift/more focused).

---

## 3. Session-Level Metrics

### 3.1 Interview Robustness Index (IRI)
*   **What it calculates**: Performance consistency across the entire session.
*   **How it works**: Calculates the **Standard Deviation** of the scores across all questions in a session.
*   **Formula**: $1 - \frac{\sigma}{50}$ (where $\sigma$ is the standard deviation).
*   **Interpretation**: A high IRI (near 1.0) means the candidate was consistent. A low IRI suggests hit-or-miss performance.

---

## 4. Final Score Calculation

The session's **Overall Score (0-100)** is calculated through a multi-step aggregation:

1.  **Question Weighting**: Every question generates a score (0-100) based on Semantic Relevance and Concept Coverage.
2.  **Averaging**: The scores of all questions are averaged.
3.  **Experience-Level Multiplier**: To ensure fairness across seniority levels, a multiplier is applied to the average:
    *   **Intern / Fresher**: 1.25x (Boosts scores for beginners)
    *   **Junior**: 1.10x
    *   **Mid-Level**: 1.00x
    *   **Senior / Experienced**: 0.95x (Higher expectations for seniors)
4.  **Capping**: The final result is capped at 100.

---

## 5. STAR Method (Behavioral Questions)
For behavioral questions (HR category), NextHire specifically looks for the **STAR** (Situation, Task, Action, Result) structure. The "Coverage" part of the score for these questions is based on detecting signals for each of these four components.
