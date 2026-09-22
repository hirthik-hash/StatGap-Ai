# STAT-GAP AI — Phase 1 Operational Baseline

**Date**: 2026-09-16  
**Environment**: Windows, Python 3.14.5 (virtualenv), Node.js v20+, Vite 6, FastAPI 0.115+  
**Execution Context**: Pre-modification baseline establishing the empirical status of STAT-GAP AI prior to Phase 1 harmonization.

---

## 1. Test Suite Baseline

### 1.1 Backend Test Results
- **Command**: `& "backend/.venv/Scripts/python.exe" -m pytest "backend/tests"`
- **Total Tests Collected**: 119
- **Total Tests Passed**: **119 (100% Pass Rate)**
- **Total Tests Failed**: **0**
- **Execution Time**: 17.79 seconds
- **Breakdown by Test Module**:
  - `backend/tests/test_adaptive_assessment.py`: 13 passed (Rasch 1PL, MAP ability, stopping criteria)
  - `backend/tests/test_auth_and_api.py`: 11 passed (Argon2id, JWT validation, /api/auth/me)
  - `backend/tests/test_diagnostics_and_graph.py`: 19 passed (Knowledge graph, evidence evaluation, WHY-GAP)
  - `backend/tests/test_e2e_lifecycle.py`: 2 passed (End-to-end officer diagnostic & learning loop)
  - `backend/tests/test_health.py`: 2 passed (API root and `/api/health` endpoint)
  - `backend/tests/test_igot_integration.py`: 9 passed (Adapter factory, Mock vs Real iGOT boundaries)
  - `backend/tests/test_knowledge_upload.py`: 18 passed (File validation, upload limits, mime-types)
  - `backend/tests/test_rag_and_ai.py`: 21 passed (3-tier grounding gate, anti-hallucination refusal)
  - `backend/tests/test_security_and_config.py`: 5 passed (JWT secret length, entropy validation)
  - `backend/tests/test_security_hardening.py`: 10 passed (RBAC, SQL injection immunity, XSS defense)
  - `backend/tests/test_verification_and_retention.py`: 9 passed (Ebbinghaus decay, stability clamping)

### 1.2 Frontend Test & Lint Results
- **TypeScript Static Check (`npm run lint`)**: `tsc --noEmit` executed with **exit code 0 (Zero compiler errors)**.
- **Frontend Unit Tests**: No Jest/Vitest test runner script configured in `package.json`. TypeScript type checking and runtime browser smoke testing serve as baseline verification.

---

## 2. Server Runtime Health Baseline

### 2.1 Backend Health
- **Runtime Process**: Uvicorn server running on `http://localhost:8000` with `.env` file configuration.
- **Health Check**: `curl.exe -s http://localhost:8000/api/health`
- **Output**:
  ```json
  {"status":"ok","service":"stat-gap-ai"}
  ```
- **HTTP Status**: `200 OK`

### 2.2 Frontend Health
- **Runtime Process**: Vite Dev Server running on `http://localhost:3001` (`npm run dev -- --port 3001`).
- **HTTP Status Check**: `curl.exe -s -I http://localhost:3001` returned `HTTP/1.1 200 OK`.
- **Presentation**: Single Page Application shell loads successfully, mounting React 19 root into DOM.

---

## 3. Known Warnings & Deprecations

1. **Starlette TestClient Deprecation**:
   - `StarletteDeprecationWarning: Using 'httpx' with 'starlette.testclient' is deprecated; install 'httpx2' instead.` (Originates from Starlette/FastAPI internal testclient import).
2. **AnyIO BlockingPortal Deprecation**:
   - `DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.`
3. **HTTP 422 Deprecation**:
   - `StarletteDeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.` (Triggered during 4 test cases testing invalid file upload formats).

---

## 4. Current Ports & Environment Configuration

| Service / Layer | Active Port | Host / Base URL | CORS Configuration |
|:---|:---:|:---|:---|
| **Frontend** | `3001` | `http://localhost:3001` | Allowed in `backend/app/core/config.py` |
| **Backend API** | `8000` | `http://localhost:8000/api` | Configured with `/api` prefix |
| **Alternate Dev Ports** | `3000`, `5173` | Localhost variants | Whitelisted in CORS origins list |

---

## 5. Identified Discrepancies Resolved in Phase 1

1. **Competency Scoring Weights Harmonized**:
   - Implemented prototype 4-factor normalized model:
     $$C = 0.35 \cdot E_{\text{assessment}} + 0.20 \cdot E_{\text{quiz}} + 0.30 \cdot E_{\text{practical}} + 0.15 \cdot E_{\text{external}}$$
   - Normalized all metrics to $[0.0, 1.0]$ with deterministic traffic-light visualization bands: Red ($\text{Gap} \ge 0.35$), Orange ($0.15 \le \text{Gap} < 0.35$), and Green ($\text{Gap} < 0.15$).
   - Encapsulated weights in `backend/app/core/config.py` with runtime validation (non-negative, sum to 1.0).
   - Preserved 100% backward compatibility for legacy callers.
