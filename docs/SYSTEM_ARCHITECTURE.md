# STAT-GAP AI — System Architecture Specification

## 1. Architectural Philosophy: Strict Separation of Powers

The cardinal architectural rule of STAT-GAP AI is the **strict separation between deterministic execution and generative intelligence**:

```mermaid
flowchart TD
    subgraph Deterministic Core ["DETERMINISTIC / PROGRAMMATIC LAYER (Authoritative)"]
        ScoringEngine["Competency Scoring Engine\n(Weighted Evidence Formula)"]
        GapEngine["Gap Calculation & Thresholding\n(Red / Orange / Green Bands)"]
        IRTEngine["Item Response Theory Engine\n(Rasch 1PL & MAP Estimation)"]
        DecayEngine["Knowledge Decay Engine\n(Ebbinghaus Exponential Decay)"]
        VerificationEngine["Independent Verification Engine\n(Dual-Gate Pass/Fail Decisions)"]
        TaskReadiness["Task Readiness Evaluator\n(Deterministic Constraint Checks)"]
        RBAC["Authentication & RBAC\n(Argon2id + JWT + Profile Scoping)"]
        AuditEngine["Audit Trail Logger\n(Immutable Event Logging)"]
    end

    subgraph Generative Layer ["AI / GENERATIVE LAYER (Advisory / Explanatory)"]
        LLMExplanation["WHY-GAP Natural Language Synthesizer\n(Grounded Remediation Notes)"]
        MCQGenerator["Grounded MCQ Question Generator\n(From Verified Source Chunks)"]
        MisconceptionMapper["Misconception Semantic Matcher\n(Taxonomy Navigation Support)"]
        AITutor["Contextual Statistical Study Tutor\n(Strict Curriculum Boundaries)"]
    end

    DeterministicCore -->|Filtered Signals & Bounded Context| GenerativeLayer
    GenerativeLayer -.->|Advisory Explanations ONLY\n(Never Mutates Scores/Permissions)| OfficerUI["Officer & Admin Presentation Layer"]
    DeterministicCore -->|Authoritative State Updates| OfficerUI
```

| Operational Responsibility | Engine Classification | Technology / Implementation | Authoritative Status |
|:---|:---|:---|:---|
| Competency Score Calculation | **Deterministic** | Pure Python Math / SQL Expressions | **Authoritative (100%)** |
| Gap Banding & Thresholds | **Deterministic** | Threshold comparison rules | **Authoritative (100%)** |
| Ability Estimation ($\theta, SE$) | **Deterministic** | Rasch 1PL Newton-Raphson MAP Engine | **Authoritative (100%)** |
| Verification Decision | **Deterministic** | Statutory criteria evaluator | **Authoritative (100%)** |
| Knowledge Decay Calculation | **Deterministic** | Ebbinghaus formula $R_0 \cdot e^{-t/S}$ | **Authoritative (100%)** |
| Access Control & Permissions | **Deterministic** | JWT Bearer verification + DB Scoping | **Authoritative (100%)** |
| Audit Trail Ledger | **Deterministic** | Append-only database ledger | **Authoritative (100%)** |
| Explanation of Gap Reasons | **AI / Generative** | Gemini LLM with Strict RAG Grounding | Advisory / Explanatory |
| Diagnostic Remediation Advice | **AI / Generative** | RAG-grounded prompt engineering | Advisory / Pedagogical |
| MCQ Item Generation | **AI / Generative** | Structured JSON generation from chunks | Subject to Validation |

---

## 2. High-Level Component Architecture

```mermaid
flowchart TB
    subgraph PresentationTier ["1. Presentation Layer (Frontend)"]
        UI_SPA["React 19 + TypeScript Single Page App (Vite)"]
        UI_Charts["Custom Data Visualizations (SVG & Canvas Charts)"]
        UI_PWA["Progressive Web App Shell (Offline-Ready Presentation)"]
    end

    subgraph APIGateway ["2. API & Middleware Tier (FastAPI)"]
        MW_Cors["CORS Middleware"]
        MW_RateLimit["Token Bucket Rate Limiter"]
        MW_Auth["JWT Bearer Authentication Handler"]
        MW_Audit["Correlation ID & Audit Context Middleware"]
        Router_Core["FastAPI APIRouter (/api/v1)"]
    end

    subgraph ApplicationServices ["3. Application Intelligence Core"]
        Svc_Auth["Auth & Profile Service"]
        Svc_Competency["Competency Service"]
        Svc_Gap["Weighted Gap Engine"]
        Svc_Diagnosis["WHY-GAP Diagnosis Engine"]
        Svc_IRT["Adaptive Assessment (IRT 1PL) Service"]
        Svc_Verify["Verification & Task Readiness Service"]
        Svc_Decay["Knowledge Decay & Refresher Service"]
        Svc_RAG["RAG & Grounding Gate Service"]
        Svc_LLM["Provider-Agnostic LLM Service"]
    end

    subgraph IntegrationLayer ["4. Ministerial Adapter Layer"]
        Adapter_IGOT["iGOT Karmayogi Adapter (Mock & Real Gateways)"]
        Adapter_NSSTA["NSSTA Training Program Adapter"]
        Adapter_TPAC["TPAC Recommended Calendar Adapter"]
    end

    subgraph DataTier ["5. Data & Vector Persistence"]
        DB_Postgres[("PostgreSQL 16 Relational Engine")]
        DB_PGVector[("pgvector Vector Extension (768-dim Embeddings)")]
        Doc_Storage[("Authorized Document Repository (PDF / DOCX / PPTX)")]
    end

    PresentationTier <-->|REST API (JSON / Bearer Token)| APIGateway
    APIGateway <--> ApplicationServices
    ApplicationServices <--> DataTier
    ApplicationServices <--> IntegrationLayer
```

