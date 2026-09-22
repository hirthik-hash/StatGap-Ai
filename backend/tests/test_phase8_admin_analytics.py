"""Test Suite for Phase 8 — Supervisor / Administrative Intelligence + Cadre Analytics + Workforce Competency Dashboard.

Tests cover:
  1. Role-Aware Authorization (OFFICER forbidden 403 on admin/supervisor endpoints)
  2. Supervisor Access & Departmental Unit Scope Isolation
  3. Admin Access to Complete Cadre Analytics
  4. Workforce Overview KPI Aggregation
  5. Cadre x Competency Heatmap Matrix & Cadre Filtering
  6. Gap Distribution (Red/Orange/Green counts)
  7. Task Readiness Rollup & Bottleneck Competency Identification
  8. Training Demand Rollup across iGOT, NSSTA, and TPAC
  9. Training Effectiveness (insufficient data handling vs. longitudinal evaluation)
 10. Future Role Modernization Readiness & Assumption-Based Flagging
 11. Capacity-Building Priorities Ranking & Formula Determinism
 12. CSV Matrix Export Generation
 13. Security & RBAC Boundary Enforcement
 14. End-to-End Phase 8 Integration
"""
import os
import io
import csv
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"
os.environ["EMBEDDING_PROVIDER"] = "mock"

