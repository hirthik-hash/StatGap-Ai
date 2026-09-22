"""End-to-End Statutory Demonstration Lifecycle Test (Build Prompt 7 Final Verification).

Executes the complete 13-stage civil service competency lifecycle:
Register -> Login -> Profile -> Mock-iGOT Import -> Competency Evidence ->
Gap Diagnosis -> Adaptive Assessment -> Verification -> Retention Decay ->
Refresher Trigger -> Re-Assessment -> Verification Renewal -> Mock-iGOT Export.

Covers both Outcome A (Remediated) and Outcome B (Persistent Gap).
"""
from __future__ import annotations

import os
import json
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"
os.environ["EMBEDDING_PROVIDER"] = "mock"
os.environ["RATE_LIMIT_ENABLED"] = "false"

from backend.app.main import app
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.assessment_item import AssessmentItem
from backend.app.models.verification import CompetencyVerification
from backend.app.models.retention import KnowledgeRetention

from backend.app.services.assessment_service import AdaptiveAssessmentService
from backend.app.services.decay_service import KnowledgeDecayService
from backend.app.services.diagnosis_service import GapDiagnosisService
from backend.app.services.refresh_service import RefreshService
from backend.app.services.verification_service import VerificationService
from backend.app.integrations.igot.service import IGOTIntegrationService
from backend.app.integrations.igot.mock_igot_adapter import MockIGOTAdapter

TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        # Seed test competency
        comp = Competency(
            id="comp_stat_theory",
            name="Statistical Inference & Modeling",
            category="Core Methodology",
            score=58,
            required_score=75,
            gap_points=17,
            status="gap",
            description="Statistical theory and econometric regression.",
            requires_practical_verification=False,
        )
        session.add(comp)

        # Seed assessment items
        item1 = AssessmentItem(
            id="item_stat_01",
            competency_id="comp_stat_theory",
            stem="In a simple linear regression y = a + bx, what does b represent?",
            options=json.dumps(["Expected change in y per unit increase in x", "Correlation coefficient", "Intercept value", "Residual sum"]),
            correct_answer=0,
            question_type="single_concept",
            difficulty_b=-0.2,
            discrimination_a=1.0,
            cognitive_level="understanding",
            explanation="The regression coefficient b represents the marginal change in the dependent variable.",
        )
        item2 = AssessmentItem(
            id="item_stat_02",
            competency_id="comp_stat_theory",
            stem="What is the consequence of heteroscedastic residuals in OLS estimation?",
            options=json.dumps(["Biased point estimates", "Inefficient standard errors and invalid t-tests", "Multicollinearity", "Endogeneity"]),
            correct_answer=1,
            question_type="misconception_probe",
            difficulty_b=0.5,
            discrimination_a=1.2,
            cognitive_level="analysis",
            explanation="Under heteroscedasticity, OLS estimates remain unbiased but standard errors are invalid.",
        )
        session.add(item1)
        session.add(item2)
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


