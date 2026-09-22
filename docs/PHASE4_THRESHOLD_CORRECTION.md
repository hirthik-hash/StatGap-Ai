# PHASE 4 THRESHOLD CORRECTION REPORT

## Status: COMPLETE

**Correction applied:** 2026-09-16
**Tests after correction:** 157/157 passed (no regressions)

---

## 1. Problem Found

The Phase 4 implementation used grounding thresholds of **0.68 (Grounded)** and **0.50 (Weak)**
across all layers of the system (config, service, tests, and all documentation).

The authoritative Phase 4 specification (user prompt, Section 8 "GROUNDING GATE") explicitly required:

> Grounded: score >= 0.65
> Weak: 0.48 <= score < 0.65
> Insufficient: score < 0.48
> "Make thresholds configurable. Do not silently change them."

This constituted a specification violation introduced during Phase 4 implementation.

---

## 2. Root Cause

During Phase 4 implementation, the incorrect values (0.68/0.50) were:
1. Hardcoded as default argument values in rag_service.py
2. Written into config.py as the authoritative settings
3. Propagated verbatim into 8 documentation files, all of which were internally consistent
   with each other — but all disagreed with the specification

There was no pre-existing code using 0.65/0.48 as grounding thresholds; the only occurrences
of those numbers in backend Python code were an unrelated confidence_service.py return value
and test data fixtures. The repo has no git history to trace the exact introduction point.

Additionally, rag_service.py did not read from settings — thresholds were hardcoded as default
function arguments, so even if config.py had been corrected, the service would have continued
using the wrong values.

---

## 3. Files Changed

### Backend Code (2 files)

#### MODIFY backend/app/core/config.py
- RAG_GROUNDED_THRESHOLD: 0.68 -> 0.65
- RAG_WEAK_GROUNDING_THRESHOLD: 0.50 -> 0.48
- Comment updated to cite Phase 4 specification and note that rag_service.py reads from settings

#### MODIFY backend/app/services/rag_service.py
- Removed hardcoded default arguments: grounded_threshold=0.68, weak_threshold=0.50
- Signature now uses Optional[float] = None for both threshold parameters
- Added import of settings from backend.app.core.config
- get_grounded_context() now reads _grounded from settings.RAG_GROUNDED_THRESHOLD (with caller override)
- get_grounded_context() now reads _weak from settings.RAG_WEAK_GROUNDING_THRESHOLD (with caller override)
- Result: config.py is now the single authoritative source of truth

### Tests (1 file)

#### MODIFY backend/tests/test_rag_and_ai.py
Old boundary tests (now removed):
  - score = 0.68 -> grounded
  - score = 0.67 -> weak_grounding
  - score = 0.50 -> weak_grounding
  - score = 0.49 -> insufficient_grounding
  - empty -> insufficient_grounding

New boundary tests (specification-correct):
  - score = 0.65 -> grounded       [exact lower boundary of Tier 1]
  - score = 0.64 -> weak_grounding [just below Tier 1]
  - score = 0.48 -> weak_grounding [exact lower boundary of Tier 2]
  - score = 0.47 -> insufficient_grounding [just below Tier 2]
  - empty -> insufficient_grounding

Test docstring updated to cite specification source.

### Documentation (7 files)

| File | Change |
|------|--------|
| docs/RAG_ARCHITECTURE.md | Flowchart, table, and MCQ generation sequence: 0.68/0.50 -> 0.65/0.48 (3 occurrences) |
| docs/PRODUCT_REQUIREMENTS.md | FR-07 grounding gate specification: 0.68/0.50 -> 0.65/0.48 |
| docs/IMPLEMENTATION_ROADMAP.md | Phase 4 deliverable 3 threshold values: 0.68/0.50 -> 0.65/0.48 |
| docs/SYSTEM_ARCHITECTURE.md | Grounding Verification Gate step 6: 0.68/0.50 -> 0.65/0.48 |
| docs/SECURITY_ARCHITECTURE.md | Section 4.3 Hard Grounding Gate: 0.68 -> 0.65 |
| SECURITY.md | Section 3.3 Grounding Threshold line: 0.68/0.50 -> 0.65/0.48 |
| PROJECT_CURRENT_STATE.md | RAG Service threshold description: 0.68/0.50 -> 0.65/0.48 |
| docs/PHASE4_REPORT.md | RAG service section: 0.68/0.50 -> 0.65/0.48 |

