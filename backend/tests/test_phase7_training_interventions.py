"""Test Suite for Phase 7 — iGOT + NSSTA + TPAC Integration Layer + Training Intervention Optimizer.

Tests cover:
  1. TrainingResource normalization and model integrity
  2. iGOT Mock adapter catalogue and enrollment
  3. iGOT Not-configured Real adapter safe failure
  4. NSSTA adapter catalogue and residential/blended modules
  5. TPAC programme adapter and syllabus blueprints
  6. Idempotent synchronization and deduplication
  7. Duplicate prevention with unique constraints
  8. Recommendation scoring formula determinism
  9. Competency alignment factor
 10. Sub-skill alignment factor
 11. Task bottleneck relevance factor & explanation
 12. Prerequisite satisfaction and exclusion
 13. Max duration and delivery mode constraints handling
 14. Transparent, explainable reasoning generation
 15. RBAC & supervisor access
 16. Officer data isolation (no IDOR)
 17. Audit event generation for synchronization and recommendations
 18. Unavailable/unconfigured provider behavior
 19. Mock vs Real mode explicit separation
 20. End-to-End integration test (Officer -> Competency -> Gap -> Task Bottleneck -> Optimizer -> Recommendation -> Gap Change Effect)
"""
import os
import pytest
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
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.task_readiness import TaskDefinition, TaskRequirement
from backend.app.models.training_resource import TrainingResource
from backend.app.models.verification import CompetencyVerification
from backend.app.models.audit_event import CompetencyAuditEvent

