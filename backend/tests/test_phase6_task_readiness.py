"""Test suite for Phase 6 — Task Readiness, Knowledge Decay Integration, and What-If Simulation.

Tests cover:
  - Task definition listing
  - Task requirement evaluation (all met, one gap, multiple gaps)
  - Readiness status classification (READY, PARTIALLY_READY, NOT_READY, INSUFFICIENT_EVIDENCE)
  - Bottleneck competency detection
  - Critical vs non-critical requirement distinction
  - What-If simulation (does NOT mutate DB)
  - Simulation vs baseline difference
  - Invalid hypothetical values rejected
  - RBAC / officer isolation
  - API authentication
  - Task not found
  - Task readiness with no requirements
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
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.task_readiness import TaskDefinition, TaskRequirement, TaskReadinessEvaluation
from backend.app.services.task_readiness_service import TaskReadinessService

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
        # Seed competencies
        comp1 = Competency(id="comp_stat_analysis", name="Statistical Analysis", category="Core", score=82, required_score=75, gap_points=0, status="competent")
        comp2 = Competency(id="comp_survey_methods", name="Survey Methods", category="Operational", score=60, required_score=80, gap_points=20, status="gap")
        comp3 = Competency(id="comp_data_quality", name="Data Quality", category="Quality", score=78, required_score=70, gap_points=0, status="competent")
        comp4 = Competency(id="comp_official_stats", name="Official Statistics", category="Policy", score=55, required_score=65, gap_points=10, status="gap")
        session.add_all([comp1, comp2, comp3, comp4])
        session.flush()

        # Seed Users & Profiles
        user_a = User(igot_id="IGOT6A001", email="a6@gov.in", password_hash=hash_password("ValidPassword123!"), is_active=True)
        user_b = User(igot_id="IGOT6B002", email="b6@gov.in", password_hash=hash_password("ValidPassword123!"), is_active=True)
        session.add_all([user_a, user_b])
        session.flush()

        profile_a = OfficerProfile(user_id=user_a.id, name="Aditi Test", phone="9876543210", dob="1990-01-01", department="NSO", designation="Deputy Director", years_of_experience=8)
        profile_b = OfficerProfile(user_id=user_b.id, name="Rajesh Test", phone="9876543211", dob="1988-05-01", department="NSO", designation="Senior Statistical Officer", years_of_experience=5)
        session.add_all([profile_a, profile_b])
        session.flush()

        # Seed competency states for Officer A
        # comp_stat_analysis: 0.82 (satisfies 0.75 req), comp_survey_methods: 0.60 (fails 0.80 req)
        # comp_data_quality: 0.78 (satisfies 0.70 req), comp_official_stats: 0.55 (fails 0.65 req)
        states_a = [
            OfficerCompetencyState(officer_profile_id=profile_a.id, competency_id="comp_stat_analysis",   current_level=0.82, required_level=0.75, gap=0.0,  raw_gap=-0.07, status="competent", gap_band="green", confidence=0.85, confidence_category="HIGH", confidence_reason="Multi-source", evidence_count=3),
            OfficerCompetencyState(officer_profile_id=profile_a.id, competency_id="comp_survey_methods",  current_level=0.60, required_level=0.80, gap=0.20, raw_gap=0.20,  status="critical_gap", gap_band="red",  confidence=0.80, confidence_category="HIGH", confidence_reason="Multi-source", evidence_count=2),
            OfficerCompetencyState(officer_profile_id=profile_a.id, competency_id="comp_data_quality",    current_level=0.78, required_level=0.70, gap=0.0,  raw_gap=-0.08, status="competent",  gap_band="green", confidence=0.90, confidence_category="HIGH", confidence_reason="Multi-source", evidence_count=3),
            OfficerCompetencyState(officer_profile_id=profile_a.id, competency_id="comp_official_stats",  current_level=0.55, required_level=0.65, gap=0.10, raw_gap=0.10,  status="moderate_gap", gap_band="orange", confidence=0.70, confidence_category="MEDIUM", confidence_reason="Limited evidence", evidence_count=1),
        ]
        session.add_all(states_a)
        session.flush()

        # Seed Task Definitions
        task_survey = TaskDefinition(id="task_survey", name="Sample Survey Design", description="Design a sample survey", category="Field Operations")
        task_simple = TaskDefinition(id="task_simple", name="Simple Report Task", description="Author a simple report", category="Reporting")
        task_empty = TaskDefinition(id="task_empty", name="Task With No Requirements", description="Empty task", category="Test")
        session.add_all([task_survey, task_simple, task_empty])
        session.flush()

        # task_survey: requires stat_analysis (critical), survey_methods (critical), data_quality (non-critical)
        # Officer A: stat_analysis (0.82 >= 0.75 ✓), survey_methods (0.60 < 0.80 ✗ CRITICAL), data_quality (0.78 >= 0.70 ✓)
        # → NOT_READY
        req1 = TaskRequirement(task_id="task_survey", competency_id="comp_stat_analysis",  required_level=0.75, is_critical=True)
        req2 = TaskRequirement(task_id="task_survey", competency_id="comp_survey_methods", required_level=0.80, is_critical=True)
        req3 = TaskRequirement(task_id="task_survey", competency_id="comp_data_quality",   required_level=0.70, is_critical=False)
        session.add_all([req1, req2, req3])

        # task_simple: only requires stat_analysis (0.82 >= 0.70 ✓) — Officer A READY
        req4 = TaskRequirement(task_id="task_simple", competency_id="comp_stat_analysis", required_level=0.70, is_critical=True)
        session.add(req4)

        session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def test_client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def officer_a_headers():
    token = create_access_token(data={"sub": "IGOT6A001", "email": "a6@gov.in", "igot_id": "IGOT6A001", "full_name": "Aditi Test"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def officer_b_headers():
    token = create_access_token(data={"sub": "IGOT6B002", "email": "b6@gov.in", "igot_id": "IGOT6B002", "full_name": "Rajesh Test"})
    return {"Authorization": f"Bearer {token}"}


# ===========================================================================
# TASK DEFINITION TESTS
# ===========================================================================

def test_01_list_tasks_returns_active_tasks(test_client: TestClient, officer_a_headers):
    """GET /api/tasks returns all active task definitions."""
    res = test_client.get("/api/tasks", headers=officer_a_headers)
    assert res.status_code == 200
    tasks = res.json()
    assert isinstance(tasks, list)
    task_ids = [t["taskId"] for t in tasks]
    assert "task_survey" in task_ids
    assert "task_simple" in task_ids


def test_02_get_single_task(test_client: TestClient, officer_a_headers):
    """GET /api/tasks/{task_id} returns task details."""
    res = test_client.get("/api/tasks/task_survey", headers=officer_a_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["taskId"] == "task_survey"
    assert data["taskName"] == "Sample Survey Design"
    assert data["requirementCount"] == 3


def test_03_get_nonexistent_task_returns_404(test_client: TestClient, officer_a_headers):
    res = test_client.get("/api/tasks/nonexistent_task_id", headers=officer_a_headers)
    assert res.status_code == 404


def test_04_list_tasks_requires_authentication(test_client: TestClient):
    res = test_client.get("/api/tasks")
    assert res.status_code == 401


# ===========================================================================
# TASK READINESS EVALUATION
# ===========================================================================

def test_05_not_ready_when_critical_requirement_unmet(db_session: Session):
    """Officer A: survey_methods is critical and unmet → NOT_READY."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()
    result = TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_a.id, task_id="task_survey", persist=False
    )
    assert result["readinessStatus"] == "NOT_READY"
    assert result["bottleneckCompetencyId"] == "comp_survey_methods"


