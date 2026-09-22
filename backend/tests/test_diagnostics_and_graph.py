"""Comprehensive test suite for STAT-GAP AI Build Prompt 3:
Competency Intelligence, Knowledge Graph, and Diagnostic Gap Engine.
"""
import os
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"

from backend.app.main import app
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship
from backend.app.models.misconception import Misconception
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.services.evaluation_service import CompetencyEvaluationService
from backend.app.services.diagnosis_service import GapDiagnosisService

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
        # 1. Seed competency catalog
        comp1 = Competency(
            id="comp_stat_analysis",
            name="Statistical Analysis",
            category="Core Methodology",
            score=82,
            required_score=75,
            gap_points=0,
            status="competent",
            description="Inferential statistics and regression modeling.",
        )
        comp2 = Competency(
            id="comp_survey_method",
            name="Survey Methodology",
            category="Field Operations",
            score=76,
            required_score=75,
            gap_points=0,
            status="competent",
            description="Sampling designs and field operations.",
        )
        comp3 = Competency(
            id="comp_prob_sampling",
            name="Probability Sampling",
            category="Field Operations",
            score=42,
            required_score=75,
            gap_points=33,
            status="critical_gap",
            description="Probability sampling and Horvitz-Thompson estimation.",
        )
        session.add_all([comp1, comp2, comp3])

        # 2. Seed knowledge graph nodes
        n_sampling = CompetencyNode(
            id="concept_sampling",
            name="Sampling Fundamentals",
            category="Field Operations",
            level="foundational",
            competency_id="comp_survey_method",
        )
        n_dist = CompetencyNode(
            id="concept_sampling_dist",
            name="Sampling Distribution",
            category="Core Methodology",
            level="intermediate",
            competency_id="comp_survey_method",
        )
        n_se = CompetencyNode(
            id="concept_std_error",
            name="Standard Error",
            category="Core Methodology",
            level="intermediate",
            competency_id="comp_stat_analysis",
        )
        n_ci = CompetencyNode(
            id="concept_conf_interval",
            name="Confidence Interval",
            category="Core Methodology",
            level="intermediate",
            competency_id="comp_prob_sampling",
        )
        session.add_all([n_sampling, n_dist, n_se, n_ci])

        # 3. Seed relationships
        rel1 = CompetencyRelationship(
            source_node_id="concept_sampling",
            target_node_id="concept_sampling_dist",
            relationship_type="prerequisite",
            weight=1.0,
            description="Sampling is prerequisite to Sampling Distribution.",
        )
        rel2 = CompetencyRelationship(
            source_node_id="concept_sampling_dist",
            target_node_id="concept_std_error",
            relationship_type="depends_on",
            weight=0.9,
            description="Standard error depends on sampling distribution.",
        )
        rel3 = CompetencyRelationship(
            source_node_id="concept_std_error",
            target_node_id="concept_conf_interval",
            relationship_type="prerequisite",
            weight=1.0,
            description="Standard error is prerequisite to Confidence Interval.",
        )
        session.add_all([rel1, rel2, rel3])

        # 4. Seed misconception
        misc = Misconception(
            id="misc_conf_interval_param_prob",
            title="Confidence Interval Interpreted as Parameter Probability",
            concept="Confidence Interval Interpretation",
            explanation="Believing a 95% CI means 95% probability true parameter is inside.",
            detection_rule="High confidence on parameter probability question.",
            confidence_level="Very High",
            counter_example="Parameter is a fixed constant, not a random variable.",
            remediation_hint="Remember frequentist definition of long-run coverage.",
        )
        session.add(misc)

        session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def client(db_session: Session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_officer_ananya(db_session: Session):
    """Creates authenticated officer Ananya Sharma with Bearer token."""
    user = User(
        igot_id="IGOT202600123",
        email="ananya.sharma@gov.in",
        password_hash=hash_password("Stat@123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    profile = OfficerProfile(
        user_id=user.id,
        name="Ananya Sharma",
        phone="9876543210",
        dob="1992-08-14",
        department="Official Statistics Division",
        designation="Statistical Officer",
        years_of_experience=6,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(data={"sub": user.igot_id})
    return {"user": user, "profile": profile, "token": token}


@pytest.fixture
def auth_officer_vikram(db_session: Session):
    """Creates a second authenticated officer Vikram Singh for isolation testing."""
    user = User(
        igot_id="IGOT202600999",
        email="vikram.singh@gov.in",
        password_hash=hash_password("Vikram@123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    profile = OfficerProfile(
        user_id=user.id,
        name="Vikram Singh",
        phone="9811223344",
        dob="1990-01-01",
        department="Sample Survey Division",
        designation="Deputy Director",
        years_of_experience=10,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(data={"sub": user.igot_id})
    return {"user": user, "profile": profile, "token": token}


# ---------------------------------------------------------------------------
# Test 1 to 5: Mathematical Scoring Engine
# ---------------------------------------------------------------------------
def test_01_score_calculation():
    # Prompt requirement: Assessment 80, Quiz 70, Practical 60 -> 71
    score = CompetencyEvaluationService.calculate_score(80, 70, 60)
    assert score == 71.0


def test_02_competent_classification():
    assert CompetencyEvaluationService.classify_status(75.0) == "competent"
    assert CompetencyEvaluationService.classify_status(85.5) == "competent"


def test_03_moderate_classification():
    assert CompetencyEvaluationService.classify_status(50.0) == "moderate_gap"
    assert CompetencyEvaluationService.classify_status(74.9) == "moderate_gap"


def test_04_critical_classification():
    assert CompetencyEvaluationService.classify_status(49.9) == "critical_gap"
    assert CompetencyEvaluationService.classify_status(35.0) == "critical_gap"


def test_05_gap_point_calculation():
    assert CompetencyEvaluationService.calculate_gap_points(71.0, 75.0) == 4
    assert CompetencyEvaluationService.calculate_gap_points(82.0, 75.0) == 0
    assert CompetencyEvaluationService.calculate_gap_points(42.0, 75.0) == 33


# ---------------------------------------------------------------------------
# Test 6 to 12: Diagnostic Gap Engine Scenarios
# ---------------------------------------------------------------------------
def test_06_basic_concept_diagnosis(db_session: Session, auth_officer_ananya):
    # Scenario A: Weak assessment + weak quiz without high confidence error
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]
    comp = db_session.query(Competency).filter(Competency.id == "comp_prob_sampling").first()

    # Prerequisite evidence also present and weak (45%), confirming across-the-board foundational deficit
    ev_prereq = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id="comp_stat_analysis",
        assessment_score=45.0,
        quiz_accuracy=46.0,
        practical_performance=44.0,
        repeated_errors=0,
        confidence_pattern="Hesitant",
    )
    db_session.add(ev_prereq)

    evidence = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp.id,
        assessment_score=45.0,
        quiz_accuracy=48.0,
        practical_performance=46.0,
        assessment_ratio="4/6 incorrect",
        repeated_errors=1,
        confidence_pattern="Hesitant: Low confidence + incorrect",
    )
    db_session.add(evidence)
    db_session.commit()

    service = GapDiagnosisService(db_session)
    diagnosis = service.diagnose_competency(user, comp)

    assert diagnosis.diagnosis_type == "basic_concept"
    assert diagnosis.severity == "critical_gap"
    assert "Foundational knowledge deficit" in diagnosis.explanation


def test_07_misconception_diagnosis(db_session: Session, auth_officer_ananya):
    # Scenario B: Repeated errors + High confidence incorrect
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]
    comp = db_session.query(Competency).filter(Competency.id == "comp_prob_sampling").first()

    evidence = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp.id,
        assessment_score=52.0,
        quiz_accuracy=55.0,
        practical_performance=54.0,
        assessment_ratio="4/6 incorrect",
        repeated_errors=3,
        confidence_pattern="High confidence + incorrect",
    )
    db_session.add(evidence)
    db_session.commit()

    service = GapDiagnosisService(db_session)
    diagnosis = service.diagnose_competency(user, comp)

    assert diagnosis.diagnosis_type == "statistical_misconception"
    assert diagnosis.confidence >= 0.88
    assert "Systematic cognitive misconception detected" in diagnosis.explanation


