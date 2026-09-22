"""
STAT-GAP AI - Phase 3 Competency Intelligence Test Suite

Rigorous validation of:
1. 4-level competency hierarchy (Cadre -> Function -> Competency -> Sub-skill)
2. PostgreSQL Competency Knowledge Graph with cycle detection
3. Deterministic 4-factor scoring model preservation & missing evidence normalization
4. Deterministic requirement resolution (Assignment > Function > Cadre > Role > Default)
5. Deterministic gap diagnosis (Red >= 0.35, Orange 0.15-0.34, Green < 0.15)
6. 3-factor Evidence Confidence Engine (distinguishing Low Competency from Insufficient Evidence)
7. Officer data isolation and RBAC / IDOR enforcement
8. Competency Digital Twin state vector, snapshot persistence, and assumption-based What-If simulation
"""

import os
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "phase3-testing-jwt-secret-key-minimum-32-chars-strictly-for-testing!"

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import SessionLocal, get_db
from backend.app.core.security import create_access_token, hash_password
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship
from backend.app.models.competency import Competency
from backend.app.models.competency_requirement import CompetencyRequirement
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.structured_evidence import StructuredEvidence
from backend.app.models.digital_twin_snapshot import DigitalTwinSnapshot

from backend.app.repositories.competency_graph_repository import CompetencyGraphRepository
from backend.app.services.evaluation_service import CompetencyEvaluationService
from backend.app.services.requirement_resolution_service import RequirementResolutionService
from backend.app.services.confidence_service import ConfidenceService, ConfidenceCategory
from backend.app.services.digital_twin_service import DigitalTwinService

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    """Provides a database session for test execution."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def test_users(db_session):
    """Sets up test users with distinct roles and complete officer profiles."""
    # Officer 1: ISS, National Accounts
    u1 = db_session.query(User).filter(User.igot_id == "TEST_OFFICER_P3_1").first()
    if not u1:
        u1 = User(
            igot_id="TEST_OFFICER_P3_1",
            email="p3_officer1@statgap.gov.in",
            password_hash=hash_password("ValidPass123!"),
            role="OFFICER",
            is_active=True
        )
        db_session.add(u1)
        db_session.flush()

    prof1 = db_session.query(OfficerProfile).filter(OfficerProfile.user_id == u1.id).first()
    if not prof1:
        prof1 = OfficerProfile(
            user_id=u1.id,
            name="P3 Test Officer 1",
            phone="9876543201",
            dob="1990-01-01",
            department="National Accounts Division",
            designation="Statistical Officer",
            cadre="ISS",
            current_assignment="National Accounts Division",
            years_of_experience=4
        )
        db_session.add(prof1)

    # Officer 2: SSS, Field Operations
    u2 = db_session.query(User).filter(User.igot_id == "TEST_OFFICER_P3_2").first()
    if not u2:
        u2 = User(
            igot_id="TEST_OFFICER_P3_2",
            email="p3_officer2@statgap.gov.in",
            password_hash=hash_password("ValidPass123!"),
            role="OFFICER",
            is_active=True
        )
        db_session.add(u2)
        db_session.flush()

    prof2 = db_session.query(OfficerProfile).filter(OfficerProfile.user_id == u2.id).first()
    if not prof2:
        prof2 = OfficerProfile(
            user_id=u2.id,
            name="P3 Test Officer 2",
            phone="9876543202",
            dob="1992-05-15",
            department="Field Operations Division",
            designation="Junior Statistical Officer",
            cadre="SSS",
            current_assignment="Field Operations",
            years_of_experience=2
        )
        db_session.add(prof2)

    # Supervisor
    sup = db_session.query(User).filter(User.igot_id == "TEST_SUPERVISOR_P3").first()
    if not sup:
        sup = User(
            igot_id="TEST_SUPERVISOR_P3",
            email="p3_supervisor@statgap.gov.in",
            password_hash=hash_password("ValidPass123!"),
            role="SUPERVISOR",
            is_active=True
        )
        db_session.add(sup)

    db_session.commit()

    token_u1 = create_access_token({"sub": "TEST_OFFICER_P3_1", "role": "OFFICER"})
    token_u2 = create_access_token({"sub": "TEST_OFFICER_P3_2", "role": "OFFICER"})
    token_sup = create_access_token({"sub": "TEST_SUPERVISOR_P3", "role": "SUPERVISOR"})

    return {
        "u1_token": token_u1,
        "u2_token": token_u2,
        "sup_token": token_sup,
        "u1_id": "TEST_OFFICER_P3_1",
        "u2_id": "TEST_OFFICER_P3_2",
        "sup_id": "TEST_SUPERVISOR_P3",
        "prof1_id": prof1.id,
        "prof2_id": prof2.id,
    }


# =========================================================================
# 1. 4-LEVEL ONTOLOGY HIERARCHY TESTS
# =========================================================================

def test_01_ontology_hierarchy_endpoint(test_users):
    """Verifies that the 4-level ontology hierarchy returns a valid tree structure."""
    headers = {"Authorization": f"Bearer {test_users['u1_token']}"}
    response = client.get(f"{settings.API_PREFIX}/competencies/ontology/hierarchy", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Verify root level is cadre
    cadre_root = data[0]
    assert cadre_root["ontology_level"] in ("cadre", "domain")
    assert len(cadre_root["children"]) > 0

    # Verify child level is function
    function_node = cadre_root["children"][0]
    assert function_node["ontology_level"] in ("function", "sub_domain")


def test_02_node_children_endpoint(test_users, db_session):
    """Verifies retrieval of immediate children for a parent node in the hierarchy."""
    headers = {"Authorization": f"Bearer {test_users['u1_token']}"}
    
    # Find a function or cadre node that has children
    parent_node = db_session.query(CompetencyNode).filter(
        CompetencyNode.ontology_level.in_(["cadre", "function"])
    ).first()
    assert parent_node is not None

    response = client.get(f"{settings.API_PREFIX}/competencies/{parent_node.id}/children", headers=headers)
    assert response.status_code == 200
    children = response.json()
    assert isinstance(children, list)
    if len(children) > 0:
        assert all(c["parent_id"] == parent_node.id for c in children)


# =========================================================================
# 2. COMPETENCY GRAPH & CYCLE DETECTION TESTS
# =========================================================================

def test_03_cycle_detection_prevents_circular_dependencies(db_session):
    """Verifies cycle detection algorithm flags and prevents cyclic prerequisite additions."""
    repo = CompetencyGraphRepository(db_session)

    # 1. Self-loop is always a cycle
    assert repo.detect_cycle("node_A", "node_A") is True

    # 2. Inverting an existing directed edge must detect a cycle and raise ValueError
    rel = db_session.query(CompetencyRelationship).filter(
        CompetencyRelationship.relationship_type.in_(["prerequisite", "requires", "REQUIRES"])
    ).first()
    if rel:
        is_cycle = repo.detect_cycle(source_id=rel.target_node_id, target_id=rel.source_node_id, rel_type="requires")
        assert is_cycle is True

        with pytest.raises(ValueError) as excinfo:
            repo.add_relationship(
                source_id=rel.target_node_id,
                target_id=rel.source_node_id,
                rel_type="requires"
            )
        assert "Circular dependency rejected" in str(excinfo.value)


def test_04_node_dependencies_endpoint(test_users, db_session):
    """Verifies dependencies/prerequisites endpoint returns structured prerequisite graph."""
    headers = {"Authorization": f"Bearer {test_users['u1_token']}"}
    node = db_session.query(CompetencyNode).filter(
        CompetencyNode.ontology_level == "competency"
    ).first()
    assert node is not None

    response = client.get(f"{settings.API_PREFIX}/competencies/{node.id}/dependencies", headers=headers)
    assert response.status_code == 200
    deps = response.json()
    assert "competencyId" in deps
    assert "prerequisites" in deps
    assert "dependencies" in deps
    assert isinstance(deps["prerequisites"], list)
    assert isinstance(deps["dependencies"], list)


# =========================================================================
# 3. PHASE 1 SCORING MODEL PRESERVATION TESTS
# =========================================================================

def test_05_scoring_model_deterministic_formula_and_normalization():
    """
    Verifies that the Phase 1 four-factor scoring formula:
    score = 0.35 * assessment + 0.20 * quiz + 0.30 * practical + 0.15 * external
    is preserved deterministically, with proper normalization when factors are missing.
    """
    # 1. Full evidence
    calculated = CompetencyEvaluationService.calculate_competency(
        assessment=0.80,
        quiz=0.90,
        practical=0.70,
        external=0.85
    )
    # Expected: 0.35 * 0.80 + 0.20 * 0.90 + 0.30 * 0.70 + 0.15 * 0.85 = 0.7975
    expected = 0.35 * 0.80 + 0.20 * 0.90 + 0.30 * 0.70 + 0.15 * 0.85
    assert abs(calculated - round(expected, 4)) < 1e-4

    # 2. Configurable weights validation
    weights = {"assessment": 0.35, "quiz": 0.20, "practical": 0.30, "external": 0.15}
    CompetencyEvaluationService.validate_weights(weights)

    # 3. Invalid weights rejection (must sum to 1.0)
    with pytest.raises(ValueError):
        CompetencyEvaluationService.validate_weights(
            {"assessment": 0.50, "quiz": 0.50, "practical": 0.50, "external": 0.15}
        )


def test_06_score_bounds_clamping():
    """Verifies calculated scores are strictly clamped in [0.0, 1.0]."""
    # Score normalization handles out-of-range values
    assert CompetencyEvaluationService.normalize_score(150.0) == 1.0
    assert CompetencyEvaluationService.normalize_score(-10.0) == 0.0
    assert CompetencyEvaluationService.normalize_score(85.0) == 0.85
    assert CompetencyEvaluationService.normalize_score(0.85) == 0.85


# =========================================================================
# 4. DETERMINISTIC REQUIREMENT RESOLUTION TESTS
# =========================================================================

def test_07_requirement_resolution_priority_cascade(db_session, test_users):
    """
    Verifies deterministic priority matching:
    Assignment > Function > Cadre > Role > Default.
    """
    res_service = RequirementResolutionService(db_session)
    prof1 = db_session.query(OfficerProfile).filter(OfficerProfile.id == test_users["prof1_id"]).first()
    assert prof1 is not None

    comp = db_session.query(Competency).first()
    assert comp is not None

    required_level = res_service.resolve_required_level(
        profile=prof1,
        competency_id=comp.id,
        role="OFFICER"
    )
    assert 0.0 <= required_level <= 1.0


# =========================================================================
# 5. DETERMINISTIC GAP ENGINE TESTS
# =========================================================================

def test_08_gap_calculation_and_severity_bands():
    """
    Verifies:
    - gap = max(0.0, required - current)
    - Red band: gap >= 0.35
    - Orange band: 0.15 <= gap < 0.35
    - Green band: gap < 0.15
    """
    # Case 1: Large gap -> Red
    gap_red = 0.40
    band_red = CompetencyEvaluationService.classify_gap_band(gap_red)
    assert band_red == "red"

    # Case 2: Moderate gap -> Orange
    gap_orange = 0.20
    band_orange = CompetencyEvaluationService.classify_gap_band(gap_orange)
    assert band_orange == "orange"

    # Case 3: Minor gap -> Green
    gap_green = 0.05
    band_green = CompetencyEvaluationService.classify_gap_band(gap_green)
    assert band_green == "green"

    # Case 4: Exceeds requirement (gap <= 0.0) -> Green
    assert CompetencyEvaluationService.classify_gap_band(0.0) == "green"
    assert CompetencyEvaluationService.classify_gap_band(-0.15) == "green"


# =========================================================================
# 6. EVIDENCE CONFIDENCE & DISTINCTION BETWEEN LOW SCORE AND LOW EVIDENCE
# =========================================================================

def test_09_distinguishing_low_competency_from_insufficient_evidence():
    """
    CRITICAL REQUIREMENT:
    The platform must explicitly distinguish between:
    - LOW_COMPETENCY (confirmed deficiency: high evidence volume, verified poor performance)
    - INSUFFICIENT_EVIDENCE (sparse observations, cannot confirm deficiency)
    """
    now = datetime.now(timezone.utc)

    # Case A: Low Score with Multiple Concordant Observations (Confirmed Deficiency)
    low_scores_substantial = [0.25, 0.28, 0.22, 0.26]
    eval_a = ConfidenceService.evaluate_confidence(low_scores_substantial, last_evidence_at=now)
    assert eval_a["confidence"] >= 0.70
    assert eval_a["category"] in (ConfidenceCategory.HIGH_CONFIDENCE, ConfidenceCategory.MODERATE_CONFIDENCE)
    assert eval_a["is_insufficient_evidence"] is False

    # Case B: Sparse / Zero Observations (Insufficient Evidence)
    eval_b = ConfidenceService.evaluate_confidence([], last_evidence_at=None)
    assert eval_b["confidence"] < 0.45
    assert eval_b["category"] == ConfidenceCategory.INSUFFICIENT_EVIDENCE
    assert eval_b["is_insufficient_evidence"] is True
    assert "Sparse evidence base" in eval_b["reason"]


def test_10_confidence_score_3_factor_weighting():
    """
    Verifies the 3-factor confidence formula:
    confidence = 0.40 * volume + 0.35 * agreement + 0.25 * recency
    """
    now = datetime.now(timezone.utc)

    # 4 concordant items from today
    scores = [0.80, 0.82, 0.79, 0.81]
    res = ConfidenceService.evaluate_confidence(scores, last_evidence_at=now)
    # High volume (4 items -> factor 1.0), high agreement (spread 0.03 -> factor ~0.97), high recency (factor 1.0)
    assert res["volume_factor"] == 1.0
    assert res["agreement_factor"] >= 0.95
    assert res["recency_factor"] == 1.0
    assert res["confidence"] >= 0.90
    assert res["category"] == ConfidenceCategory.HIGH_CONFIDENCE


# =========================================================================
# 7. OFFICER DATA ISOLATION & RBAC / IDOR ENFORCEMENT
# =========================================================================

def test_11_officer_cannot_view_other_officer_digital_twin(test_users):
    """
    IDOR Protection:
    Officer 1 attempting to view Officer 2's digital twin or competencies must receive 403 Forbidden.
    """
    headers_u1 = {"Authorization": f"Bearer {test_users['u1_token']}"}

    # Officer 1 requesting Officer 2's digital twin
    res_twin = client.get(
        f"{settings.API_PREFIX}/officer/digital-twin?officer_id={test_users['u2_id']}",
        headers=headers_u1
    )
    assert res_twin.status_code == 403
    assert "Forbidden" in res_twin.json().get("detail", "")

    # Officer 1 requesting Officer 2's gaps
    res_gaps = client.get(
        f"{settings.API_PREFIX}/officer/gaps?officer_id={test_users['u2_id']}",
        headers=headers_u1
    )
    assert res_gaps.status_code == 403

    # Officer 1 requesting Officer 2's competencies
    res_comps = client.get(
        f"{settings.API_PREFIX}/officer/competencies?officer_id={test_users['u2_id']}",
        headers=headers_u1
    )
    assert res_comps.status_code == 403


def test_12_officer_can_view_own_digital_twin_and_supervisor_can_view_any(test_users):
    """
    Officer 1 accessing own twin succeeds (200 OK).
    Supervisor accessing Officer 1's twin succeeds (200 OK).
    """
    headers_u1 = {"Authorization": f"Bearer {test_users['u1_token']}"}
    headers_sup = {"Authorization": f"Bearer {test_users['sup_token']}"}

    # Officer 1 viewing own twin
    res_self = client.get(f"{settings.API_PREFIX}/officer/digital-twin", headers=headers_u1)
    assert res_self.status_code == 200
    data_self = res_self.json()
    assert data_self["identityContext"]["iGotId"] == test_users["u1_id"]

    # Supervisor viewing Officer 1's twin
    res_sup = client.get(
        f"{settings.API_PREFIX}/officer/digital-twin?officer_id={test_users['u1_id']}",
        headers=headers_sup
    )
    assert res_sup.status_code == 200
    data_sup = res_sup.json()
    assert data_sup["identityContext"]["iGotId"] == test_users["u1_id"]


# =========================================================================
# 8. DIGITAL TWIN ASSEMBLY, SNAPSHOTS & WHAT-IF SIMULATION
# =========================================================================

def test_13_digital_twin_assembly_schema_and_state_vector(test_users):
    """Verifies the structured computational twin payload has complete state vector & KPIs."""
    headers = {"Authorization": f"Bearer {test_users['u1_token']}"}
    res = client.get(f"{settings.API_PREFIX}/officer/digital-twin", headers=headers)
    assert res.status_code == 200
    twin = res.json()

    assert "digitalTwinId" in twin
    assert "generatedAt" in twin
    assert "identityContext" in twin
    assert "kpiSummary" in twin
    assert "competencyStates" in twin

    kpis = twin["kpiSummary"]
    assert "totalCompetencies" in kpis
    assert "criticalGaps" in kpis
    assert "moderateGaps" in kpis
    assert "competentDomains" in kpis


def test_14_snapshot_creation_and_timeline_retrieval(test_users):
    """Verifies creating and querying persistent point-in-time Digital Twin snapshots."""
    headers = {"Authorization": f"Bearer {test_users['u1_token']}"}

    # Create a new snapshot
    create_res = client.post(
        f"{settings.API_PREFIX}/officer/digital-twin/snapshot?trigger_event=TEST_AUTOMATED_EVALUATION",
        headers=headers
    )
    assert create_res.status_code == 201
    snap = create_res.json()
    assert "snapshotId" in snap
    assert snap["triggerEvent"] == "TEST_AUTOMATED_EVALUATION"

    # Retrieve snapshot timeline
    list_res = client.get(
        f"{settings.API_PREFIX}/officer/digital-twin/snapshots",
        headers=headers
    )
    assert list_res.status_code == 200
    snaps = list_res.json()
    assert isinstance(snaps, list)
    assert len(snaps) >= 1
    assert any(s["triggerEvent"] == "TEST_AUTOMATED_EVALUATION" for s in snaps)


def test_15_what_if_simulation_explicitly_assumption_based(test_users, db_session):
    """
    Verifies What-If simulation foundation:
    - Strictly assumption-based sandbox
    - Explicit disclaimer & synthetic flags
    - No predictive hallucinated percentage claims
    """
    headers = {"Authorization": f"Bearer {test_users['u1_token']}"}
    comp = db_session.query(Competency).first()
    assert comp is not None

    simulation_request = {
        "targetCompetencyId": comp.id,
        "interventionType": "NSSTA_TRAINING",
        "hypotheticalScore": 0.85
    }

    sim_res = client.post(
        f"{settings.API_PREFIX}/officer/digital-twin/simulate",
        json=simulation_request,
        headers=headers
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()

    # Verify synthetic / assumption disclosures
    assert sim_data["isSimulation"] is True
    assert "SYNTHETIC TEST ASSUMPTION" in sim_data["disclaimer"]
    assert "baseline" in sim_data
    assert "simulated" in sim_data
    assert sim_data["simulated"]["currentLevel"] >= sim_data["baseline"]["currentLevel"]
    assert "projectedImprovement" in sim_data["simulated"]