---

## 4. Threshold Values Before / After

| Parameter | Before (Wrong) | After (Correct) | Source |
|-----------|----------------|-----------------|--------|
| Grounded boundary | 0.68 | **0.65** | Phase 4 spec Section 8 |
| Weak boundary | 0.50 | **0.48** | Phase 4 spec Section 8 |
| Insufficient boundary | < 0.50 | **< 0.48** | Phase 4 spec Section 8 |

### Values intentionally NOT changed

| Value | Location | Reason |
|-------|----------|--------|
| RAG_SIMILARITY_THRESHOLD = 0.50 | config.py L35 | Minimum retrieval pre-filter, unrelated to grounding gate |
| confidence = 0.50 | llm_service.py L99, L223 | AI confidence score for insufficient-grounding fallback responses |
| confidence=0.50 | diagnosis_service.py L47, L213 | Diagnostic confidence for insufficient-evidence cases |
| 0.65 | confidence_service.py L37 | Unrelated confidence service return value |
| 0.48 | seed_data.py L792 | A normalized_score data field in seed data |
| 0.48 | seed_assessment_bank.py | Statistical question text (CI upper bound) |

---

## 5. Configuration Architecture After Fix

             config.py  <-- Single authoritative source
                |
                v
         rag_service.py  <-- reads settings.RAG_GROUNDED_THRESHOLD (0.65)
                |             and settings.RAG_WEAK_GROUNDING_THRESHOLD (0.48)
                v
         get_grounded_context()
            |
            +-- similarity >= 0.65 --> "grounded"
            +-- 0.48 <= similarity < 0.65 --> "weak_grounding"
            +-- similarity < 0.48 --> "insufficient_grounding"

Test stubs may pass explicit threshold values via the Optional override parameters
(grounded_threshold, weak_threshold), which is required for deterministic boundary testing.
Production code paths use None -> settings values.

---

## 6. Test Results

### Backend Test Suite
157 passed, 0 failed, 5 warnings
(23 seconds)

### Boundary Test Results (new specification-correct values)
  score = 0.65 -> grounded              PASS
  score = 0.64 -> weak_grounding        PASS
  score = 0.48 -> weak_grounding        PASS
  score = 0.47 -> insufficient_grounding PASS
  empty retrieval -> insufficient_grounding PASS

### Regression (Phases 1-3 functionality)
All 157 Phase 1-4 tests passing -- no regressions.

---

## 7. Repository-Wide Verification Result

### RAG_GROUNDED_THRESHOLD occurrences (3 - all correct)
  backend/app/core/config.py: RAG_GROUNDED_THRESHOLD = 0.65  [AUTHORITATIVE DEFINITION]
  backend/app/services/rag_service.py: settings.RAG_GROUNDED_THRESHOLD  [CONSUMER]
  backend/tests/test_rag_and_ai.py: comment reference  [DOC COMMENT]

### RAG_WEAK_GROUNDING_THRESHOLD occurrences (3 - all correct)
  backend/app/core/config.py: RAG_WEAK_GROUNDING_THRESHOLD = 0.48  [AUTHORITATIVE DEFINITION]
  backend/app/services/rag_service.py: settings.RAG_WEAK_GROUNDING_THRESHOLD  [CONSUMER]
  backend/tests/test_rag_and_ai.py: comment reference  [DOC COMMENT]

### 0.68 occurrences: 0 (none remaining anywhere)
### 0.50 as grounding threshold: 0 (none remaining in any grounding context)
### 0.65 as grounding threshold: correct in all 8 documentation files + config
### 0.48 as grounding threshold: correct in all 8 documentation files + config

---

## 8. Limitations and Scientific Honesty Note

These thresholds (0.65 Grounded, 0.48 Weak/Insufficient boundary) are prototype heuristic
values for the SIH Phase 4 demonstration. They have NOT been empirically calibrated against
a validated corpus of official Indian statistical documents. The config comment documents this
explicitly. The values are configurable via environment variables in production deployment.