2. **Frontend Live API Preference Enabled**:
   - `CompetencyService.fetchLiveCompetencies` now prioritizes live `/api/competencies` data from FastAPI backend with automatic `localStorage` caching and clear data source provenance tags (`live_backend` vs. `seeded_prototype`).
3. **Prototype Parameters Documented & Validated**:
   - Added explicit scientific honesty disclaimers across all deterministic models (Scoring, IRT, Decay, Grounding).

---

## 6. Phase 1 Final Verification & Acceptance Results

### 6.1 Final Test Suite Execution
- **Command**: `& "backend/.venv/Scripts/python.exe" -m pytest "backend/tests"`
- **Total Tests Collected**: **131** (119 baseline + 12 new scoring/boundary tests)
- **Total Tests Passed**: **131 (100% Pass Rate)**
- **Total Tests Failed**: **0**
- **Execution Time**: 17.52 seconds
- **New Test Module**: `backend/tests/test_scoring_model.py` (12 tests covering normal scoring, percentage normalization, zero/one boundary conditions, missing evidence, gap calculations, Red/Orange/Green band thresholds, invalid weight rejections, and full evaluation payloads).

### 6.2 Frontend Static Lint & Type Check
- **Command**: `npm run lint` (`tsc --noEmit`)
- **Result**: Exit code 0 (Zero TypeScript errors).

### 6.3 Browser Subagent Smoke Test Results
- **URL**: `http://localhost:3001`
- **Session Recording**: `phase1_smoke_test_1789566694326.webp`
- **Navigation Flow Verified**:
  1. `LoginPage`: Auto-fill demo credentials and successful login $\rightarrow$ **PASS**
  2. `DashboardPage`: Top metrics, proficiency cards, GAP-X stages $\rightarrow$ **PASS**
  3. `CompetencyMapPage`: 7 competency domains, category filters, search $\rightarrow$ **PASS**
  4. `CompetencyDetailPage`: Statistical Analysis multi-source evidence $\rightarrow$ **PASS**
  5. `WhyGapPage`: Root cause diagnosis, evidence audit, misconception analysis $\rightarrow$ **PASS**
  6. `PersonalizedLearningPage`: 15-minute micro-pathway 4 steps $\rightarrow$ **PASS**
  7. `AdaptiveQuizPage`: Rasch 1PL assessment item and confidence selector $\rightarrow$ **PASS**
  8. `VerificationPage`: Practical competency verification and ladder $\rightarrow$ **PASS**
  9. `KnowledgeDecayPage`: Ebbinghaus retention curves and prediction models $\rightarrow$ **PASS**
  10. `IgotIntegrationPage`: iGOT adapter status and LMS duality comparison $\rightarrow$ **PASS**
- **Console Log Audit**: **0 errors**, **0 warnings**, **0 network failures**.

---

## 7. Phase 1 Acceptance Gate Summary

| Acceptance Criterion | Status | Evidence |
|:---|:---:|:---|
| Backend starts successfully | **MET** | Uvicorn running on port 8000; `/api/health` returns `200 OK` (`{"status":"ok","service":"stat-gap-ai"}`). |
| Frontend starts successfully | **MET** | Vite running on port 3001; returns `HTTP 200 OK`. |
| Database foundation works | **MET** | SQLAlchemy models and test fixtures initialize cleanly across all test suites. |
| Existing tests remain healthy | **MET** | 131/131 tests passing (100% green). |
| Scoring model is internally consistent | **MET** | 4-factor normalized model ($0.35/0.20/0.30/0.15$) implemented with non-negative sum-to-1 validation. |
| Scoring weights are configurable | **MET** | Declared in `backend/app/core/config.py` `Settings` and overridable. |
| Prototype assumptions are documented | **MET** | Explicit scientific honesty disclaimers added to all configuration and service docstrings. |
| Gap thresholds are deterministic | **MET** | Red ($\ge 0.35$), Orange ($[0.15, 0.35)$), Green ($< 0.15$) deterministic classification. |
| Frontend prefers live backend data | **MET** | `fetchLiveCompetencies` preferentially queries `/api/competencies`. |
| Mock/fallback data clearly distinguished | **MET** | Tagged with `dataSource: 'live_backend'` vs `'seeded_prototype'`. |
| CORS/API configuration is consistent | **MET** | Ports 3000, 3001, and 5173 whitelisted in backend CORS. |
| No secrets are exposed | **MET** | Argon2id hashing, JWT validation guards, no credentials committed. |
| Main officer flow can be navigated | **MET** | End-to-end browser subagent verified all 10 stages without error. |
| No major runtime errors exist | **MET** | Browser console reports 0 errors and 0 warnings. |
| No future-phase feature unnecessarily implemented | **MET** | Phase 2–9 features remain cleanly deferred per architectural boundaries. |

