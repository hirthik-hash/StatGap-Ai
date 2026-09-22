# STAT-GAP AI — Phase 6 Report
## Independent Competency Verification + Task Readiness + Knowledge Decay + What-If Simulation

**Phases Complete:** 1–6
**Document:** PHASE6_REPORT.md
**Status:** ✅ Complete

---

## 1. Phase Objective

Phase 6 closes the loop between:

> "The system estimates that an officer has learned something"

and

> "The system independently verifies that the officer can demonstrate the competency and is ready for task-level performance."

Phase 6 implements:
1. **Independent Competency Verification** — separate from assessment, with explicit pass criteria
2. **Knowledge Decay Monitoring** — Ebbinghaus exponential model with configurable stability
3. **Refresher Recommendation & Re-Assessment** — deduplicating refresher trigger lifecycle
4. **Task Readiness** — whether an officer's competency profile satisfies a defined task's requirements
5. **What-If Simulation** — safe, read-only exploration of hypothetical improvements

---

## 2. Phase 6 Boundary Constraints (Enforced)

| Constraint | Status |
|------------|--------|
| Assessment ≠ Verification | ✅ Separate services, separate DB tables |
| Simulation never mutates authoritative state | ✅ Simulation uses only in-memory copies |
| Verification expiry ≠ retention zero | ✅ Explicitly separated in VerificationService |
| Phase 4 grounding thresholds unchanged | ✅ 0.65 / 0.48 locked in config |
| No Phase 7+ (CATO, workforce analytics) | ✅ Not implemented |

---

## 3. Implemented Components

### 3.1 Independent Verification Service (`backend/app/services/verification_service.py`)
**Pre-existing — preserved as-is:**
- Practical verification recording (dataset_audit, field_survey_audit, code_review, practical_exercise)
- Verification evaluation against explicit criteria:
  - Independent score ≥ 70.0% (VERIFICATION_MIN_INDEPENDENT_SCORE)
  - Practical score ≥ 60.0% (VERIFICATION_MIN_PRACTICAL_SCORE) — if applicable
  - Composite score ≥ 75.0% (VERIFICATION_PASS_SCORE)
- 90-day validity window (VERIFICATION_VALIDITY_DAYS)
- Expiry check that marks status="expired" WITHOUT zeroing retention
- Historical verification preservation (is_current=False for prior records)
- Immutable CompetencyAuditEvent for every lifecycle transition

### 3.2 Knowledge Decay Service (`backend/app/services/decay_service.py`)
**Pre-existing — preserved as-is:**
- Ebbinghaus forgetting curve: `R(t) = R₀ · exp(-t / S)`
- Deterministic stability: `S = S₀ · (1 + 0.40 · (C - 75) / 25)`, clamped [30, 95] days
- Risk levels: low (≥0.75), moderate (≥0.60), at_risk (≥0.45), critical (<0.45)

### 3.3 Refresh Service (`backend/app/services/refresh_service.py`)
**Pre-existing — bug fixed:**
- Fixed: `node.concept_id` → `node.id` (CompetencyNode has no concept_id attribute)
- Deduplication: escalates priority of existing pending recommendation
- Completing a refresher module explicitly does NOT trigger verification
- Reassessment result evaluated deterministically via VerificationService

### 3.4 Task Readiness Service (`backend/app/services/task_readiness_service.py`) ✅ NEW
**Evaluates officer competency state against task requirements:**

**Readiness States:**

| Status | Condition |
|--------|-----------|
| READY | All requirements satisfied, evidence sufficient |
| PARTIALLY_READY | Some unmet, all unmet are non-critical |
| NOT_READY | ≥1 CRITICAL requirement clearly unmet |
| INSUFFICIENT_EVIDENCE | ≥1 requirement lacks sufficient evidence to evaluate |

**Key design decisions:**
- Reads from `OfficerCompetencyState` (persisted by DigitalTwinService) as primary source
- Falls back to `StructuredEvidence` calculation if no state exists
- Bottleneck = critical requirement with largest gap (highest remediation priority)
- `TASK_READINESS_GAP_TOLERANCE = 0.05` — allows minor rounding differences
- Evaluation persisted to `TaskReadinessEvaluation` with full audit event
- What-If simulation operates entirely in-memory — NEVER mutates DB

### 3.5 What-If Simulation (Task Readiness)
- Accepts list of `{competency_id, hypothetical_level}` overrides
- Computes baseline status and simulated status in parallel
- Returns both for comparison with `readinessChanged` flag
- Disclaimer: `"SIMULATION — DOES NOT MODIFY REAL DATA"`
- Audit event recorded (simulation metadata logged, not results)

---

## 4. New Database Models

### `task_definitions`
| Column | Type | Description |
|--------|------|-------------|
| id | String(64) PK | Task identifier |
| name | String(255) | Task name (unique) |
| description | Text | Task description |
| category | String(128) | e.g., "Field Operations", "National Accounts" |
| cadre_applicable | String(128) | e.g., "ISS" |
| is_active | Boolean | Filters out deprecated tasks |

### `task_requirements`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer PK | Autoincrement |
| task_id | FK → task_definitions | Parent task |
| competency_id | FK → competencies | Required competency |
| required_level | Float | Minimum level [0.0, 1.0] |
| is_critical | Boolean | Critical = blocks READY status |

### `task_readiness_evaluations`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer PK | Autoincrement |
| officer_profile_id | FK → officer_profiles | Officer evaluated |
| task_id | FK → task_definitions | Task evaluated |
| readiness_status | String(32) | READY / PARTIALLY_READY / NOT_READY / INSUFFICIENT_EVIDENCE |
| requirements_met | Integer | Count of satisfied requirements |
| requirements_total | Integer | Total requirements |
| bottleneck_competency_id | FK (nullable) | Primary bottleneck |
| evaluation_detail | JSON | Per-requirement breakdown |