def test_06_ready_when_all_requirements_satisfied(db_session: Session):
    """Officer A: task_simple only needs stat_analysis (0.82 >= 0.70) → READY."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()
    result = TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_a.id, task_id="task_simple", persist=False
    )
    assert result["readinessStatus"] == "READY"
    assert result["bottleneckCompetencyId"] is None


def test_07_requirement_details_populated(db_session: Session):
    """Requirement details include competency ID, required level, current level, and status."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()
    result = TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_a.id, task_id="task_survey", persist=False
    )
    details = result["requirementDetails"]
    assert len(details) == 3
    # Find survey_methods detail
    survey_detail = next(d for d in details if d["competency_id"] == "comp_survey_methods")
    assert survey_detail["current_level"] == 0.60
    assert survey_detail["required_level"] == 0.80
    assert survey_detail["satisfied"] is False
    assert survey_detail["is_critical"] is True
    assert survey_detail["status"] == "GAP"


def test_08_insufficient_evidence_when_no_state(db_session: Session):
    """Officer B has no OfficerCompetencyState → INSUFFICIENT_EVIDENCE."""
    profile_b = db_session.query(OfficerProfile).filter_by(name="Rajesh Test").first()
    result = TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_b.id, task_id="task_survey", persist=False
    )
    assert result["readinessStatus"] == "INSUFFICIENT_EVIDENCE"


