# STAT-GAP AI — Technical Architecture & Mathematical Foundation

**Ministry of Statistics and Programme Implementation (MoSPI)**  
**Version:** 1.0.0 (Phase 10 Hardened Production Architecture)  
**Security Standard:** Government of India / CERT-In Aligned Architecture  

---

## 1. System Architecture Overview

STAT-GAP AI is structured as a resilient, decoupled micro-monolith with strict mathematical boundaries:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          STAT-GAP AI Frontend (Vite + React)                    │
│  - Officer Master Dashboard      - Competency Digital Twin    - WHY-GAP AI      │
│  - Adaptive 1PL IRT Assessment   - Task Readiness Board       - AI Assistant    │
│  - Cadre Workforce Analytics     - Supervisor Oversight Hub   - Career Benchmarks│
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ JSON / HTTPS / JWT Bearer
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        FastAPI Application Core (Python 3.11)                   │
│  - RBAC Middleware (Argon2id / JWT / IDOR Boundary)                             │
│  - CorrelationId & RateLimiter Middlewares                                      │
│  - Structured Audit & Event Logging Subsystem                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                             Core Intelligence Engines                           │
│  ├── 1. Competency Scoring Model (4-Factor: 0.40A + 0.25Q + 0.25P + 0.10E)      │
│  ├── 2. Bayesian Knowledge Tracing (BKT: P(L0), P(T), P(S), P(G))              │
│  ├── 3. 1PL Rasch IRT Adaptive Assessment Engine (b, θ, SE)                     │
│  ├── 4. WHY-GAP Cognitive Misconception Detection                               │
│  ├── 5. Ebbinghaus Memory Retention Decay Engine (R = e^(-t/S))                 │
│  ├── 6. Operational Task Readiness Evaluator                                    │
│  ├── 7. Multi-Constraint Knapsack Training Optimizer                            │
│  └── 8. Grounded RAG & AI Learning Assistant (>=0.65 Grounded, <0.48 Refusal)   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                             Integration & Adapter Layer                         │
│  ├── iGOT Karmayogi Adapter  ├── NSSTA Academy Adapter ├── TPAC Syllabus Adapter│
│  ├── Government SSO (Parichay/MeriPehchaan) ├── Multi-Format Material Ingestor  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ SQLAlchemy 2.0 ORM
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                          Database & Storage Architecture                        │
│  - PostgreSQL 15+ / SQLite In-Memory Test Driver                                │
│  - pgvector / ChromaDB Semantic Embedding Storage                               │
│  - Immutable Audit Event Ledger                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Formulations & Gating Thresholds

### A. Preserved 4-Factor Competency Evaluation
$$S_c = 0.40 \cdot A + 0.25 \cdot Q + 0.25 \cdot P + 0.10 \cdot E$$
- $A$: Formal Assessment Score ($0.0 - 1.0$)
- $Q$: Diagnostic Quiz Accuracy ($0.0 - 1.0$)
- $P$: Practical Exercise Demonstration ($0.0 - 1.0$)
- $E$: Domain Experience Factor ($0.0 - 1.0$)

**Gap Calculation:**
$$\text{Gap} = \max(0.0, R_c - S_c)$$
- **RED (Critical Gap):** $\text{Gap} \ge 0.25$
- **ORANGE (Moderate Gap):** $0.10 \le \text{Gap} < 0.25$
- **GREEN (Satisfied):** $\text{Gap} < 0.10$

### B. Bayesian Knowledge Tracing (BKT) Update
$$P(L_t | \text{Correct}) = \frac{P(L_{t-1}) \cdot (1 - P(S))}{P(L_{t-1}) \cdot (1 - P(S)) + (1 - P(L_{t-1})) \cdot P(G)}$$
$$P(L_t | \text{Incorrect}) = \frac{P(L_{t-1}) \cdot P(S)}{P(L_{t-1}) \cdot P(S) + (1 - P(L_{t-1})) \cdot (1 - P(G))}$$
$$\text{Mastery Update: } P(L_{t+1}) = P(L_t | \text{Obs}) + (1 - P(L_t | \text{Obs})) \cdot P(T)$$

### C. 1PL Rasch Item Response Theory (IRT)
$$P(Y_{ij} = 1 | \theta_i, b_j) = \frac{1}{1 + e^{-(\theta_i - b_j)}}$$
- $\theta_i$: Officer Ability Estimate
- $b_j$: Item Difficulty Parameter
$$\text{Standard Error (SE): } \text{SE}(\theta) = \frac{1}{\sqrt{\sum_{j=1}^n P_j(1 - P_j)}}$$

### D. Ebbinghaus Memory Retention Decay
$$R(t) = e^{-\frac{t}{S}}$$
- $t$: Days elapsed since last verified practice
- $S$: Retention Stability Parameter (calibrated from prior verification count $v$: $S = S_0 \cdot (1 + 0.4 \cdot v)$)

### E. Authoritative RAG Grounding Gating (Phase 4 Thresholds)
- **GROUNDED ($\ge 0.65$):** Evidence strongly corroborates answer; displayed with official source citations.
- **WEAK GROUNDING ($0.48 \le \text{score} < 0.65$):** Partial evidence; labeled with warning badge.
- **INSUFFICIENT EVIDENCE ($< 0.48$):** Deterministic refusal; guides officer to official NSSTA manuals without generating speculative text.