from backend.app.main import app
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, create_access_token, UserRole
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.task_readiness import TaskDefinition, TaskRequirement
from backend.app.models.training_resource import TrainingResource
from backend.app.models.future_role_requirement import FutureRoleRequirement
from backend.app.models.verification import CompetencyVerification
from backend.app.services.workforce_analytics_service import WorkforceAnalyticsService

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
        # Seed core competencies
        c1 = Competency(
            id="COMP_STAT_INFERENCE",
            name="Statistical Inference & Hypothesis Testing",
            category="core_statistics",
            description="Hypothesis testing, p-values, confidence intervals",
            required_score=80,
        )
        c2 = Competency(
            id="COMP_SURVEY_DESIGN",
            name="Sampling Design & Survey Methodology",
            category="survey_operations",
            description="Stratified sampling, survey weighting, NSS standards",
            required_score=75,
        )
        c3 = Competency(
            id="COMP_NAT_ACCOUNTS",
            name="National Accounts & SNA 2008",
            category="macro_statistics",
            description="SNA aggregates, GDP estimation, deflators",
            required_score=85,
        )
        session.add_all([c1, c2, c3])
        session.flush()

        # Seed future role requirements
        fr1 = FutureRoleRequirement(
            id="FRR-AI-SURVEY-ANALYST",
            role_name="AI-Assisted Survey Data Analyst",
            cadre="Indian Statistical Service (ISS)",
            description="Applies ML/AI methodologies to large-scale NSSO survey datasets.",
            required_competencies={"COMP_STAT_INFERENCE": 0.80, "COMP_SURVEY_DESIGN": 0.85},
            emerging_skills=["Python Survey Analytics", "Machine Learning Imputation"],
        )
        fr2 = FutureRoleRequirement(
            id="FRR-MACRO-ECON-MODELER",
            role_name="Big Data Macroeconomic Modeler",
            cadre="Subordinate Statistical Service (SSS)",
            description="Models real-time economic indicators using high-frequency data.",
            required_competencies={"COMP_NAT_ACCOUNTS": 0.85},
            emerging_skills=["High-Frequency Nowcasting", "Time Series ML"],
        )
        session.add_all([fr1, fr2])
        session.flush()

        # Seed task definitions
        t1 = TaskDefinition(
            id="TASK_NSS_SURVEY_LEAD",
            name="NSS Multi-Round Survey Lead",
            category="Field Operations & Survey Execution",
            cadre_applicable="ISS",
            is_active=True,
        )
        session.add(t1)
        session.flush()

        tr1 = TaskRequirement(
            task_id="TASK_NSS_SURVEY_LEAD",
            competency_id="COMP_SURVEY_DESIGN",
            required_level=0.70,
            is_critical=True,
        )
        tr2 = TaskRequirement(
            task_id="TASK_NSS_SURVEY_LEAD",
            competency_id="COMP_STAT_INFERENCE",
            required_level=0.75,
            is_critical=True,
        )
        session.add_all([tr1, tr2])
        session.flush()

        # Seed Users & Profiles (1 Admin, 1 Supervisor, 2 ISS Officers, 1 SSS Officer)
        # Admin
        u_admin = User(
            email="admin@mospi.gov.in",
            password_hash=hash_password("AdminPass123!"),
            role=UserRole.ADMIN,
            igot_id="ADMIN_001",
            is_active=True,
        )
        session.add(u_admin)
        session.flush()
        p_admin = OfficerProfile(
            user_id=u_admin.id,
            name="Dr. National Admin",
            phone="9876543210",
            dob="1975-01-01",
            cadre="Indian Statistical Service (ISS)",
            department="Central Statistics Office",
            designation="Additional Director General",
            years_of_experience=22,
        )
        session.add(p_admin)

        # Supervisor
        u_sup = User(
            email="supervisor.nad@mospi.gov.in",
            password_hash=hash_password("SupPass123!"),
            role=UserRole.SUPERVISOR,
            igot_id="SUP_NAD_001",
            is_active=True,
        )
        session.add(u_sup)
        session.flush()
        p_sup = OfficerProfile(
            user_id=u_sup.id,
            name="Shri R. K. Sharma",
            phone="9876543211",
            dob="1978-01-01",
            cadre="Indian Statistical Service (ISS)",
            department="National Accounts Division",
            designation="Director",
            years_of_experience=18,
        )
        session.add(p_sup)

        # Officer 1 (ISS, National Accounts Division)
        u_off1 = User(
            email="officer.iss1@mospi.gov.in",
            password_hash=hash_password("OffPass123!"),
            role=UserRole.OFFICER,
            igot_id="OFF_ISS_001",
            is_active=True,
        )
        session.add(u_off1)
        session.flush()
        p_off1 = OfficerProfile(
            user_id=u_off1.id,
            name="Amit Verma",
            phone="9876543212",
            dob="1988-01-01",
            cadre="Indian Statistical Service (ISS)",
            department="National Accounts Division",
            designation="Deputy Director",
            years_of_experience=8,
        )
        session.add(p_off1)
        session.flush()

        # Officer 2 (ISS, Survey Design Division)
        u_off2 = User(
            email="officer.iss2@mospi.gov.in",
            password_hash=hash_password("OffPass123!"),
            role=UserRole.OFFICER,
            igot_id="OFF_ISS_002",
            is_active=True,
        )
        session.add(u_off2)
        session.flush()
        p_off2 = OfficerProfile(
            user_id=u_off2.id,
            name="Pooja Sen",
            phone="9876543213",
            dob="1992-01-01",
            cadre="Indian Statistical Service (ISS)",
            department="Survey Design Division",
            designation="Assistant Director",
            years_of_experience=5,
        )
        session.add(p_off2)
        session.flush()

        # Officer 3 (SSS, Field Operations)
        u_off3 = User(
            email="officer.sss1@mospi.gov.in",
            password_hash=hash_password("OffPass123!"),
            role=UserRole.OFFICER,
            igot_id="OFF_SSS_001",
            is_active=True,
        )
        session.add(u_off3)
        session.flush()
        p_off3 = OfficerProfile(
            user_id=u_off3.id,
            name="Rajesh Kumar",
            phone="9876543214",
            dob="1986-01-01",
            cadre="Subordinate Statistical Service (SSS)",
            department="Field Operations Division",
            designation="Senior Statistical Officer",
            years_of_experience=10,
        )
        session.add(p_off3)
        session.flush()

        # Seed Officer Competency States
        # Off1 states (High mastery in Inference & Accounts, Low in Survey)
        session.add_all([
            OfficerCompetencyState(
                officer_profile_id=p_off1.id,
                competency_id="COMP_STAT_INFERENCE",
                current_level=0.85,
                required_level=0.80,
                gap=0.0,
                gap_band="green",
                evidence_count=3,
            ),
            OfficerCompetencyState(
                officer_profile_id=p_off1.id,
                competency_id="COMP_SURVEY_DESIGN",
                current_level=0.45,
                required_level=0.75,
                gap=0.30,
                gap_band="red",
                evidence_count=2,
            ),
            OfficerCompetencyState(
                officer_profile_id=p_off1.id,
                competency_id="COMP_NAT_ACCOUNTS",
                current_level=0.90,
                required_level=0.85,
                gap=0.0,
                gap_band="green",
                evidence_count=4,
            ),
        ])

        # Off2 states (High in Survey Design, Moderate in Inference)
        session.add_all([
            OfficerCompetencyState(
                officer_profile_id=p_off2.id,
                competency_id="COMP_STAT_INFERENCE",
                current_level=0.60,
                required_level=0.80,
                gap=0.20,
                gap_band="orange",
                evidence_count=2,
            ),
            OfficerCompetencyState(
                officer_profile_id=p_off2.id,
                competency_id="COMP_SURVEY_DESIGN",
                current_level=0.82,
                required_level=0.75,
                gap=0.0,
                gap_band="green",
                evidence_count=3,
            ),
        ])

        # Off3 states (SSS officer: Low in Nat Accounts, Moderate in Survey)
        session.add_all([
            OfficerCompetencyState(
                officer_profile_id=p_off3.id,
                competency_id="COMP_NAT_ACCOUNTS",
                current_level=0.40,
                required_level=0.85,
                gap=0.45,
                gap_band="red",
                evidence_count=1,
            ),
            OfficerCompetencyState(
                officer_profile_id=p_off3.id,
                competency_id="COMP_SURVEY_DESIGN",
                current_level=0.65,
                required_level=0.75,
                gap=0.10,
                gap_band="orange",
                evidence_count=2,
            ),
        ])

        # Seed Training Resources
        tr_res1 = TrainingResource(
            id="IGOT_STAT_INF_01",
            provider="igot",
            external_reference_id="IGOT-STAT-INF-01",
            title="Modern Statistical Inference for Civil Servants",
            description="Comprehensive inference training",
            competency_id="COMP_STAT_INFERENCE",
            subskills=["Hypothesis Testing", "P-Values"],
            prerequisites=[],
            duration_hours=12,
            delivery_mode="online_self_paced",
            difficulty_level="intermediate",
            programme_priority="HIGH",
            target_cadre=["Indian Statistical Service (ISS)", "Subordinate Statistical Service (SSS)"],
            syllabus_highlights=["Parametric tests"],
            status="active",
            is_mock=True,
        )
        tr_res2 = TrainingResource(
            id="NSSTA_SURV_01",
            provider="nssta",
            external_reference_id="NSSTA-SURV-01",
            title="Advanced National Survey Design & Weighting",
            description="NSSTA Greater Noida residential workshop",
            competency_id="COMP_SURVEY_DESIGN",
            subskills=["Multi-stage sampling", "Weight calibration"],
            prerequisites=[],
            duration_hours=30,
            delivery_mode="residential",
            difficulty_level="advanced",
            programme_priority="HIGH",
            target_cadre=["Indian Statistical Service (ISS)"],
            syllabus_highlights=["NSS sample weighting"],
            status="active",
            is_mock=True,
        )
        session.add_all([tr_res1, tr_res2])

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


