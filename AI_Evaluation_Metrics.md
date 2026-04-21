# NextHire AI Evaluation Metrics

## 1. Semantic Relevance (SR)

**Definition**: Measures how closely the candidate's answer aligns with the expected answer in meaning, not just keyword matching. Uses cosine similarity between vector embeddings of the candidate's response and the ideal response.

**Formula**:

```
                    A⃗ · B⃗
SR(A, B) = ─────────────────────
              ‖A⃗‖ × ‖B⃗‖

Where:
  A⃗ = Embedding vector of the candidate's answer
  B⃗ = Embedding vector of the expected/ideal answer
  · = Dot product
  ‖ ‖ = Euclidean norm (magnitude)
```

**Expanded**:

```
         Σᵢ (Aᵢ × Bᵢ)
SR = ──────────────────────────
     √(Σᵢ Aᵢ²) × √(Σᵢ Bᵢ²)
```

**Range**: −1 to +1 (typically 0 to 1 for text)
- **SR ≥ 0.85** → Highly relevant answer
- **0.60 ≤ SR < 0.85** → Partially relevant
- **SR < 0.60** → Off-topic or weak answer

**Example in NextHire**:
- Question: "Explain polymorphism in Java"
- Expected: "Polymorphism allows objects to take many forms..."
- Candidate: "It means one interface, multiple implementations..."
- SR = cos(embed("candidate"), embed("expected")) = **0.82** → Partially relevant

---

## 2. Cognitive Latency Tolerance (CLT)

**Definition**: Evaluates whether the candidate's response time falls within an acceptable cognitive processing window. Too fast may indicate memorized/superficial answers; too slow may indicate lack of knowledge.

**Formula**:

```
              |Tᵣ − Tₒ|
CLT = 1 − ─────────────
               Tₘₐₓ

Where:
  Tᵣ   = Actual response time of the candidate (seconds)
  Tₒ   = Optimal response time for the question difficulty (seconds)
  Tₘₐₓ = Maximum allowed response time (seconds)
```

**Range**: 0 to 1
- **CLT ≥ 0.80** → Optimal thinking time, well-paced
- **0.50 ≤ CLT < 0.80** → Acceptable but slightly rushed/slow
- **CLT < 0.50** → Either rushed (no thought) or excessively delayed

**Optimal Time by Difficulty**:

| Difficulty | Tₒ (Optimal) | Tₘₐₓ (Max) |
|:-----------|:-------------|:------------|
| Easy       | 15 sec       | 60 sec      |
| Medium     | 30 sec       | 120 sec     |
| Hard       | 45 sec       | 180 sec     |

**Example in NextHire**:
- Medium difficulty question, Tₒ = 30s, Tₘₐₓ = 120s
- Candidate responds in Tᵣ = 25s
- CLT = 1 − |25 − 30| / 120 = 1 − 5/120 = **0.958** → Excellent pacing

---

## 3. Terminology Alignment Index (TAI)

**Definition**: Measures how well the candidate uses domain-specific terminology and technical keywords expected for the role. A higher TAI indicates strong command of professional vocabulary.

**Formula**:

```
         |Kc ∩ Ke|
TAI = ─────────────  ×  Wᵤ
          |Ke|

Where:
  Kc  = Set of technical keywords detected in the candidate's answer
  Ke  = Set of expected keywords for the question
  ∩   = Set intersection (keywords present in both)
  |·| = Cardinality (count of elements)
  Wᵤ  = Usage quality weight (0.5 to 1.0, based on contextual correctness)
```

**With Contextual Quality Weight**:

```
         Σᵢ (matchᵢ × contextScoreᵢ)
TAI = ────────────────────────────────
                  |Ke|

Where:
  matchᵢ        = 1 if keyword i is found, 0 otherwise
  contextScoreᵢ = 0.5 if keyword used incorrectly, 1.0 if used correctly
```

**Range**: 0 to 1
- **TAI ≥ 0.75** → Strong technical vocabulary
- **0.40 ≤ TAI < 0.75** → Moderate; missing some key terms
- **TAI < 0.40** → Weak or incorrect terminology usage

**Example in NextHire**:
- Expected keywords Ke = {encapsulation, inheritance, polymorphism, abstraction}
- Candidate mentions Kc = {inheritance, polymorphism, overriding}
- Intersection = {inheritance, polymorphism} → 2 out of 4
- Both used correctly (contextScore = 1.0 each)
- TAI = (1×1.0 + 1×1.0) / 4 = **0.50** → Moderate