def test_09_empty_task_requirements_returns_insufficient(db_session: Session):
    """Task with no requirements returns INSUFFICIENT_EVIDENCE."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()
    result = TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_a.id, task_id="task_empty", persist=False
    )
    assert result["readinessStatus"] == "INSUFFICIENT_EVIDENCE"
    assert result["requirements_total"] == 0


def test_10_readiness_evaluation_persisted(db_session: Session):
    """persist=True should write TaskReadinessEvaluation record."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()
    before_count = db_session.query(TaskReadinessEvaluation).filter_by(officer_profile_id=profile_a.id).count()
    TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_a.id, task_id="task_survey", persist=True
    )
    after_count = db_session.query(TaskReadinessEvaluation).filter_by(officer_profile_id=profile_a.id).count()
    assert after_count == before_count + 1


def test_11_readiness_disclaimer_is_present(db_session: Session):
    """readiness response always includes prototype disclaimer."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()
    result = TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_a.id, task_id="task_simple", persist=False
    )
    assert "PROTOTYPE" in result["disclaimer"] or "prototype" in result["disclaimer"].lower()
    assert result["isSimulation"] is False


# ===========================================================================
# WHAT-IF SIMULATION — DOES NOT MUTATE DB
# ===========================================================================

def test_12_simulation_does_not_mutate_database(db_session: Session):
    """Simulation must never modify OfficerCompetencyState or TaskReadinessEvaluation."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()

    state_before = db_session.query(OfficerCompetencyState).filter_by(
        officer_profile_id=profile_a.id, competency_id="comp_survey_methods"
    ).first()
    level_before = state_before.current_level  # 0.60

    # Simulate improving survey_methods to 0.95
    TaskReadinessService.simulate_what_if_readiness(
        db=db_session,
        officer_profile_id=profile_a.id,
        task_id="task_survey",
        hypothetical_changes=[{"competency_id": "comp_survey_methods", "hypothetical_level": 0.95}],
    )

    db_session.refresh(state_before)
    assert state_before.current_level == level_before, (
        "Simulation mutated real OfficerCompetencyState — CRITICAL BUG"
    )


def test_13_simulation_improves_readiness_when_bottleneck_resolved(db_session: Session):
    """Simulation with hypothetical survey_methods = 0.90 should change NOT_READY → READY."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()

    result = TaskReadinessService.simulate_what_if_readiness(
        db=db_session,
        officer_profile_id=profile_a.id,
        task_id="task_survey",
        hypothetical_changes=[{"competency_id": "comp_survey_methods", "hypothetical_level": 0.90}],
    )

    assert result["baseline"]["readinessStatus"] == "NOT_READY"
    assert result["simulated"]["readinessStatus"] == "READY"
    assert result["readinessChanged"] is True
    assert result["isSimulation"] is True


def test_14_simulation_unchanged_when_bottleneck_not_addressed(db_session: Session):
    """Simulation improving a non-bottleneck competency should leave status unchanged."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()

    result = TaskReadinessService.simulate_what_if_readiness(
        db=db_session,
        officer_profile_id=profile_a.id,
        task_id="task_survey",
        # Improving data_quality (already satisfied) while survey_methods still 0.60 < 0.80
        hypothetical_changes=[{"competency_id": "comp_data_quality", "hypothetical_level": 0.99}],
    )

    assert result["baseline"]["readinessStatus"] == "NOT_READY"
    assert result["simulated"]["readinessStatus"] == "NOT_READY"
    assert result["readinessChanged"] is False