def test_08_wrong_high_confidence_increases_misconception_confidence(db_session: Session, auth_officer_ananya):
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]
    comp = db_session.query(Competency).filter(Competency.id == "comp_prob_sampling").first()

    # Evidence with 2 errors
    ev_2_errors = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp.id,
        assessment_score=50.0,
        quiz_accuracy=50.0,
        practical_performance=50.0,
        repeated_errors=2,
        confidence_pattern="High confidence + incorrect",
    )
    service = GapDiagnosisService(db_session)
    diag_2 = service.diagnose_competency(user, comp, ev_2_errors, persist=False)

    # Evidence with 4 errors
    ev_4_errors = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp.id,
        assessment_score=50.0,
        quiz_accuracy=50.0,
        practical_performance=50.0,
        repeated_errors=4,
        confidence_pattern="High confidence + incorrect",
    )
    diag_4 = service.diagnose_competency(user, comp, ev_4_errors, persist=False)

    assert diag_4.confidence > diag_2.confidence


def test_09_practical_application_gap(db_session: Session, auth_officer_ananya):
    # Scenario C: Strong conceptual/quiz, drop in practical performance (< 55%)
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]
    comp = db_session.query(Competency).filter(Competency.id == "comp_survey_method").first()

    evidence = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp.id,
        assessment_score=80.0,
        quiz_accuracy=84.0,
        practical_performance=48.0,
        assessment_ratio="2/7 incorrect",
        repeated_errors=0,
        confidence_pattern="Normal",
    )
    db_session.add(evidence)
    db_session.commit()

    service = GapDiagnosisService(db_session)
    diagnosis = service.diagnose_competency(user, comp)

    assert diagnosis.diagnosis_type == "application_gap"
    assert "application/practical gap" in diagnosis.explanation
    assert diagnosis.root_cause_competency_id == "practical_execution"