---

## 4. Answer Compression Efficiency (ACE)

**Definition**: Evaluates how concisely the candidate communicates the core information. Penalizes both overly verbose (filler-heavy) answers and extremely terse (lacking depth) answers. Measures information density.

**Formula**:

```
         Iₛ
ACE = ────────
       Wₜₒₜₐₗ

Where:
  Iₛ     = Number of meaningful information units (key points, facts, examples)
  Wₜₒₜₐₗ = Total word count of the candidate's response
```

**Normalized ACE (against ideal)**:

```
                ACEcandidate
ACE_norm = ──────────────────
               ACEideal

Where:
  ACEideal = Iₛ(ideal) / Wₜₒₜₐₗ(ideal)    [from the model answer]
```

**Range**: 0 to ~1.5
- **0.85 ≤ ACE_norm ≤ 1.15** → Well-balanced (concise yet complete)
- **ACE_norm > 1.15** → Too compressed, may lack explanation
- **ACE_norm < 0.85** → Too verbose, low information density

**Example in NextHire**:
- Ideal answer: 5 key points in 80 words → ACEᵢ = 5/80 = 0.0625
- Candidate: 4 key points in 150 words → ACEc = 4/150 = 0.0267
- ACE_norm = 0.0267 / 0.0625 = **0.427** → Too verbose, needs to be more concise

---

## 5. Expectation Drift Detection (EDD)

**Definition**: Detects whether the candidate's answer gradually drifts away from the topic as it progresses. Even if the beginning is relevant, a high EDD indicates the candidate went off-track mid-answer. Measures semantic coherence decay over the response.

**Formula**:

```
         1    N
EDD = ──── × Σ |SRᵢ − SRᵢ₋₁|
        N   i=2

Where:
  N   = Number of sentence segments in the candidate's answer
  SRᵢ = Semantic Relevance of the i-th sentence segment to the original question
```

**Alternative (Weighted Drift)**:

```
              Σᵢ wᵢ × |SRᵢ − SRᵢ₋₁|
EDD_w = ────────────────────────────────
                   Σᵢ wᵢ

Where:
  wᵢ = i / N    (later segments are weighted more heavily)
```

**Range**: 0 to 1
- **EDD ≤ 0.10** → Very focused, stays on topic throughout
- **0.10 < EDD ≤ 0.25** → Minor drift, acceptable
- **EDD > 0.25** → Significant drift, candidate went off-topic

**Example in NextHire**:
- Question: "What is REST API?"
- Sentence 1 (SR₁ = 0.92): "REST is an architectural style for web services."
- Sentence 2 (SR₂ = 0.88): "It uses HTTP methods like GET and POST."
- Sentence 3 (SR₃ = 0.75): "I once built a full-stack app using React."
- Sentence 4 (SR₄ = 0.40): "React hooks are really useful for state management."

```
EDD = (|0.88−0.92| + |0.75−0.88| + |0.40−0.75|) / 3
    = (0.04 + 0.13 + 0.35) / 3
    = 0.52 / 3
    = 0.173 → Minor-to-moderate drift detected
```

---

## Combined AI Score Formula

NextHire computes the final AI interview score as a weighted combination of all five metrics:

```
Final Score = (w₁ × SR) + (w₂ × CLT) + (w₃ × TAI) + (w₄ × ACE_norm) + (w₅ × (1 − EDD))

Default Weights:
  w₁ = 0.35   (Semantic Relevance — most important)
  w₂ = 0.10   (Cognitive Latency Tolerance)
  w₃ = 0.20   (Terminology Alignment Index)
  w₄ = 0.15   (Answer Compression Efficiency)
  w₅ = 0.20   (Expectation Drift — inverted, lower drift = higher score)

  Σ wᵢ = 1.0
```

**Final Score Range**: 0.0 to 1.0 (scaled to 0–10 for display)

| Score Range | Grade     | Feedback                              |
|:------------|:----------|:--------------------------------------|
| 9.0 – 10.0 | Excellent | Highly recommended for the role       |
| 7.0 – 8.9  | Good      | Strong candidate, minor improvements  |
| 5.0 – 6.9  | Average   | Needs improvement in key areas        |
| 3.0 – 4.9  | Below Avg | Significant gaps in knowledge         |
| 0.0 – 2.9  | Poor      | Not ready, requires substantial prep  |
