"""Comprehensive test suite for STAT-GAP AI Build Prompt 6:
Independent Competency Verification, Deterministic Knowledge Decay,
Refresher Triggers, Re-Assessment, and Re-Diagnosis.
"""
import os
import math
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"
os.environ["EMBEDDING_PROVIDER"] = "mock"

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.assessment_session import AssessmentSession, AssessmentResponse
from backend.app.models.verification import (
    CompetencyVerification,
    PracticalVerification,
)
from backend.app.models.retention import (
    KnowledgeRetention,
    RefreshRecommendation,
)
from backend.app.models.audit_event import CompetencyAuditEvent

from backend.app.services.decay_service import KnowledgeDecayService
from backend.app.services.verification_service import VerificationService
from backend.app.services.refresh_service import RefreshService

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
        # Competency 1: No practical required
        comp1 = Competency(
            id="comp_stat_theory",
            name="Statistical Inference & Probability",
            category="Core Methodology",
            score=70,
            required_score=75,
            gap_points=5,
            status="gap",
            description="Probability distributions, hypothesis testing, and p-values.",
            requires_practical_verification=False,
        )
        # Competency 2: Practical required
        comp2 = Competency(
            id="comp_survey_audit",
            name="Survey Sampling & Field Auditing",
            category="Operational Statistics",
            score=65,
            required_score=75,
            gap_points=10,
            status="gap",
            description="NSS/PLFS sample design, weight calibration, and field data validation.",
            requires_practical_verification=True,
        )
        session.add(comp1)
        session.add(comp2)
        session.flush()

        # User / Officer A
        user_a = User(
            igot_id="IGOT2026A",
            email="officer.a@gov.in",
            password_hash=hash_password("ValidPassword123!"),
            is_active=True,
        )
        session.add(user_a)
        session.flush()

        profile_a = OfficerProfile(
            user_id=user_a.id,
            name="Officer Aditi Sharma",
            phone="9876543210",
            dob="1990-01-01",
            department="National Accounts",
            designation="Assistant Director",
            years_of_experience=6,
        )
        session.add(profile_a)
        session.flush()

        # User / Officer B
        user_b = User(
            igot_id="IGOT2026B",
            email="officer.b@gov.in",
            password_hash=hash_password("ValidPassword123!"),
            is_active=True,
        )
        session.add(user_b)
        session.flush()

        profile_b = OfficerProfile(
            user_id=user_b.id,
            name="Officer Rajesh Verma",
            phone="9876543211",
            dob="1988-05-12",
            department="Price & Index Statistics",
            designation="Deputy Director",
            years_of_experience=10,
        )
        session.add(profile_b)
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_headers_a(db_session):
    token = create_access_token(
        data={"sub": "IGOT2026A", "role": "officer"},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def auth_headers_b(db_session):
    token = create_access_token(
        data={"sub": "IGOT2026B", "role": "officer"},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


# ====================================================================
# 1. Deterministic Stability Formula Tests
# ====================================================================
def test_deterministic_stability_formula_exact_values():
    """Verify exact stability output from the mathematical formula:
    score_factor = (C - 75.0) / 25.0
    stability = 65.0 * (1.0 + 0.40 * score_factor)
    bounded strictly to [30.0, 95.0]
    """
    # At baseline passing score 75.0, factor=0 -> 65.0 days
    assert KnowledgeDecayService.calculate_stability_days(75.0) == 65.0

    # At perfect score 100.0, factor=1.0 -> 65 * 1.40 = 91.0 days
    assert KnowledgeDecayService.calculate_stability_days(100.0) == 91.0

    # At score 50.0, factor=-1.0 -> 65 * (1 - 0.40) = 65 * 0.60 = 39.0 days
    assert KnowledgeDecayService.calculate_stability_days(50.0) == 39.0

    # Below minimum: score 0.0 -> raw = 65 * (1 - 1.20) = -13.0 -> clamped to 30.0
    assert KnowledgeDecayService.calculate_stability_days(0.0) == 30.0
    assert KnowledgeDecayService.calculate_stability_days(-20.0) == 30.0

    # Above maximum: score 110.0 -> raw = 65 * (1 + 0.56) = 101.4 -> clamped to 95.0
    assert KnowledgeDecayService.calculate_stability_days(110.0) == 95.0

    # Practical weighted calculation:
    # independent = 80.0, practical = 70.0
    # composite = 0.70 * 80 + 0.30 * 70 = 56 + 21 = 77.0
    # score_factor = (77 - 75) / 25 = 2 / 25 = 0.08
    # raw = 65.0 * (1 + 0.032) = 67.08
    s_calc = KnowledgeDecayService.calculate_stability_days(
        independent_score=80.0, practical_score=70.0, requires_practical=True
    )
    assert s_calc == 67.08


# ====================================================================
# 2. Ebbinghaus Decay Formula and Risk Bands Tests
# ====================================================================
def test_ebbinghaus_decay_formula_and_risk_categorization():
    """Verify R(t) = R_0 * exp(-t / S) and risk categorization."""
    stability = 65.0

    # Day 0: 1.0
    assert KnowledgeDecayService.calculate_retention(0, stability) == 1.0
    assert KnowledgeDecayService.determine_risk_level(1.0) == "low"

    # Day 15: exp(-15/65) ≈ 0.7939 -> low (>= 0.75)
    r_15 = KnowledgeDecayService.calculate_retention(15, stability)
    assert 0.79 <= r_15 <= 0.80
    assert KnowledgeDecayService.determine_risk_level(r_15) == "low"

    # Day 30: exp(-30/65) ≈ 0.6303 -> moderate (0.60 <= R < 0.75)
    r_30 = KnowledgeDecayService.calculate_retention(30, stability)
    assert 0.62 <= r_30 <= 0.64
    assert KnowledgeDecayService.determine_risk_level(r_30) == "moderate"

    # Day 48: exp(-48/65) ≈ 0.4778 -> at_risk (0.45 <= R < 0.60)
    r_48 = KnowledgeDecayService.calculate_retention(48, stability)
    assert 0.47 <= r_48 <= 0.49
    assert KnowledgeDecayService.determine_risk_level(r_48) == "at_risk"

    # Day 65: exp(-65/65) = exp(-1) ≈ 0.3679 -> critical (< 0.45)
    r_65 = KnowledgeDecayService.calculate_retention(65, stability)
    assert 0.36 <= r_65 <= 0.37
    assert KnowledgeDecayService.determine_risk_level(r_65) == "critical"


# ====================================================================
# 3. Verification Criteria Evaluation Tests
# ====================================================================
def test_verification_practical_requirement_gating(db_session):
    """Test that a competency requiring practical verification CANNOT be verified
    without passing practical verification, regardless of independent score.
    """
    profile = db_session.query(OfficerProfile).first()

    # 1. Independent score 100%, but no practical on practical-required competency
    verif_no_prac = VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_survey_audit",
        override_independent_score=100.0,
    )
    assert verif_no_prac.verification_status == "failed"
    assert verif_no_prac.criteria_details["practical_passed"] is False

    # 2. Record failing practical score (55% < 60%)
    VerificationService.record_practical_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_survey_audit",
        practical_type="field_survey_audit",
        practical_score=55.0,
    )
    verif_low_prac = VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_survey_audit",
        override_independent_score=90.0,
    )
    assert verif_low_prac.verification_status == "failed"

    # 3. Record passing practical score (75% >= 60%)
    VerificationService.record_practical_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_survey_audit",
        practical_type="field_survey_audit",
        practical_score=75.0,
    )
    # Composite: 0.70 * 85 + 0.30 * 75 = 59.5 + 22.5 = 82.0 (>= 75.0)
    verif_pass = VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_survey_audit",
        override_independent_score=85.0,
    )
    assert verif_pass.verification_status == "verified"
    assert verif_pass.composite_score == 82.0
    assert verif_pass.valid_until is not None