def get_token_headers(user: User) -> dict:
    token = create_access_token(data={"sub": user.igot_id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


# -------------------------------------------------------------------
# Test Cases
# -------------------------------------------------------------------

def test_role_aware_authorization_officer_forbidden(client, db_session):
    """OFFICER role must receive 403 Forbidden on all admin and supervisor workforce endpoints."""
    officer = db_session.query(User).filter(User.role == UserRole.OFFICER).first()
    headers = get_token_headers(officer)

    # Admin endpoints
    admin_endpoints = [
        "/api/admin/analytics/overview",
        "/api/admin/analytics/heatmap",
        "/api/admin/analytics/gaps",
        "/api/admin/analytics/task-readiness",
        "/api/admin/analytics/training-demand",
        "/api/admin/analytics/training-effectiveness",
        "/api/admin/analytics/future-requirements",
        "/api/admin/analytics/capacity-priorities",
        "/api/admin/analytics/export",
    ]
    for endpoint in admin_endpoints:
        res = client.get(endpoint, headers=headers)
        assert res.status_code == 403, f"Expected 403 on {endpoint} for officer, got {res.status_code}"

    # Supervisor endpoints
    sup_endpoints = [
        "/api/supervisor/analytics/overview",
    ]
    for endpoint in sup_endpoints:
        res = client.get(endpoint, headers=headers)
        assert res.status_code == 403, f"Expected 403 on {endpoint} for officer, got {res.status_code}"


def test_supervisor_access_and_departmental_scope(client, db_session):
    """SUPERVISOR role can access supervisor endpoints scoped to their department."""
    supervisor = db_session.query(User).filter(User.role == UserRole.SUPERVISOR).first()
    headers = get_token_headers(supervisor)

    # Supervisor overview
    res = client.get("/api/supervisor/analytics/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["department"] == "National Accounts Division"
    assert data["team_size"] >= 1
    assert "team_members" in data
    officer_names = [m["name"] for m in data["team_members"]]
    assert "Amit Verma" in officer_names
    assert "Pooja Sen" not in officer_names


def test_admin_workforce_overview(client, db_session):
    """ADMIN role retrieves cadre summary metrics, mastery rates, and gap counts."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_officers"] >= 3
    assert data["total_competency_evaluations"] >= 6
    assert 0.0 < data["average_mastery_level"] <= 1.0
    assert data["gap_band_summary"]["red"] >= 1
    assert "Indian Statistical Service (ISS)" in data["cadre_breakdown"]


def test_cadre_mastery_heatmap_and_filtering(client, db_session):
    """Cadre x Competency heatmap calculates mean mastery and respects cadre filtering."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    # All cadres
    res = client.get("/api/admin/analytics/heatmap", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["cadres"]) > 0
    assert len(data["cells"]) > 0

    # Filter by cadre=ISS
    res_iss = client.get("/api/admin/analytics/heatmap?cadre=ISS", headers=headers)
    assert res_iss.status_code == 200
    data_iss = res_iss.json()
    for cell in data_iss["cells"]:
        if cell["officer_count"] > 0:
            assert "ISS" in cell["cadre"]


def test_gap_distribution(client, db_session):
    """Gap distribution returns breakdown of Red/Orange/Green gap counts for each competency."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/gaps", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    comp_ids = [item["competency_id"] for item in data]
    assert "COMP_STAT_INFERENCE" in comp_ids
    assert "COMP_SURVEY_DESIGN" in comp_ids


def test_task_readiness_analytics_and_bottlenecks(client, db_session):
    """Task readiness analytics reports task readiness rates and identifies bottleneck competencies."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/task-readiness", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    task = data[0]
    assert task["task_id"] == "TASK_NSS_SURVEY_LEAD"
    assert task["total_officers"] >= 3


def test_training_demand_rollup(client, db_session):
    """Training demand rolls up demand across iGOT, NSSTA, and TPAC providers."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/training-demand", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    for item in data:
        assert "officers_with_gap" in item
        assert "provider_breakdown" in item
        assert "demand_priority" in item


def test_training_effectiveness_insufficient_data_integrity(client, db_session):
    """Training effectiveness returns insufficient_longitudinal_data when empirical records < 2."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/training-effectiveness", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "insufficient_longitudinal_data"
    assert "insufficient longitudinal" in data["data_sufficiency_note"].lower()


def test_training_effectiveness_with_longitudinal_data(client, db_session):
    """Training effectiveness reports evaluated outcomes when >= 2 verified intervention records exist."""
    p_off = db_session.query(OfficerProfile).first()
    v1 = CompetencyVerification(
        officer_id=p_off.id,
        competency_id="COMP_STAT_INFERENCE",
        verification_status="verified",
        composite_score=0.75,
    )
    v2 = CompetencyVerification(
        officer_id=p_off.id,
        competency_id="COMP_STAT_INFERENCE",
        verification_status="verified",
        composite_score=0.88,
    )
    db_session.add_all([v1, v2])
    db_session.commit()

    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/training-effectiveness", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "evaluated"
    assert data["total_longitudinal_pairs"] >= 2
    assert len(data["competency_outcomes"]) >= 2


def test_future_role_requirements_comparison(client, db_session):
    """Compares cadre profiles against future roles and verifies assumption-based flag."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/future-requirements", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    role1 = data[0]
    assert role1["is_assumption_based"] is True
    assert "competency_readiness_gaps" in role1


def test_capacity_building_priorities_ranking(client, db_session):
    """Capacity-building priorities are ranked in descending order by priority score."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/capacity-priorities", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Verify descending score order
    scores = [item["priority_score"] for item in data]
    assert scores == sorted(scores, reverse=True)
    for i, item in enumerate(data):
        assert item["priority_rank"] == i + 1


def test_csv_matrix_export(client, db_session):
    """CSV export returns valid text/csv format with header and row structure."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    headers = get_token_headers(admin)

    res = client.get("/api/admin/analytics/export", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers.get("content-disposition", "")

    # Parse CSV content
    csv_reader = csv.reader(io.StringIO(res.text))
    rows = list(csv_reader)
    assert len(rows) >= 5
    assert "STAT-GAP AI" in rows[0][0]