# ====================================================================
# Full End-to-End Civil Service Lifecycle Demonstration
# ====================================================================
def test_full_statutory_lifecycle_outcome_a_remediated(client, db_session):
    """Demonstrates complete lifecycle for Outcome A (Successful remediation and iGOT export)."""
    # 1. Register Officer
    resp_reg = client.post(
        "/api/auth/register",
        json={
            "iGotId": "IGOT2026_E2E_01",
            "email": "officer.e2e1@gov.in",
            "password": "StrongPassword123!",
            "name": "Smt. Priya Nair",
            "department": "National Accounts Division",
            "designation": "Deputy Director",
            "phone": "9876543222",
            "dob": "1989-08-15",
            "yearsOfExperience": 7,
        },
    )
    assert resp_reg.status_code == 201

    # 2. Login
    resp_login = client.post(
        "/api/auth/login",
        json={"iGotId": "IGOT2026_E2E_01", "password": "StrongPassword123!"},
    )
    assert resp_login.status_code == 200
    token = resp_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Profile check
    resp_me = client.get("/api/auth/me", headers=headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["iGotId"] == "IGOT2026_E2E_01"

    # 4. Import Mock-iGOT Learning History
    resp_imp = client.post("/api/igot/import", headers=headers)
    assert resp_imp.status_code == 200
    imp_data = resp_imp.json()
    assert imp_data["imported_count"] >= 1

    # 5. Verify internal CompetencyEvidence populated with provenance
    profile = db_session.query(OfficerProfile).filter(OfficerProfile.name == "Smt. Priya Nair").first()
    evidences = db_session.query(CompetencyEvidence).filter(CompetencyEvidence.officer_profile_id == profile.id).all()
    assert len(evidences) >= 1
    assert evidences[0].source_system == "mock_igot"
    assert evidences[0].external_reference_id is not None

    # 6. Gap Diagnosis
    diag_service = GapDiagnosisService(db_session)
    user_obj = db_session.query(User).filter(User.id == profile.user_id).first()
    comp_obj = db_session.query(Competency).filter(Competency.id == "comp_stat_theory").first()
    diag = diag_service.diagnose_competency(user_obj, comp_obj)
    assert diag is not None

    # 7. Adaptive Assessment Session
    adapt_service = AdaptiveAssessmentService(db_session)
    session_obj, first_item = adapt_service.start_session(profile.id, "comp_stat_theory")
    assert session_obj.status == "active"
    assert first_item is not None

    # Submit correct responses
    adapt_service.submit_response(
        session_id=session_obj.id,
        officer_profile_id=profile.id,
        item_id=first_item.id,
        selected_answer=first_item.correct_answer,
        confidence="High",
        response_time_ms=1200,
    )

    # 8. Independent Verification
    verif = VerificationService.evaluate_verification(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=85.0,
    )
    assert verif.verification_status == "verified"
    assert verif.valid_until is not None

    # 9. Knowledge Decay Calculation
    ret = KnowledgeDecayService.evaluate_officer_retention(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        days_elapsed=45,
    )
    assert ret.calculated_retention > 0.0

    # 10. Refresher Recommendation Trigger
    rec = RefreshService.trigger_refresh_recommendation(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        trigger_reason="retention_decay",
    )
    assert rec.status == "pending"

    # Complete refresher
    RefreshService.complete_refresh_module(db=db_session, officer_id=profile.id, recommendation_id=rec.id)

    # 11. Re-Assessment with High Score (Outcome A)
    reassess_result = RefreshService.process_reassessment_result(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=88.0,
    )
    assert reassess_result["reassessment_passed"] is True
    assert reassess_result["status"] == "verified"

    # 12. Export verified credential to Mock-iGOT
    resp_exp = client.post("/api/igot/export/comp_stat_theory", headers=headers)
    assert resp_exp.status_code == 200
    assert resp_exp.json()["status"] == "synced"


def test_full_statutory_lifecycle_outcome_b_persistent_gap(client, db_session):
    """Demonstrates lifecycle for Outcome B (Refresher taken, but reassessment fails -> gap remains)."""
    # Create Officer
    user = User(
        igot_id="IGOT2026_E2E_02",
        email="officer.e2e2@gov.in",
        password_hash=hash_password("Password123!"),
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    profile = OfficerProfile(
        user_id=user.id,
        name="Shri Alok Mishra",
        phone="9876543223",
        dob="1987-03-21",
        department="Price Statistics Division",
        designation="Director",
        years_of_experience=12,
    )
    db_session.add(profile)
    db_session.commit()

    token = create_access_token(data={"sub": "IGOT2026_E2E_02", "role": "officer"}, expires_delta=timedelta(hours=1))
    headers = {"Authorization": f"Bearer {token}"}

    # Trigger and complete refresher
    rec = RefreshService.trigger_refresh_recommendation(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
    )
    RefreshService.complete_refresh_module(db=db_session, officer_id=profile.id, recommendation_id=rec.id)

    # Re-assessment with Failing Score (score = 50% < 70%)
    reassess_result = RefreshService.process_reassessment_result(
        db=db_session,
        officer_id=profile.id,
        competency_id="comp_stat_theory",
        override_independent_score=50.0,
    )
    # Verification criteria NOT satisfied
    assert reassess_result["reassessment_passed"] is False
    assert reassess_result["status"] == "failed"

    # Exporting unverified competency reports failure
    resp_exp = client.post("/api/igot/export/comp_stat_theory", headers=headers)
    assert resp_exp.status_code == 200
    # Status is failed because competency is not verified
    assert resp_exp.json()["status"] == "failed"
    assert resp_exp.json()["error_code"] == "NOT_VERIFIED"