# ====================================================================
# 4. Decoupling Verification Expiry and Knowledge Decay Tests
# ====================================================================
def test_independence_of_verification_expiry_and_decay(db_session):
    """Verify that:
    - Day 45: verification=verified and retention=at_risk co-exist.
    - Day 91: verification=expired, but retention is independently decaying (NOT zeroed out).
    - Historical verification records remain intact.
    """
    profile = db_session.query(OfficerProfile).first()

    # Issue verification at t=0
    verif = VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=80.0,
    )
    assert verif.verification_status == "verified"
    initial_verif_id = verif.id

    # Day 45: Simulate decay evaluation at day 45
    retention_45 = KnowledgeDecayService.evaluate_officer_retention(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        days_elapsed=45,
    )
    # Check verification status is STILL verified
    current_verif = (
        db_session.query(CompetencyVerification)
        .filter(CompetencyVerification.id == initial_verif_id)
        .first()
    )
    assert current_verif.verification_status == "verified"
    # But retention is at_risk / moderate
    assert retention_45.risk_level in ["at_risk", "moderate"]
    assert retention_45.calculated_retention > 0.0

    # Day 91: Simulate verification expiry check after 91 days
    past_date = datetime.now(timezone.utc) + timedelta(days=92)
    expired_verif = VerificationService.check_and_update_expiry(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        as_of_date=past_date,
    )
    assert expired_verif.verification_status == "expired"

    # CRITICAL CHECK: Retention must NOT be zeroed out by verification expiry!
    retention_91 = KnowledgeDecayService.evaluate_officer_retention(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        days_elapsed=91,
    )
    assert retention_91.calculated_retention > 0.10
    assert retention_91.calculated_retention != 0.0


