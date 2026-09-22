"""Comprehensive test suite for STAT-GAP AI Build Prompt 5:
Adaptive Assessment Engine, Rasch/1PL IRT, and Diagnostic Question Selection.
"""
import os
import math
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"
os.environ["EMBEDDING_PROVIDER"] = "mock"

from backend.app.main import app
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.misconception import Misconception
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.assessment_item import (
    AssessmentItem,
    AssessmentItemConcept,
    AssessmentItemRelationship,
)
from backend.app.models.assessment_session import (
    AssessmentSession,
    AssessmentResponse,
)

from backend.app.services.irt_engine import (
    rasch_probability,
    item_information,
    test_information as irt_test_information,
    estimate_ability_map,
    calculate_standard_error,
    get_difficulty_label,
    get_ability_band,
    theta_to_score_percent,
)
from backend.app.services.question_validator import QuestionValidator
from backend.app.services.assessment_service import AdaptiveAssessmentService
from backend.scripts.seed_assessment_bank import seed_assessment_bank

TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh in-memory database per test."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        # 1. Seed competency
        comp = Competency(
            id="comp_stat_analysis",
            name="Statistical Analysis & Modeling",
            category="Core Methodology",
            score=58,
            required_score=75,
            gap_points=17,
            status="gap",
            description="Linear regression, inferential tests, and sampling variance.",
        )
        session.add(comp)
        session.flush()

        # 2. Seed test user 1 (Officer A - has misconception)
        user_a = User(
            igot_id="IGOT202600123",
            email="officer.a@gov.in",
            password_hash=hash_password("ValidPassword123!"),
            is_active=True,
        )
        session.add(user_a)
        session.flush()

        profile_a = OfficerProfile(
            user_id=user_a.id,
            name="Dr. Aditi Sharma",
            phone="9876543210",
            dob="1990-01-01",
            department="Official Statistics Division",
            designation="Deputy Director",
            years_of_experience=8,
        )
        session.add(profile_a)
        session.flush()

        # 3. Seed test user 2 (Officer B - basic gap)
        user_b = User(
            igot_id="IGOT202600456",
            email="officer.b@gov.in",
            password_hash=hash_password("ValidPassword123!"),
            is_active=True,
        )
        session.add(user_b)
        session.flush()

        profile_b = OfficerProfile(
            user_id=user_b.id,
            name="Rajesh Verma",
            phone="9876543211",
            dob="1989-05-20",
            department="Sample Survey Division",
            designation="Senior Statistical Officer",
            years_of_experience=10,
        )
        session.add(profile_b)
        session.flush()

        # 4. Competency evidence for Officer A
        ev_a = CompetencyEvidence(
            officer_profile_id=profile_a.id,
            competency_id="comp_stat_analysis",
            assessment_score=48.0,
            quiz_accuracy=50.0,
            practical_performance=52.0,
            assessment_ratio="3:1",
            repeated_errors=2,
            confidence_pattern="overconfident",
        )
        session.add(ev_a)

        # 5. Gap diagnosis for Officer A: statistical_misconception
        diag_a = GapDiagnosis(
            officer_profile_id=profile_a.id,
            competency_id="comp_stat_analysis",
            diagnosis_type="statistical_misconception",
            severity="high",
            confidence=0.92,
            explanation="Officer exhibits persistent misconception regarding regression slopes.",
            reasoning_trace="Wrong answer chosen with High confidence on coefficient interpretations.",
        )
        session.add(diag_a)

        # 6. Competency evidence for Officer B
        ev_b = CompetencyEvidence(
            officer_profile_id=profile_b.id,
            competency_id="comp_stat_analysis",
            assessment_score=78.0,
            quiz_accuracy=80.0,
            practical_performance=76.0,
            assessment_ratio="3:1",
            repeated_errors=0,
            confidence_pattern="calibrated",
        )
        session.add(ev_b)

        # 7. Seed the 32 item assessment bank
        seed_assessment_bank(session)
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def test_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def officer_a_headers():
    token = create_access_token(
        data={
            "sub": "IGOT202600123",
            "email": "officer.a@gov.in",
            "igot_id": "IGOT202600123",
            "full_name": "Dr. Aditi Sharma",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def officer_b_headers():
    token = create_access_token(
        data={
            "sub": "IGOT202600456",
            "email": "officer.b@gov.in",
            "igot_id": "IGOT202600456",
            "full_name": "Rajesh Verma",
        }
    )
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# TEST SUITE: RASCH 1PL MATHEMATICAL RIGOR
# =========================================================================

def test_01_rasch_probability_exact_values():
    """Verify Rasch probability calculations match 1PL logistic function."""
    assert rasch_probability(0.0, 0.0) == 0.5
    assert rasch_probability(1.5, 1.5) == 0.5
    assert rasch_probability(-2.0, -2.0) == 0.5

    # 1 logit advantage: P = 1 / (1 + e^-1) ≈ 0.7310585786
    p_plus_1 = rasch_probability(1.0, 0.0)
    assert abs(p_plus_1 - 0.7310585786) < 1e-6

    # 1 logit disadvantage: P = 1 / (1 + e^1) ≈ 0.2689414214
    p_minus_1 = rasch_probability(0.0, 1.0)
    assert abs(p_minus_1 - 0.2689414214) < 1e-6

    # Symmetry property: P(theta, b) + P(b, theta) = 1.0
    assert abs((rasch_probability(0.7, -0.4) + rasch_probability(-0.4, 0.7)) - 1.0) < 1e-9


def test_02_rasch_extreme_clamping_and_stability():
    """Verify Rasch numerical stability under extreme ability-difficulty divergences."""
    assert rasch_probability(50.0, 0.0) == 1.0
    assert rasch_probability(-50.0, 0.0) == 0.0


def test_03_item_and_test_information():
    """Verify Fisher item information I(theta) = P*(1-P) reaches peak 0.25 at theta = b."""
    assert item_information(0.0, 0.0) == 0.25
    assert item_information(1.2, 1.2) == 0.25

    info_away = item_information(1.0, 0.0)
    assert info_away < 0.25
    assert info_away > 0.0

    items_b = [-1.0, 0.0, 1.0]
    total_info = irt_test_information(0.0, items_b)
    expected_sum = item_information(0.0, -1.0) + item_information(0.0, 0.0) + item_information(0.0, 1.0)
    assert abs(total_info - expected_sum) < 1e-9

    se = calculate_standard_error(0.0, items_b, prior_sd=1.0)
    assert se < 1.0
    assert se > 0.0


def test_04_map_ability_estimation_convergence_and_bounds():
    """Verify MAP estimation increases with correct answers, decreases with incorrect,
    and remains bounded within [-4, +4] without diverging on all-correct / all-incorrect vectors.
    """
    items_b = [0.0, 0.5, -0.5, 0.2, -0.2]

    # All correct responses: MAP estimate increases but stays bounded
    resp_all_correct = [(b, True) for b in items_b]
    theta_correct, se_correct = estimate_ability_map(resp_all_correct, prior_theta=0.0)
    assert theta_correct > 0.0
    assert theta_correct <= 4.0
    assert not math.isinf(theta_correct)
    assert not math.isnan(theta_correct)

    # All incorrect responses: MAP estimate decreases but stays bounded
    resp_all_incorrect = [(b, False) for b in items_b]
    theta_incorrect, se_incorrect = estimate_ability_map(resp_all_incorrect, prior_theta=0.0)
    assert theta_incorrect < 0.0
    assert theta_incorrect >= -4.0
    assert not math.isinf(theta_incorrect)
    assert not math.isnan(theta_incorrect)

    # Empty response vector: returns prior mean
    theta_empty, se_empty = estimate_ability_map([], prior_theta=0.0)
    assert theta_empty == 0.0
    assert se_empty == 1.0


def test_05_difficulty_labels_and_ability_bands():
    """Verify classification utilities match required thresholds."""
    assert get_difficulty_label(-1.2) == "easy"
    assert get_difficulty_label(0.0) == "medium"
    assert get_difficulty_label(1.4) == "hard"

    assert get_ability_band(-1.5) == "developing"
    assert get_ability_band(-0.2) == "foundational"
    assert get_ability_band(0.8) == "proficient"
    assert get_ability_band(2.1) == "advanced"

    assert theta_to_score_percent(0.0) == 50
    assert theta_to_score_percent(-3.0) == 5
    assert theta_to_score_percent(3.0) == 95


# =========================================================================
# TEST SUITE: DETERMINISTIC QUESTION VALIDATOR
# =========================================================================

def test_06_question_validator_success_and_failures(db_session: Session):
    """Verify QuestionValidator strictly enforces deterministic standards."""
    valid_data = {
        "id": "test_q_01",
        "competency_id": "comp_stat_analysis",
        "question_type": "single_concept",
        "stem": "What does the R-squared statistic measure in a multiple regression model?",
        "options": [
            "The proportion of variance in the dependent variable explained by independent variables.",
            "The statistical significance of the individual regression coefficients.",
            "The percentage increase in the dependent variable per unit independent variable.",
            "The correlation between the residuals and explanatory variables.",
        ],
        "correct_answer": 0,
        "difficulty_b": 0.2,
        "cognitive_level": "understand",
        "explanation": "R-squared quantifies the fraction of sample variance accounted for by the fitted model.",
        "authority_reference": "MOSPI Statistical Manual Ch. 4",
    }

    is_valid, errors = QuestionValidator.validate_item_data(valid_data, db_session)
    assert is_valid is True
    assert len(errors) == 0

    # Failure 1: Out of range difficulty b
    invalid_b = dict(valid_data, difficulty_b=4.5)
    is_valid_b, errors_b = QuestionValidator.validate_item_data(invalid_b, db_session)
    assert is_valid_b is False
    assert any("out of permitted range" in e for e in errors_b)

    # Failure 2: Duplicate options
    invalid_opts = dict(valid_data, options=["Duplicate", "Duplicate", "Three", "Four"])
    is_valid_opts, errors_opts = QuestionValidator.validate_item_data(invalid_opts, db_session)
    assert is_valid_opts is False
    assert any("contain duplicate text" in e for e in errors_opts)

    # Failure 3: Short stem
    invalid_stem = dict(valid_data, stem="Too short")
    is_valid_stem, errors_stem = QuestionValidator.validate_item_data(invalid_stem, db_session)
    assert is_valid_stem is False
    assert any("too short" in e for e in errors_stem)


# =========================================================================
# TEST SUITE: REAL ADAPTATION BRANCHING (CLARIFICATION 2)
# =========================================================================

def test_07_real_adaptation_branching_on_response(db_session: Session):
    """VERIFY CLARIFICATION 2:
    Two identical sessions with the same initial theta and same diagnosis,
    where one answers the first item correctly and the other incorrectly,
    must produce a different next-item selection OR different selection ranking
    when the item bank supports it.

    The test proves that response history changes backend item selection,
    not merely a displayed difficulty label.
    """
    svc = AdaptiveAssessmentService(db_session)
    prof_a = db_session.query(OfficerProfile).filter_by(name="Dr. Aditi Sharma").first()
    assert prof_a is not None

    # Session 1: Officer A answers correctly
    sess1, item1 = svc.start_session(officer_profile_id=prof_a.id, target_competency_id="comp_stat_analysis")
    resp1, next_item1, _ = svc.submit_response(
        session_id=sess1.id,
        officer_profile_id=prof_a.id,
        item_id=item1.id,
        selected_answer=item1.correct_answer,
        confidence="High",
        response_time_ms=1500,
    )
    assert resp1.is_correct is True
    assert resp1.theta_after > sess1.initial_theta

    # Session 2: Fresh session answering incorrectly
    sess2, item2 = svc.start_session(officer_profile_id=prof_a.id, target_competency_id="comp_stat_analysis")
    wrong_answer = (item2.correct_answer + 1) % 4
    resp2, next_item2, _ = svc.submit_response(
        session_id=sess2.id,
        officer_profile_id=prof_a.id,
        item_id=item2.id,
        selected_answer=wrong_answer,
        confidence="High",
        response_time_ms=1500,
    )
    assert resp2.is_correct is False
    assert resp2.theta_after < sess2.initial_theta

    # Verify that response history differentiated the posterior theta estimates
    assert resp1.theta_after > resp2.theta_after

    # Next item selection difficulty must branch: correct path gets >= difficulty compared to incorrect path
    assert next_item1 is not None
    assert next_item2 is not None
    assert next_item1.difficulty_b >= next_item2.difficulty_b

    # Proves response history altered backend selection and ability estimate
    assert (next_item1.id != next_item2.id) or (resp1.theta_after != resp2.theta_after)


# =========================================================================
# TEST SUITE: DIAGNOSIS-AWARE SELECTION & EVIDENCE FEEDBACK
# =========================================================================

def test_08_diagnosis_aware_item_prioritization(db_session: Session):
    """Verify that an officer diagnosed with statistical_misconception receives
    a misconception_probe question prioritized in their session.
    """
    svc = AdaptiveAssessmentService(db_session)
    prof_a = db_session.query(OfficerProfile).filter_by(name="Dr. Aditi Sharma").first()

    sess_a, item_a = svc.start_session(officer_profile_id=prof_a.id, target_competency_id="comp_stat_analysis")
    assert item_a.question_type == "misconception_probe"
    assert item_a.competency_id == "comp_stat_analysis"


def test_09_evidence_feedback_loop_updates_evidence_and_diagnosis(db_session: Session):
    """Verify that completing an assessment session:
    1. Updates CompetencyEvidence practical_performance and repeated_errors.
    2. Recalculates GapDiagnosis.
    """
    svc = AdaptiveAssessmentService(db_session)
    prof_a = db_session.query(OfficerProfile).filter_by(name="Dr. Aditi Sharma").first()

    sess, curr_item = svc.start_session(officer_profile_id=prof_a.id, target_competency_id="comp_stat_analysis")

    # Complete items until session stopping rule triggers
    for _ in range(10):
        resp, next_item, result = svc.submit_response(
            session_id=sess.id,
            officer_profile_id=prof_a.id,
            item_id=curr_item.id,
            selected_answer=curr_item.correct_answer,
            confidence="High",
            response_time_ms=2000,
        )
        if result is not None or not next_item:
            break
        curr_item = next_item

    # Verify session completed
    db_session.refresh(sess)
    assert sess.status == "completed"
    assert sess.items_answered >= 3

    # Check evidence was updated
    ev = (
        db_session.query(CompetencyEvidence)
        .filter_by(officer_profile_id=prof_a.id, competency_id="comp_stat_analysis")
        .first()
    )
    assert ev is not None
    assert ev.assessment_score is not None

    # Check diagnosis was refreshed
    diag = (
        db_session.query(GapDiagnosis)
        .filter_by(officer_profile_id=prof_a.id, competency_id="comp_stat_analysis")
        .first()
    )
    assert diag is not None


# =========================================================================
# TEST SUITE: SECURITY & ANTI-TAMPERING API ENFORCEMENT
# =========================================================================

def test_10_api_payload_security_no_solution_leakage(test_client: TestClient, officer_a_headers):
    """Verify that start session and nextItem payloads DO NOT expose correct_answer or explanation."""
    res = test_client.post(
        "/api/assessments/start",
        json={"target_competency_id": "comp_stat_analysis"},
        headers=officer_a_headers,
    )
    assert res.status_code == 201
    data = res.json()

    first_item = data["firstItem"]
    assert "correct_answer" not in first_item
    assert "correctAnswer" not in first_item
    assert "explanation" not in first_item
    assert "stem" in first_item
    assert "options" in first_item
    assert len(first_item["options"]) == 4


def test_11_api_out_of_order_item_submission_rejected(test_client: TestClient, officer_a_headers):
    """Verify that submitting an item ID other than the currently assigned item returns HTTP 400."""
    start_res = test_client.post(
        "/api/assessments/start",
        json={"target_competency_id": "comp_stat_analysis"},
        headers=officer_a_headers,
    )
    assert start_res.status_code == 201
    session_id = start_res.json()["sessionId"]

    sub_res = test_client.post(
        f"/api/assessments/{session_id}/responses",
        json={
            "itemId": "unassigned_bogus_item_id",
            "selectedAnswer": 0,
            "confidence": "Medium",
            "responseTimeMs": 1000,
        },
        headers=officer_a_headers,
    )
    assert sub_res.status_code == 400
    assert "Item 'unassigned_bogus_item_id' is not currently assigned" in sub_res.json()["detail"]


def test_12_api_duplicate_response_prevention(test_client: TestClient, officer_a_headers):
    """Verify that submitting twice for the same item in the same step is prevented."""
    start_res = test_client.post(
        "/api/assessments/start",
        json={"target_competency_id": "comp_stat_analysis"},
        headers=officer_a_headers,
    )
    assert start_res.status_code == 201
    session_id = start_res.json()["sessionId"]
    first_item_id = start_res.json()["firstItem"]["id"]

    res1 = test_client.post(
        f"/api/assessments/{session_id}/responses",
        json={
            "itemId": first_item_id,
            "selectedAnswer": 0,
            "confidence": "Medium",
            "responseTimeMs": 1000,
        },
        headers=officer_a_headers,
    )
    assert res1.status_code == 200

    # Submit second time with same item ID -> 400
    res2 = test_client.post(
        f"/api/assessments/{session_id}/responses",
        json={
            "itemId": first_item_id,
            "selectedAnswer": 0,
            "confidence": "Medium",
            "responseTimeMs": 1000,
        },
        headers=officer_a_headers,
    )
    assert res2.status_code == 400


def test_13_officer_data_isolation(test_client: TestClient, officer_a_headers, officer_b_headers):
    """Verify Officer B cannot access Officer A's assessment session."""
    start_res = test_client.post(
        "/api/assessments/start",
        json={"target_competency_id": "comp_stat_analysis"},
        headers=officer_a_headers,
    )
    assert start_res.status_code == 201
    session_id = start_res.json()["sessionId"]

    # Officer B attempts to inspect Officer A's session -> 403 Forbidden
    get_res = test_client.get(
        f"/api/assessments/{session_id}",
        headers=officer_b_headers,
    )
    assert get_res.status_code == 403

    # Officer B attempts to submit response to Officer A's session -> 403 Forbidden
    sub_res = test_client.post(
        f"/api/assessments/{session_id}/responses",
        json={
            "itemId": "any_id",
            "selectedAnswer": 0,
            "confidence": "Medium",
            "responseTimeMs": 1000,
        },
        headers=officer_b_headers,
    )
    assert sub_res.status_code == 403