---

## 5. New API Endpoints

**Base prefix:** `/api/tasks`

| Method | Path | Description |
|--------|------|-------------|
| GET | /tasks | List all active task definitions |
| GET | /tasks/{task_id} | Get single task definition |
| GET | /tasks/{task_id}/readiness | Evaluate task readiness for authenticated officer |
| POST | /tasks/{task_id}/simulate | What-if readiness simulation (read-only) |

**All require JWT authentication.**
**Officers can only view their own readiness.**
**Supervisors/Admins may query any officer's readiness via `?officer_id=`.**

---

## 6. Seed Data

**File:** `backend/scripts/seed_task_definitions.py`

4 representative MoSPI/NSO task definitions:
1. Sample Survey Design & Coordination (NSS/PLFS)
2. National Account Compilation (CSO/NAD)
3. State-Level Data Quality Audit
4. Statistical Report Authoring (Annual Publication)

---

## 7. Scientific Integrity

> **Task Readiness Disclaimer:**
> "PROTOTYPE INDICATOR: Task readiness reflects modelled competency estimates only.
> It is NOT an authoritative operational clearance or HR decision."

> **What-If Simulation Disclaimer:**
> "SIMULATION — DOES NOT MODIFY REAL DATA. Values are hypothetical and based on
> prototype mathematical models only."

> **Task Readiness thresholds are policy-configurable parameters,
> NOT validated occupational standards.**

---

## 8. Test Coverage

### Phase 5 BKT Tests (`backend/tests/test_phase5_bkt.py`)
17 tests — all passing.

### Phase 6 Task Readiness Tests (`backend/tests/test_phase6_task_readiness.py`)

| # | Test | Key Assertion |
|---|------|---------------|
| 01 | List tasks API | Returns active tasks |
| 02 | Get single task | Returns task with requirement count |
| 03 | Non-existent task → 404 | Correct error handling |
| 04 | List tasks requires auth | 401 without token |
| 05 | NOT_READY when critical unmet | Critical requirement bottleneck |
| 06 | READY when all satisfied | All requirements satisfied |
| 07 | Requirement details populated | current_level, required_level, gap present |
| 08 | INSUFFICIENT_EVIDENCE no state | No OfficerCompetencyState → insufficient |
| 09 | Empty task → insufficient | No requirements → insufficient |
| 10 | Evaluation persisted to DB | persist=True saves record |
| 11 | Disclaimer always present | Prototype disclaimer in all responses |
| 12 | **Simulation does NOT mutate DB** | Critical safety test |
| 13 | Simulation improves status | Resolving bottleneck → READY |
| 14 | Simulation unchanged wrong target | Improving non-bottleneck → still NOT_READY |
| 15 | Simulation disclaimer present | isSimulation=True + disclaimer text |
| 16 | Readiness API requires auth | 401 without token |
| 17 | Simulation API requires auth | 401 without token |
| 18 | Readiness API returns structure | readinessStatus, requirementDetails, disclaimer |
| 19 | Simulation API returns structure | baseline, simulated, isSimulation |
| 20 | Invalid level rejected | hypothetical_level > 1.0 → 422 |
| 21 | Non-existent task readiness → 404 | Correct error handling |
| 22 | Bottleneck = largest critical gap | comp_survey_methods with gap 0.20 |

**22 task readiness tests — all passing.**

---

## 9. Frontend

**New page:** `src/components/pages/TaskReadinessPage.tsx`
- Task selector grid with category and requirement count
- Live readiness evaluation with status banner (color-coded)
- Per-requirement breakdown with progress bars
- Integrated What-If simulator with field inputs per competency
- Read-only label clearly displayed throughout simulation UI
- Disclaimer shown prominently

---

## 10. Preserved Phase 1–5 Invariants

| Constraint | Status |
|------------|--------|
| Phase 1 4-factor scoring (0.35A + 0.20Q + 0.30P + 0.15E) | ✅ Unchanged |
| Phase 2 RBAC / JWT authentication | ✅ Enforced on all new endpoints |
| Phase 3 Digital Twin state persistence | ✅ Task Readiness reads from it |
| Phase 4 RAG grounding thresholds (0.65/0.48) | ✅ Unchanged |
| Phase 5 BKT mathematical correctness | ✅ 17 BKT tests pass |
| Verification ≠ BKT mastery | ✅ Enforced in test_17 of BKT suite |
| Assessment ≠ Verification | ✅ Separate services and tables |
| Simulation ≠ real data mutation | ✅ Tested and verified |

---

## 11. Final Regression Test Count

| Test Suite | Count |
|-----------|-------|
| Pre-Phase 5 regression (Phases 1–4) | 157 |
| Phase 5 BKT tests (new) | 17 |
| Phase 6 Task Readiness tests (new) | 22 |
| **Total** | **196** |

**All 196 tests pass.** Zero regressions.

---

## 12. Configuration Parameters Added

```python
# BKT — Phase 5
BKT_PRIOR_MASTERY: float = 0.25
BKT_LEARNING_RATE: float = 0.20
BKT_GUESS_PROB: float = 0.20
BKT_SLIP_PROB: float = 0.10
BKT_MASTERY_THRESHOLD: float = 0.85

# Task Readiness — Phase 6
TASK_READINESS_GAP_TOLERANCE: float = 0.05
TASK_READINESS_MIN_EVIDENCE_COUNT: int = 1
```
All annotated as prototype heuristics pending empirical calibration.

---

## 13. Stopping Point

**Phase 6 is complete. Phase 7 (CATO, workforce predictive analytics, career progression) has NOT been implemented and must NOT be started without explicit approval.**