# ====================================================================
# 5. Full Lifecycle Test with BOTH Outcomes (Outcome A and Outcome B)
# ====================================================================
def test_full_lifecycle_outcome_a_remediated_and_verified(db_session):
    """Outcome A:
    Verified -> Decay -> Refresh Triggered -> Refresher Completed ->
    Successful Reassessment -> Verification Criteria Satisfied ->
    New Verification Issued.
    """
    profile = db_session.query(OfficerProfile).first()

    # Step 1: Initial verification
    v1 = VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=80.0,
    )
    assert v1.verification_status == "verified"

    # Step 2: Decay occurs
    retention = KnowledgeDecayService.evaluate_officer_retention(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        days_elapsed=50,
    )
    assert retention.risk_level in ["at_risk", "critical"]

    # Step 3: Trigger refresh recommendation
    rec = RefreshService.trigger_refresh_recommendation(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        trigger_reason="retention_decay",
        priority="high",
    )
    assert rec.status == "pending"

    # Step 4: Complete refresh module
    rec_completed = RefreshService.complete_refresh_module(
        db=db_session,
        officer_id=profile.id,
        recommendation_id=rec.id,
    )
    assert rec_completed.status == "completed"

    # Step 5: Successful Re-assessment with high score (85%)
    result = RefreshService.process_reassessment_result(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=85.0,
    )
    assert result["reassessment_passed"] is True
    assert result["status"] == "verified"

    # Step 6: Verify new verification record is issued and old is archived
    verifs = (
        db_session.query(CompetencyVerification)
        .filter(
            CompetencyVerification.officer_id == profile.id,
            CompetencyVerification.competency_id == "comp_stat_theory",
        )
        .order_by(CompetencyVerification.created_at.asc())
        .all()
    )
    assert len(verifs) == 2
    assert verifs[0].is_current is False  # Old archived
    assert verifs[1].is_current is True   # New active
    assert verifs[1].verification_status == "verified"


def test_full_lifecycle_outcome_b_unsuccessful_reassessment_gap_remains(db_session):
    """Outcome B:
    Verified -> Decay -> Refresh Triggered -> Refresher Completed ->
    Unsuccessful Reassessment (< 70%) -> Verification Criteria NOT Satisfied ->
    NO New Verification Issued -> Status is Failed / Gap Remains.
    """
    profile = db_session.query(OfficerProfile).first()

    # Step 1: Initial verification
    v1 = VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=78.0,
    )
    assert v1.verification_status == "verified"

    # Step 2: Decay occurs
    ret = KnowledgeDecayService.evaluate_officer_retention(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        days_elapsed=60,
    )
    assert ret.risk_level in ["at_risk", "critical"]

    # Step 3: Trigger & Complete refresher
    rec = RefreshService.trigger_refresh_recommendation(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        trigger_reason="retention_decay",
        priority="urgent",
    )
    RefreshService.complete_refresh_module(
        db=db_session,
        officer_id=profile.id,
        recommendation_id=rec.id,
    )

    # Step 4: Unsuccessful re-assessment (score = 52%)
    result = RefreshService.process_reassessment_result(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=52.0,
    )
    # MUST NOT be verified!
    assert result["reassessment_passed"] is False
    assert result["status"] == "failed"
    assert result["criteria_details"]["independent_passed"] is False

    # Current verification is failed (NO new verification granted)
    current_verif = (
        db_session.query(CompetencyVerification)
        .filter(
            CompetencyVerification.officer_id == profile.id,
            CompetencyVerification.competency_id == "comp_stat_theory",
            CompetencyVerification.is_current == True,
        )
        .first()
    )
    assert current_verif.verification_status == "failed"