def test_10_integrated_concept_gap(db_session: Session, auth_officer_ananya):
    # Scenario D: Prerequisites are strong (>= 75%), but integrated target drops (< 60%)
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]

    # Prerequisite competency: comp_stat_analysis is strong (80.8 >= 75%)
    ev_prereq = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id="comp_stat_analysis",
        assessment_score=82.0,
        quiz_accuracy=80.0,
        practical_performance=80.0,
        repeated_errors=0,
        confidence_pattern="Calibrated",
    )
    db_session.add(ev_prereq)

    # Target competency: comp_prob_sampling depends on concept_std_error (from comp_stat_analysis)
    # Target combined score drops to 52 (< 60%)
    comp_target = db_session.query(Competency).filter(Competency.id == "comp_prob_sampling").first()
    ev_target = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id="comp_prob_sampling",
        assessment_score=52.0,
        quiz_accuracy=54.0,
        practical_performance=50.0,
        repeated_errors=0,
        confidence_pattern="Hesitant",
    )
    db_session.add(ev_target)
    db_session.commit()

    service = GapDiagnosisService(db_session)
    diagnosis = service.diagnose_competency(user, comp_target)

    assert diagnosis.diagnosis_type == "integrated_concept"
    assert "integrated concept / relationship gap" in diagnosis.explanation


def test_11_insufficient_evidence_does_not_falsely_classify_integrated_gap(db_session: Session, auth_officer_ananya):
    # Scenario E: When prerequisite evidence is completely missing, should explicitly report insufficient_evidence
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]
    comp_target = db_session.query(Competency).filter(Competency.id == "comp_prob_sampling").first()

    # No prerequisite evidence in DB
    ev_target = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id="comp_prob_sampling",
        assessment_score=52.0,
        quiz_accuracy=54.0,
        practical_performance=50.0,
        repeated_errors=0,
        confidence_pattern="Hesitant",
    )
    db_session.add(ev_target)
    db_session.commit()

    service = GapDiagnosisService(db_session)
    diagnosis = service.diagnose_competency(user, comp_target)

    # Explicitly classified as insufficient_evidence, NEVER basic_concept, misconception, integrated_concept, or application_gap
    assert diagnosis.diagnosis_type == "insufficient_evidence"
    assert diagnosis.diagnosis_type != "basic_concept"
    assert diagnosis.diagnosis_type != "statistical_misconception"
    assert diagnosis.diagnosis_type != "integrated_concept"
    assert diagnosis.diagnosis_type != "application_gap"
    assert "insufficient_evidence" in diagnosis.explanation