---

## 3. Technology Stack Specification

### 3.1 Frontend Tier
- **Framework**: React 19 (`react`, `react-dom`) with TypeScript (`~5.8.2`).
- **Build Tool**: Vite 6 (`vite`, `@vitejs/plugin-react`).
- **Styling**: TailwindCSS v4 with modern, accessible official styling (Plus Jakarta Sans and JetBrains Mono typography, Indian national tricolor brand accents).
- **Icons**: `lucide-react` modern SVG icons.
- **State Management**: Clean modular service classes backed by React hooks (`useState`, `useEffect`, `useCallback`) and resilient local storage sync for offline resilience.
- **Client Architecture**: Centralized HTTP client (`apiClient.ts`) injecting JWT Bearer tokens and enforcing explicit error handling.

### 3.2 Backend Tier
- **Framework**: FastAPI (>= 0.115.0) running on ASGI server Uvicorn (>= 0.32.0).
- **Validation**: Pydantic v2 (`pydantic`, `pydantic-settings`) for strict request/response data contracts.
- **ORM & Migrations**: SQLAlchemy 2.0 (`sqlalchemy[asyncio]`) with Alembic (>= 1.14.0) for deterministic schema migrations.
- **Database Driver**: `psycopg` (binary >= 3.2.0) for high-performance PostgreSQL connectivity.
- **Security**: Argon2id (`argon2-cffi >= 23.1.0`) for password hashing, `pyjwt` (>= 2.9.0) for HMAC-SHA256 signed access tokens.

### 3.3 Document Processing & AI Pipeline
- **Document Extractors**:
  - `pypdf` (>= 5.0.0) / `PyMuPDF`: High-fidelity PDF text extraction.
  - `python-docx` (>= 1.1.0): Structured Word document parsing.
  - `python-pptx` (>= 1.0.0): Slide deck extraction.
- **Vector Storage**: `pgvector` (>= 0.3.0) extension inside PostgreSQL, maintaining 768-dimensional embeddings with IVFFlat or HNSW indexes.
- **Embedding Provider**: Google `text-embedding-004` (768 dimensions) via official SDK (`google-genai`), backed by a deterministic offline mock provider for test isolation.
- **Generative AI Provider**: Gemini 2.5 Flash via official `google-genai` SDK, wrapped behind an abstract `LLMProvider` interface to ensure zero vendor lock-in.

---

## 4. Component Interactions & Request Lifecycles

### 4.1 Officer Assessment & Verification Lifecycle
1. **Initiation**: Officer requests an adaptive assessment on a competency via `POST /api/assessments/start`.
2. **Prior Estimation**: System queries the officer's current Competency Digital Twin to extract prior ability $\theta_0$.
3. **Item Delivery**: IRT engine identifies the item from the seeded item bank maximizing Fisher Information $I(\theta_0)$ and returns the item (without revealing the correct answer).
4. **Adaptive Response Loop**: Officer submits answers sequentially. With each response:
   - Newton-Raphson MAP recalculates $\theta$ and standard error $SE(\theta)$.
   - Distractor selection is logged. If an option associated with a specific misconception is chosen, a diagnostic flag is recorded.
   - Stopping criteria checked ($SE \le 0.38$ or item count $\in [3, 10]$).
5. **Score Finalization**: Once stopped, the final ability estimate $\theta_{\text{final}}$ is mapped to an evaluated percentage score and stored.
6. **Digital Twin Update**: The Competency Digital Twin evidence vector and gap points are recomputed immediately.
7. **Decay Initialization**: The Knowledge Decay engine records the interaction timestamp and calculates stability $S$.

### 4.2 WHY-GAP Diagnostic Lifecycle
1. **Trigger**: Officer or supervisor navigates to `/why-gap` or queries `GET /api/diagnostics/competencies/{id}`.
2. **Signal Aggregation**: The Diagnosis Service aggregates multi-source evidence: assessment score, quiz accuracy, practical score, repeated error count, and confidence calibration.
3. **Rule Classification**: The rule engine determines the primary diagnostic category (`basic_concept`, `statistical_misconception`, `application_gap`, `integrated_concept`, or `insufficient_evidence`).
4. **Knowledge Graph Traversal**: The Knowledge Graph repository checks whether prerequisite nodes in the statistical ontology are deficient.
5. **RAG Context Retrieval**: The RAG service constructs a synthesized query, retrieves curriculum chunks from pgvector, and computes cosine similarity.
6. **Grounding Verification Gate**:
   - If similarity $\ge 0.65$: Context is certified as `grounded`.
   - If similarity $\in [0.48, 0.65)$: Flagged as `weak_grounding`.
   - If similarity $< 0.48$: Flagged as `insufficient_grounding`; generation is aborted in favor of a statutory fallback message.
7. **Explanatory Synthesis**: If grounded, the LLM generates a structured explanation highlighting:
   - What the officer mistakenly believes.
   - The correct mathematical truth from official manuals.
   - The diagnostic synthesis explaining the gap.
   - Targeted remediation action items.

---

## 5. Security & Deployment Topology

- **Network Boundary**: Frontend and backend communicate via TLS 1.3 in production environments.
- **CORS Protection**: Explicitly restricted to configured trusted origins (e.g., ports 3000, 3001, 5173).
- **Environment Isolation**: Sensitive configuration values (JWT keys, database credentials, API keys) are loaded strictly through environment variables validated by Pydantic `BaseSettings`.
- **Database Hardening**: PostgreSQL instances require encrypted connections, parameterized queries through SQLAlchemy, and role-restricted database users.