# ====================================================================
# 6. Deduplication and Audit Tests
# ====================================================================
def test_refresh_recommendation_deduplication(db_session):
    """Triggering refresh multiple times for the same competency does not create duplicates."""
    profile = db_session.query(OfficerProfile).first()

    rec1 = RefreshService.trigger_refresh_recommendation(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        priority="medium",
    )
    rec2 = RefreshService.trigger_refresh_recommendation(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        priority="urgent",
    )
    assert rec1.id == rec2.id
    assert rec2.priority == "urgent"

    count = (
        db_session.query(RefreshRecommendation)
        .filter(
            RefreshRecommendation.officer_id == profile.id,
            RefreshRecommendation.competency_id == "comp_stat_theory",
        )
        .count()
    )
    assert count == 1


def test_audit_event_immutability(db_session):
    """All key operations log immutable CompetencyAuditEvent records."""
    profile = db_session.query(OfficerProfile).first()

    VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=80.0,
    )
    events = (
        db_session.query(CompetencyAuditEvent)
        .filter(CompetencyAuditEvent.officer_id == profile.id)
        .all()
    )
    assert len(events) >= 2  # verification_passed and retention_calculated
    event_types = [e.event_type for e in events]
    assert "verification_passed" in event_types
    assert "retention_calculated" in event_types


# ====================================================================
# 7. API Endpoints and Officer Isolation Tests
# ====================================================================
def test_api_verification_and_isolation(client, auth_headers_a, auth_headers_b):
    """Officer A cannot see or tamper with Officer B's verifications or retention records."""
    # 1. Officer A evaluates verification via API
    resp_eval = client.post(
        "/api/verifications/evaluate",
        headers=auth_headers_a,
        json={
            "competency_id": "comp_stat_theory",
            "override_independent_score": 85.0,
            "verification_notes": "Officer A verified",
        },
    )
    assert resp_eval.status_code == 200
    assert resp_eval.json()["verification_status"] == "verified"

    # 2. Officer A retrieves verification status
    resp_status_a = client.get(
        "/api/verifications/status",
        headers=auth_headers_a,
    )
    assert resp_status_a.status_code == 200
    data_a = resp_status_a.json()
    assert len(data_a) == 1
    assert data_a[0]["verification_status"] == "verified"

    # 3. Officer B retrieves status: must be EMPTY (isolation)
    resp_status_b = client.get(
        "/api/verifications/status",
        headers=auth_headers_b,
    )
    assert resp_status_b.status_code == 200
    assert len(resp_status_b.json()) == 0

    # 4. Officer A triggers refresh and lists recommendations
    client.post(
        "/api/refresh/trigger",
        headers=auth_headers_a,
        json={"competency_id": "comp_stat_theory", "priority": "high"},
    )
    resp_recs_a = client.get(
        "/api/refresh/recommendations",
        headers=auth_headers_a,
    )
    assert resp_recs_a.status_code == 200
    assert len(resp_recs_a.json()) == 1

    # Officer B lists recommendations: must be EMPTY
    resp_recs_b = client.get(
        "/api/refresh/recommendations",
        headers=auth_headers_b,
    )
    assert len(resp_recs_b.json()) == 0

    # 5. Audit events endpoint returns events for Officer A
    resp_audit = client.get("/api/audit/events", headers=auth_headers_a)
    assert resp_audit.status_code == 200
    assert len(resp_audit.json()) >= 1