def test_12_diagnosis_reasoning_trace_format(db_session: Session, auth_officer_ananya):
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]
    comp = db_session.query(Competency).filter(Competency.id == "comp_stat_analysis").first()

    ev = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp.id,
        assessment_score=85.0,
        quiz_accuracy=80.0,
        practical_performance=81.0,
        repeated_errors=0,
        confidence_pattern="Calibrated",
    )
    db_session.add(ev)
    db_session.commit()

    service = GapDiagnosisService(db_session)
    diagnosis = service.diagnose_competency(user, comp)

    trace = json.loads(diagnosis.reasoning_trace)
    assert "diagnosis_type" in trace
    assert "signals" in trace
    assert len(trace["signals"]) >= 5
    assert "conclusion" in trace


# ---------------------------------------------------------------------------
# Test 13 to 15: Security & Endpoint Isolation
# ---------------------------------------------------------------------------
def test_13_unauthenticated_request_rejected(client: TestClient):
    res = client.get("/api/diagnostics/competencies")
    assert res.status_code == 401


def test_14_authenticated_officer_can_retrieve_diagnostics(client: TestClient, auth_officer_ananya):
    token = auth_officer_ananya["token"]
    res = client.get(
        "/api/diagnostics/competencies",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "diagnosisType" in data[0]
    assert "reasoningTrace" in data[0]


def test_15_officer_evidence_isolation(client: TestClient, db_session: Session, auth_officer_ananya, auth_officer_vikram):
    # Ananya has evidence for comp_prob_sampling
    ananya_profile = auth_officer_ananya["profile"]
    ev_ananya = CompetencyEvidence(
        officer_profile_id=ananya_profile.id,
        competency_id="comp_prob_sampling",
        assessment_score=38.0,
        quiz_accuracy=45.0,
        practical_performance=44.0,
        repeated_errors=3,
        confidence_pattern="High confidence + incorrect",
    )
    db_session.add(ev_ananya)

    # Vikram has DIFFERENT evidence for comp_prob_sampling: High practical performance
    vikram_profile = auth_officer_vikram["profile"]
    ev_vikram = CompetencyEvidence(
        officer_profile_id=vikram_profile.id,
        competency_id="comp_prob_sampling",
        assessment_score=85.0,
        quiz_accuracy=82.0,
        practical_performance=88.0,
        repeated_errors=0,
        confidence_pattern="Calibrated",
    )
    db_session.add(ev_vikram)
    db_session.commit()

    # Vikram queries his diagnosis
    vikram_res = client.get(
        "/api/diagnostics/competencies/comp_prob_sampling",
        headers={"Authorization": f"Bearer {auth_officer_vikram['token']}"}
    )
    assert vikram_res.status_code == 200
    vikram_diag = vikram_res.json()

    # Vikram's diagnosis is competent, NOT Ananya's misconception
    assert vikram_diag["score"] >= 80
    assert vikram_diag["diagnosisType"] != "statistical_misconception"

    # Ananya queries her diagnosis
    ananya_res = client.get(
        "/api/diagnostics/competencies/comp_prob_sampling",
        headers={"Authorization": f"Bearer {auth_officer_ananya['token']}"}
    )
    assert ananya_res.status_code == 200
    ananya_diag = ananya_res.json()
    assert ananya_diag["diagnosisType"] == "statistical_misconception"


# ---------------------------------------------------------------------------
# Test 16: Knowledge Graph Relationships & Validation
# ---------------------------------------------------------------------------
def test_16_knowledge_graph_traversal(client: TestClient, auth_officer_ananya):
    token = auth_officer_ananya["token"]

    # Nodes
    nodes_res = client.get(
        "/api/diagnostics/knowledge-graph/nodes",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert nodes_res.status_code == 200
    nodes = nodes_res.json()
    assert len(nodes) >= 4
    node_ids = {n["id"] for n in nodes}
    assert "concept_sampling" in node_ids
    assert "concept_std_error" in node_ids

    # Relationships
    rels_res = client.get(
        "/api/diagnostics/knowledge-graph/relationships",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert rels_res.status_code == 200
    rels = rels_res.json()
    assert len(rels) >= 3
    rel_types = {r["relationshipType"] for r in rels}
    assert "prerequisite" in rel_types
    assert "depends_on" in rel_types


def test_17_invalid_relationship_type_rejected(db_session: Session):
    with pytest.raises(IntegrityError):
        bad_rel = CompetencyRelationship(
            source_node_id="concept_sampling",
            target_node_id="concept_std_error",
            relationship_type="invalid_custom_relationship",  # CheckConstraint rejects
        )
        db_session.add(bad_rel)
        db_session.commit()
    db_session.rollback()


def test_18_insufficient_evidence_never_misclassified_as_other_gap_types(db_session: Session, auth_officer_ananya):
    """Verifies that unassessed / missing evidence never falsely resolves to basic, misconception, integrated, or application gap."""
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]

    # Competency with zero baseline and no evidence records
    new_comp = Competency(
        id="comp_unassessed_test",
        name="Unassessed Statistical Testing",
        category="Experimental",
        score=0,
        required_score=75,
        gap_points=75,
        status="critical_gap",
        description="Newly assigned competency without test submissions.",
    )
    db_session.add(new_comp)
    db_session.commit()

    service = GapDiagnosisService(db_session)
    diagnosis = service.diagnose_competency(user, new_comp)

    # Must be explicitly insufficient_evidence
    assert diagnosis.diagnosis_type == "insufficient_evidence"
    assert diagnosis.severity == "inconclusive"
    assert diagnosis.diagnosis_type not in (
        "basic_concept",
        "statistical_misconception",
        "integrated_concept",
        "application_gap",
    )
    assert "Insufficient diagnostic evidence" in diagnosis.explanation or "No multi-source evaluation records" in diagnosis.explanation


def test_19_threshold_boundary_verifications(db_session: Session, auth_officer_ananya):
    """
    Verifies:
    1. Application gap practical threshold: practical < 55.0 triggers, practical >= 55.0 does not.
    2. Integrated concept gap prerequisite threshold: avg_prereq >= 75.0 triggers, avg_prereq < 75.0 does not.
    """
    user = auth_officer_ananya["user"]
    profile = auth_officer_ananya["profile"]
    comp_survey = db_session.query(Competency).filter(Competency.id == "comp_survey_method").first()
    service = GapDiagnosisService(db_session)

    # 1. Application gap boundary check:
    # Practical = 56.0 (>= 55.0) -> should NOT be application_gap
    ev_above_55 = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp_survey.id,
        assessment_score=80.0,
        quiz_accuracy=84.0,
        practical_performance=56.0,
        repeated_errors=0,
        confidence_pattern="Normal",
    )
    diag_above = service.diagnose_competency(user, comp_survey, ev_above_55, persist=False)
    assert diag_above.diagnosis_type != "application_gap"

    # Practical = 54.0 (< 55.0) -> SHOULD be application_gap
    ev_below_55 = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp_survey.id,
        assessment_score=80.0,
        quiz_accuracy=84.0,
        practical_performance=54.0,
        repeated_errors=0,
        confidence_pattern="Normal",
    )
    diag_below = service.diagnose_competency(user, comp_survey, ev_below_55, persist=False)
    assert diag_below.diagnosis_type == "application_gap"

    # 2. Integrated concept gap boundary check:
    comp_target = db_session.query(Competency).filter(Competency.id == "comp_prob_sampling").first()
    ev_target = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id=comp_target.id,
        assessment_score=50.0,
        quiz_accuracy=50.0,
        practical_performance=50.0,
        repeated_errors=0,
        confidence_pattern="Normal",
    )
    db_session.add(ev_target)

    # Prerequisite average = 74.0 (< 75.0) -> should NOT be integrated_concept
    ev_prereq_74 = CompetencyEvidence(
        officer_profile_id=profile.id,
        competency_id="comp_stat_analysis",
        assessment_score=74.0,
        quiz_accuracy=74.0,
        practical_performance=74.0,
        repeated_errors=0,
        confidence_pattern="Calibrated",
    )
    db_session.add(ev_prereq_74)
    db_session.commit()

    diag_prereq_74 = service.diagnose_competency(user, comp_target)
    assert diag_prereq_74.diagnosis_type != "integrated_concept"
    assert diag_prereq_74.diagnosis_type == "basic_concept"

    # Prerequisite average = 76.0 (>= 75.0) -> SHOULD be integrated_concept
    ev_prereq_74.assessment_score = 76.0
    ev_prereq_74.quiz_accuracy = 76.0
    ev_prereq_74.practical_performance = 76.0
    db_session.commit()

    diag_prereq_76 = service.diagnose_competency(user, comp_target)
    assert diag_prereq_76.diagnosis_type == "integrated_concept"