from backend.app.integrations.training.igot_adapter import IgotTrainingAdapter
from backend.app.integrations.training.nssta_adapter import NSSTAAdapter
from backend.app.integrations.training.tpac_adapter import TPACProgrammeAdapter
from backend.app.integrations.training.factory import get_training_adapters, get_training_adapter
from backend.app.integrations.igot.real_igot_adapter import RealIGOTAdapter
from backend.app.services.training_sync_service import TrainingSyncService
from backend.app.services.training_optimizer_service import TrainingOptimizerService
from backend.app.schemas.training import TrainingConstraintInput

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
        # Seed Competencies
        c_sampling = Competency(id="comp_survey_audit", name="Survey Sampling & Design", category="Operational", score=60, required_score=80, gap_points=20, status="gap")
        c_theory = Competency(id="comp_stat_theory", name="Statistical Theory & Regression", category="Core", score=80, required_score=75, gap_points=0, status="competent")
        c_sna = Competency(id="comp_national_accounts", name="National Accounts & GVA", category="Core", score=55, required_score=75, gap_points=20, status="gap")
        c_val = Competency(id="comp_data_validation", name="Data Quality & CAPI Validation", category="Quality", score=70, required_score=70, gap_points=0, status="competent")
        session.add_all([c_sampling, c_theory, c_sna, c_val])
        session.flush()

        # Seed Users
        user_officer_1 = User(igot_id="IGOT7_OFF_1", email="off1@mospi.gov.in", password_hash=hash_password("ValidPassword123!"), role="officer", is_active=True)
        user_officer_2 = User(igot_id="IGOT7_OFF_2", email="off2@mospi.gov.in", password_hash=hash_password("ValidPassword123!"), role="officer", is_active=True)
        user_supervisor = User(igot_id="IGOT7_SUP_1", email="sup1@mospi.gov.in", password_hash=hash_password("ValidPassword123!"), role="supervisor", is_active=True)
        session.add_all([user_officer_1, user_officer_2, user_supervisor])
        session.flush()

        # Seed Profiles
        p1 = OfficerProfile(
            user_id=user_officer_1.id,
            name="Aditi Sharma",
            phone="9876543210",
            dob="1992-05-15",
            department="NSSO (FOD)",
            designation="Junior Statistical Officer",
            years_of_experience=3,
            cadre="Junior Statistical Officer (JSO)",
        )
        p2 = OfficerProfile(
            user_id=user_officer_2.id,
            name="Rajesh Kumar",
            phone="9876543211",
            dob="1988-08-20",
            department="National Accounts Division",
            designation="Senior Statistical Officer",
            years_of_experience=7,
            cadre="Senior Statistical Officer (SSO)",
        )
        session.add_all([p1, p2])
        session.flush()

        # Seed Officer Competency States for Officer 1 (Primary Gap: Survey Sampling)
        s1_sampling = OfficerCompetencyState(
            officer_profile_id=p1.id,
            competency_id="comp_survey_audit",
            current_level=0.55,
            required_level=0.80,
            gap=0.25,
            raw_gap=0.25,
            status="gap",
            gap_band="orange",
            confidence=0.85,
            confidence_category="HIGH_CONFIDENCE",
            evidence_count=3,
        )
        s1_theory = OfficerCompetencyState(
            officer_profile_id=p1.id,
            competency_id="comp_stat_theory",
            current_level=0.75,
            required_level=0.75,
            gap=0.0,
            raw_gap=0.0,
            status="competent",
            gap_band="green",
            confidence=0.90,
            confidence_category="HIGH_CONFIDENCE",
            evidence_count=3,
        )
        session.add_all([s1_sampling, s1_theory])

        # Seed Officer Competency States for Officer 2 (Primary Gap: National Accounts)
        s2_sna = OfficerCompetencyState(
            officer_profile_id=p2.id,
            competency_id="comp_national_accounts",
            current_level=0.45,
            required_level=0.80,
            gap=0.35,
            raw_gap=0.35,
            status="gap",
            gap_band="red",
            confidence=0.80,
            confidence_category="HIGH_CONFIDENCE",
            evidence_count=3,
        )
        session.add(s2_sna)

        # Seed Task Definition & Requirements (Survey Estimation task where Sampling is Bottleneck)
        task_survey = TaskDefinition(
            id="task_survey_est_p7",
            name="Produce Survey Estimate",
            description="Operational computation of official survey estimates from sample microdata",
            category="operational",
            cadre_applicable="All Cadres",
            is_active=True,
        )
        session.add(task_survey)
        session.flush()

        req_samp = TaskRequirement(
            task_id=task_survey.id,
            competency_id="comp_survey_audit",
            required_level=0.80,
            is_critical=True,
        )
        req_theory = TaskRequirement(
            task_id=task_survey.id,
            competency_id="comp_stat_theory",
            required_level=0.70,
            is_critical=False,
        )
        session.add_all([req_samp, req_theory])

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
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers_off1():
    token = create_access_token(data={"sub": "IGOT7_OFF_1", "email": "off1@mospi.gov.in", "role": "officer"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_off2():
    token = create_access_token(data={"sub": "IGOT7_OFF_2", "email": "off2@mospi.gov.in", "role": "officer"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_sup():
    token = create_access_token(data={"sub": "IGOT7_SUP_1", "email": "sup1@mospi.gov.in", "role": "supervisor"})
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. NORMALIZATION & ADAPTERS
# ==============================================================================

def test_01_training_resource_model_normalization(db_session):
    """1. TrainingResource model contains all required normalized fields."""
    res = TrainingResource(
        id="TR-TEST-001",
        provider="nssta",
        external_reference_id="EXT-TEST-001",
        title="Test Programme",
        description="Testing normalized representation",
        competency_id="comp_survey_audit",
        subskills=["Stratified Sampling"],
        prerequisites=["comp_stat_theory"],
        duration_hours=15.0,
        delivery_mode="blended",
        difficulty_level="intermediate",
        programme_priority="high",
        target_cadre=["JSO"],
        syllabus_highlights=["Module 1: Basics"],
        status="active",
        is_mock=True,
    )
    db_session.add(res)
    db_session.commit()

    saved = db_session.query(TrainingResource).filter_by(id="TR-TEST-001").first()
    assert saved is not None
    assert saved.provider == "nssta"
    assert saved.duration_hours == 15.0
    assert saved.subskills == ["Stratified Sampling"]
    assert saved.prerequisites == ["comp_stat_theory"]


def test_02_igot_mock_adapter(db_session):
    """2. iGOT Mock adapter yields normalized records with is_mock=True."""
    adapter = IgotTrainingAdapter()
    status = adapter.get_status()
    assert status.provider == "igot"
    assert status.mode == "mock"
    assert status.is_configured is True

    catalogue = adapter.fetch_catalogue()
    assert len(catalogue) >= 3
    assert any(c.competency_id == "comp_survey_audit" for c in catalogue)
    assert all(c.is_mock is True for c in catalogue)

    enroll_res = adapter.enroll_officer("prof_1", "IGOT7_OFF_1", "IGOT-COURSE-SAMPLING-001")
    assert enroll_res.status == "enrolled"
    assert enroll_res.is_mock is True


def test_03_igot_real_adapter_unconfigured_safe_rejection():
    """3. Real iGOT adapter with missing credentials safely reports NOT_CONFIGURED and rejects calls."""
    real_adapter = RealIGOTAdapter(base_url=None, client_id=None, client_secret=None)
    assert real_adapter.is_configured is False

    from backend.app.integrations.igot.exceptions import IGOTNotConfiguredError
    with pytest.raises(IGOTNotConfiguredError):
        real_adapter.fetch_learning_records("IGOT7_OFF_1")


def test_04_nssta_adapter(db_session):
    """4. NSSTA adapter models academy residential & blended courses."""
    adapter = NSSTAAdapter()
    status = adapter.get_status()
    assert status.provider == "nssta"

    catalogue = adapter.fetch_catalogue()
    assert len(catalogue) >= 3
    # Verify residential courses
    residential = [c for c in catalogue if c.delivery_mode == "classroom_residential"]
    assert len(residential) >= 1
    assert "NSSTA Campus, Greater Noida" in str(residential[0].metadata)


def test_05_tpac_programme_adapter(db_session):
    """5. TPAC adapter models approved curriculum standards & national priorities."""
    adapter = TPACProgrammeAdapter()
    status = adapter.get_status()
    assert status.provider == "tpac"
    assert "Curriculum" in status.name

    catalogue = adapter.fetch_catalogue()
    assert len(catalogue) >= 3
    mandatory_prog = [c for c in catalogue if c.programme_priority == "mandatory"]
    assert len(mandatory_prog) >= 1
    assert "TPAC" in mandatory_prog[0].external_reference_id


# ==============================================================================
# 2. SYNCHRONIZATION IDEMPOTENCY & AUDITING
# ==============================================================================

def test_06_sync_idempotency_and_deduplication(db_session):
    """6 & 7. Syncing multiple times does not produce duplicate records."""
    sync_service = TrainingSyncService(db_session)
    res1 = sync_service.sync_all_catalogues(actor="test_admin")
    count1 = db_session.query(TrainingResource).count()
    assert count1 > 0
    assert res1["created_count"] == count1

    # Second sync should update 0 new items and create 0 duplicates
    res2 = sync_service.sync_all_catalogues(actor="test_admin")
    count2 = db_session.query(TrainingResource).count()
    assert count2 == count1
    assert res2["created_count"] == 0
    assert res2["updated_count"] == count1


def test_07_sync_audit_event_logged(db_session):
    """17. Training catalogue synchronization logs immutable audit events."""
    sync_service = TrainingSyncService(db_session)
    sync_service.sync_all_catalogues(actor="test_auditor", correlation_id="CORR-P7-SYNC")

    audit = (
        db_session.query(CompetencyAuditEvent)
        .filter(CompetencyAuditEvent.event_type == "training_catalogue_synced")
        .first()
    )
    assert audit is not None
    assert audit.actor == "test_auditor"
    assert audit.event_data["correlation_id"] == "CORR-P7-SYNC"
    assert "total_synced" in audit.event_data


# ==============================================================================
# 3. OPTIMIZER SCORING & EXPLANATIONS
# ==============================================================================

def test_08_optimizer_prioritizes_officer_gap(db_session):
    """8, 9, 10. Optimizer scores competency alignment and sub-skills deterministically."""
    p1 = db_session.query(OfficerProfile).first()
    optimizer = TrainingOptimizerService(db_session)

    res = optimizer.optimize_recommendations(p1)
    assert len(res.recommendations) > 0

    top_rec = res.recommendations[0]
    # Officer 1's priority gap is Survey Sampling (comp_survey_audit)
    assert top_rec.addresses_priority_gap is True
    assert top_rec.resource.competency_id == "comp_survey_audit"
    assert top_rec.score > 0.60
    assert len(top_rec.reasons) >= 2


def test_09_task_bottleneck_boost_and_explanation(db_session):
    """11. Addressing a task-readiness bottleneck boosts score and generates clear explanation."""
    p1 = db_session.query(OfficerProfile).first()
    optimizer = TrainingOptimizerService(db_session)

    # Force optimize for task 'task_survey_est_p7' where Sampling is bottleneck
    constraints = TrainingConstraintInput(target_task_id="task_survey_est_p7")
    res = optimizer.optimize_recommendations(p1, constraints)

    top_rec = res.recommendations[0]
    assert top_rec.addresses_task_bottleneck is True
    assert any("limits readiness for task" in r for r in top_rec.reasons)
    assert top_rec.factor_breakdown["task_bottleneck_relevance"].raw_score == 1.0


def test_10_duration_constraint_exclusion(db_session):
    """12 & 13. Exceeding max duration constraint deterministically excludes long courses with explanation."""
    p1 = db_session.query(OfficerProfile).first()
    optimizer = TrainingOptimizerService(db_session)

    # Set strict 10 hours max duration
    constraints = TrainingConstraintInput(max_duration_hours=10.0)
    res = optimizer.optimize_recommendations(p1, constraints)

    # All recommended resources must be <= 10 hours
    for rec in res.recommendations:
        assert rec.resource.duration_hours <= 10.0

    # Longer courses (like 35h NSSTA workshop) should appear in excluded_interventions
    assert len(res.excluded_interventions) > 0
    long_ex = [e for e in res.excluded_interventions if "exceeds" in e.exclusion_reason]
    assert len(long_ex) >= 1


def test_11_delivery_mode_filter(db_session):
    """13. Delivery mode filter strictly restricts recommendations to selected modes."""
    p1 = db_session.query(OfficerProfile).first()
    optimizer = TrainingOptimizerService(db_session)

    constraints = TrainingConstraintInput(preferred_delivery_modes=["online_self_paced"])
    res = optimizer.optimize_recommendations(p1, constraints)

    for rec in res.recommendations:
        assert rec.resource.delivery_mode == "online_self_paced"


def test_12_prerequisite_handling(db_session):
    """12. Prerequisites are checked against officer competency state and verifications."""
    p1 = db_session.query(OfficerProfile).first()
    optimizer = TrainingOptimizerService(db_session)

    res = optimizer.optimize_recommendations(p1)
    for rec in res.recommendations:
        if not rec.resource.prerequisites:
            assert rec.satisfies_prerequisites is True


# ==============================================================================
# 4. API & RBAC ENFORCEMENT
# ==============================================================================

def test_13_api_provider_status_public_endpoint(client):
    """API endpoint returns provider statuses without requiring auth secrets."""
    res = client.get(f"{settings.API_PREFIX}/training/providers/status")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 3
    providers = {p["provider"] for p in data}
    assert "igot" in providers
    assert "nssta" in providers
    assert "tpac" in providers


def test_14_api_list_and_filter_resources(client):
    """API endpoint allows querying and filtering training resources."""
    res = client.get(f"{settings.API_PREFIX}/training/resources?provider=nssta")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert all(r["provider"] == "nssta" for r in data)


def test_15_api_my_recommendations(client, auth_headers_off1, db_session):
    """API endpoint returns personalized recommendations for authenticated officer."""
    p1 = db_session.query(OfficerProfile).first()
    res = client.get(
        f"{settings.API_PREFIX}/training/recommendations/me",
        headers=auth_headers_off1,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["officer_id"] == str(p1.id)
    assert len(data["recommendations"]) > 0
    assert "optimizer_disclaimer" in data


def test_16_api_optimize_my_recommendations_with_constraints(client, auth_headers_off1):
    """API POST optimize endpoint filters according to constraints payload."""
    payload = {
        "max_duration_hours": 15.0,
        "provider_filter": ["igot", "tpac"],
        "max_recommendations": 3,
    }
    res = client.post(
        f"{settings.API_PREFIX}/training/recommendations/me/optimize",
        json=payload,
        headers=auth_headers_off1,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["recommendations"]) <= 3
    assert all(r["resource"]["provider"] in ["igot", "tpac"] for r in data["recommendations"])
    assert all(r["resource"]["duration_hours"] <= 15.0 for r in data["recommendations"])


def test_17_officer_isolation_no_idor(client, auth_headers_off1, auth_headers_sup, db_session):
    """15 & 16. Officer cannot view another officer's recommendations; supervisor can."""
    p1 = db_session.query(OfficerProfile).first()
    p2 = db_session.query(OfficerProfile).offset(1).first()

    # Officer 1 tries to access Officer 2's profile recommendations -> 403 Forbidden
    res_forbidden = client.get(
        f"{settings.API_PREFIX}/training/recommendations/officer/{p2.id}",
        headers=auth_headers_off1,
    )
    assert res_forbidden.status_code == 403

    # Officer 1 accesses their own profile -> 200 OK
    res_own = client.get(
        f"{settings.API_PREFIX}/training/recommendations/officer/{p1.id}",
        headers=auth_headers_off1,
    )
    assert res_own.status_code == 200

    # Supervisor accesses Officer 2's recommendations -> 200 OK
    res_sup = client.get(
        f"{settings.API_PREFIX}/training/recommendations/officer/{p2.id}",
        headers=auth_headers_sup,
    )
    assert res_sup.status_code == 200
    assert res_sup.json()["officer_id"] == str(p2.id)


def test_18_api_enroll_in_training(client, auth_headers_off1, db_session):
    """Safe enrollment endpoint via provider adapter."""
    # Ensure seed
    sync = TrainingSyncService(db_session)
    sync.sync_all_catalogues()

    res_item = db_session.query(TrainingResource).filter_by(provider="igot").first()
    assert res_item is not None

    res = client.post(
        f"{settings.API_PREFIX}/training/enroll",
        json={"resource_id": res_item.id},
        headers=auth_headers_off1,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "enrolled"
    assert data["provider"] == "igot"


# ==============================================================================
# 5. END-TO-END INTEGRATION TEST
# ==============================================================================

def test_19_end_to_end_gap_change_alters_recommendations_deterministically(db_session):
    """20. Changing an officer's competency gap dynamically shifts optimizer recommendations."""
    p1 = db_session.query(OfficerProfile).first()
    optimizer = TrainingOptimizerService(db_session)

    # Initial: Sampling gap is large (0.25), National Accounts has no gap.
    res_initial = optimizer.optimize_recommendations(p1)
    top_init = res_initial.recommendations[0]
    assert top_init.resource.competency_id == "comp_survey_audit"

    # Mutate officer state: Resolve Sampling gap, introduce severe gap in National Accounts
    s_samp = db_session.query(OfficerCompetencyState).filter_by(officer_profile_id=p1.id, competency_id="comp_survey_audit").first()
    s_samp.gap = 0.0
    s_samp.current_level = 0.85
    s_samp.gap_band = "green"

    s_sna = OfficerCompetencyState(
        officer_profile_id=p1.id,
        competency_id="comp_national_accounts",
        current_level=0.40,
        required_level=0.80,
        gap=0.40,
        raw_gap=0.40,
        status="gap",
        gap_band="red",
        confidence=0.85,
        confidence_category="HIGH_CONFIDENCE",
        evidence_count=3,
    )
    db_session.add(s_sna)
    db_session.commit()

    # Re-evaluate recommendations
    res_after = optimizer.optimize_recommendations(p1)
    top_after = res_after.recommendations[0]
    assert top_after.resource.competency_id == "comp_national_accounts"
    assert top_after.addresses_priority_gap is True
    assert "National Accounts" in top_after.aligned_competency_name
