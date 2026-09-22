# STAT-GAP AI — Phase 5 Report
## Adaptive Assessment Engine: IRT + Bayesian Knowledge Tracing

**Phases Complete:** 1–5
**Document:** PHASE5_REPORT.md
**Status:** ✅ Complete

---

## 1. Phase Objective

Phase 5 built a robust, interpretable adaptive assessment engine that goes beyond a fixed quiz.
The system dynamically determines which items to present based on:
- The officer's estimated ability (θ, theta) on the IRT scale
- Active gap diagnosis from Phase 3 (misconception probes, application gaps, etc.)
- Content balancing to avoid repeatedly testing the same concept nodes
- Fisher information maximization to reduce standard error efficiently

Phase 5 also introduced the Bayesian Knowledge Tracing (BKT) service as a mathematical
knowledge-state tracking layer, complementary to (but distinct from) the IRT ability estimation.

---

## 2. Implemented Components

### 2.1 IRT Engine (`backend/app/services/irt_engine.py`)
**Pre-existing from Phase 1 — preserved and extended:**
- Rasch 1-Parameter Logistic (1PL) model: `P(θ) = 1 / (1 + exp(-(θ - b)))`
- MAP ability estimation with Gaussian prior
- Fisher information: `I(θ) = P(θ) · (1 - P(θ))`
- Ability band classification (developing → proficient → advanced)
- Difficulty label mapping

### 2.2 Adaptive Assessment Service (`backend/app/services/assessment_service.py`)
**Pre-existing — preserved:**
- Session initialization with prior theta mapped from Phase 3 evidence
- Diagnosis-aware item selection with weighted scoring
  - Misconception probes: ×2.5 weight when matching active diagnosis
  - Application items: ×2.4 for application_gap diagnosis
  - Novel concept bonus: ×1.4 for unvisited concept nodes
- Standard Error stopping condition (default: SE < 0.38, configurable)
- Maximum item limit stopping (default: 10 items)
- Integration of assessment results back into Phase 3 evidence layer

### 2.3 BKT Service (`backend/app/services/bkt_service.py`) ✅ NEW
**Standard Corbett & Anderson (1994) 4-parameter BKT model:**

| Parameter | Symbol | Default | Description |
|-----------|--------|---------|-------------|
| Prior Mastery | P(L₀) | 0.25 | Prior probability that an officer knows a skill |
| Learning Rate | P(T) | 0.20 | Probability of transitioning to mastery per response |
| Guess Probability | P(G) | 0.20 | P(correct response | non-mastery) |
| Slip Probability | P(S) | 0.10 | P(incorrect response | mastery) |

**Update formula (correct response):**
```
P(mastered | correct) = P(L) * (1 - P(S)) / [P(L) * (1 - P(S)) + (1 - P(L)) * P(G)]
```

**After update, learning transition:**
```
P(L_next) = P_posterior + (1 - P_posterior) * P(T)
```

**Mastery Bands:**

| Band | Range |
|------|-------|
| not_started | < 0.20 |
| developing | 0.20 – 0.50 |
| approaching | 0.50 – 0.75 |
| likely_mastered | 0.75 – BKT_MASTERY_THRESHOLD |
| mastered | ≥ BKT_MASTERY_THRESHOLD (0.85) |

### 2.4 BKT Configuration (`backend/app/core/config.py`)
All BKT parameters are configurable and annotated with scientific honesty notices:
```
BKT_PRIOR_MASTERY: float = 0.25
BKT_LEARNING_RATE: float = 0.20
BKT_GUESS_PROB: float = 0.20
BKT_SLIP_PROB: float = 0.10
BKT_MASTERY_THRESHOLD: float = 0.85
```

---

## 3. Scientific Integrity

> **BKT parameters are prototype heuristics for architectural demonstration.**
> They are NOT empirically calibrated from civil service performance data.
> National calibration from validated ISS officer assessment history is required before deployment.

> **BKT mastery probability ≥ threshold does NOT equal verified competency.**
> Phase 6 independent verification (VerificationService) remains the authoritative gating mechanism.
> Assessment ≠ Verification.

---

## 4. Test Coverage

**Test File:** `backend/tests/test_phase5_bkt.py`

| Test | Description |
|------|-------------|
| test_01 | BKT prior mastery defaults validated |
| test_02 | Correct response increases mastery |
| test_03 | Incorrect response decreases mastery |
| test_04 | Mastery bounded to [0.0, 1.0] for all inputs |
| test_05 | Higher learning rate → faster mastery growth |
| test_06 | Higher guess probability → lower diagnostic signal |
| test_07 | Higher slip probability → reduced incorrect-signal effect |
| test_08 | Repeated correct responses → monotonically increasing mastery |
| test_09 | Repeated incorrect responses → mastery stays depressed |
| test_10 | is_mastered() flags at configured threshold |
| test_11 | is_mastered() respects custom threshold overrides |
| test_12 | mastery_band() correct labels across all ranges |
| test_13 | trajectory tracking correct length |
| test_14 | Empty response sequence returns prior |
| test_15 | All-correct sequence monotonically increases |
| test_16 | Custom params in sequence computation respected |
| test_17 | BKT result is a probability, NOT a verification status |

**Total: 17 BKT tests, all passing.**

---

## 5. Preserved Phase 1–4 Invariants

- Phase 1 4-factor scoring model preserved: `0.35A + 0.20Q + 0.30P + 0.15E`
- Phase 4 grounding thresholds unchanged: Grounded ≥ 0.65 / Weak 0.48–0.65 / Insufficient < 0.48
- IRT Rasch 1PL model unchanged: `P = 1 / (1 + exp(-(θ - b)))`
- BKT is additive, not replacing IRT
- Officer data isolation enforced

---

## 6. Regression Test Count at Phase 5 Completion

**157 pre-existing tests + 17 new BKT tests = 174 passing**
*(Note: 22 Phase 6 task readiness tests were also added; full suite = 196)*