def test_15_simulation_includes_disclaimer(db_session: Session):
    """Simulation response must include clear simulation disclaimer."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()

    result = TaskReadinessService.simulate_what_if_readiness(
        db=db_session,
        officer_profile_id=profile_a.id,
        task_id="task_survey",
        hypothetical_changes=[{"competency_id": "comp_survey_methods", "hypothetical_level": 0.90}],
    )

    assert result["isSimulation"] is True
    assert "SIMULATION" in result["disclaimer"]
    assert "NOT MODIFY REAL DATA" in result["disclaimer"]


# ===========================================================================
# API SECURITY TESTS
# ===========================================================================

def test_16_readiness_api_requires_auth(test_client: TestClient):
    res = test_client.get("/api/tasks/task_survey/readiness")
    assert res.status_code == 401


def test_17_simulation_api_requires_auth(test_client: TestClient):
    res = test_client.post(
        "/api/tasks/task_survey/simulate",
        json={"hypothetical_changes": [{"competency_id": "comp_survey_methods", "hypothetical_level": 0.90}]},
    )
    assert res.status_code == 401


def test_18_readiness_api_returns_result(test_client: TestClient, officer_a_headers):
    """API returns task readiness with correct structure."""
    res = test_client.get("/api/tasks/task_survey/readiness", headers=officer_a_headers)
    assert res.status_code == 200
    data = res.json()
    assert "readinessStatus" in data
    assert "requirementDetails" in data
    assert "disclaimer" in data
    assert data["isSimulation"] is False


def test_19_simulation_api_returns_result(test_client: TestClient, officer_a_headers):
    """Simulation API returns structured result with baseline and simulated."""
    res = test_client.post(
        "/api/tasks/task_survey/simulate",
        headers=officer_a_headers,
        json={"hypothetical_changes": [{"competency_id": "comp_survey_methods", "hypothetical_level": 0.90}]},
    )
    assert res.status_code == 200
    data = res.json()
    assert "baseline" in data
    assert "simulated" in data
    assert data["isSimulation"] is True
    assert "SIMULATION" in data["disclaimer"]


def test_20_simulation_invalid_level_rejected(test_client: TestClient, officer_a_headers):
    """Simulation with hypothetical_level > 1.0 must be rejected by schema validation."""
    res = test_client.post(
        "/api/tasks/task_survey/simulate",
        headers=officer_a_headers,
        json={"hypothetical_changes": [{"competency_id": "comp_survey_methods", "hypothetical_level": 1.5}]},
    )
    assert res.status_code == 422


def test_21_nonexistent_task_readiness_returns_404(test_client: TestClient, officer_a_headers):
    res = test_client.get("/api/tasks/nonexistent_task/readiness", headers=officer_a_headers)
    assert res.status_code == 404


def test_22_bottleneck_is_largest_critical_gap(db_session: Session):
    """Bottleneck detection selects critical requirement with largest gap."""
    profile_a = db_session.query(OfficerProfile).filter_by(name="Aditi Test").first()
    result = TaskReadinessService.evaluate_task_readiness(
        db=db_session, officer_profile_id=profile_a.id, task_id="task_survey", persist=False
    )
    # survey_methods gap = 0.80 - 0.60 = 0.20 (critical)
    # stat_analysis gap = 0.0 (satisfied)
    # data_quality gap = 0.0 (satisfied, non-critical)
    assert result["bottleneckCompetencyId"] == "comp_survey_methods"
    assert result["bottleneckCompetencyName"] == "Survey Methods"
