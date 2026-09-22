"""Development database seeding script for STAT-GAP AI (Phases 1, 2, and 3).

Seeds:
1. Competency catalog (7 statutory statistical domains)
2. 4-level Competency Ontology (Cadre -> Function -> Competency -> Sub-skill)
3. Competency Knowledge Graph (prerequisite, dependency, and parent_of relationships)
4. Structured Misconception Library (5 statistical misconceptions)
5. Competency Requirements Matrix (role, cadre, and assignment-based proficiency thresholds)
6. Prototype Civil Service Identities (Officer, Supervisor, Admin with Argon2id passwords)
7. Multi-source Structured Evidence Ledger (Assessment, Quiz, Practical, Experience)
8. Diagnostic Gap Engine evaluations (GapDiagnosis)
9. Competency Digital Twin computational states and Initial Baseline Snapshot

Password is read strictly from SEED_DEMO_PASSWORD environment variable.
"""
import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure workspace root is in sys.path
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(workspace_root, ".env"))
load_dotenv(os.path.join(workspace_root, "backend", ".env"))

from backend.app.core.database import SessionLocal, engine
from backend.app.models.base import Base
import backend.app.models  # Ensure all model tables are registered in Base.metadata
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship
from backend.app.models.misconception import Misconception
from backend.app.models.competency_requirement import CompetencyRequirement
from backend.app.models.structured_evidence import StructuredEvidence
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.digital_twin_snapshot import DigitalTwinSnapshot
from backend.app.services.diagnosis_service import GapDiagnosisService
from backend.app.services.digital_twin_service import DigitalTwinService


# ---------------------------------------------------------------------------
# 1. Statutory Competency Catalog
# ---------------------------------------------------------------------------
SEED_COMPETENCIES = [
    {
        "id": "comp_stat_analysis",
        "name": "Statistical Analysis",
        "category": "Core Methodology",
        "score": 82,
        "required_score": 75,
        "gap_points": 0,
        "status": "competent",
        "description": "Inferential statistics, parametric testing, hypothesis formulation and ANOVA within official datasets.",
        "evidence": {
            "assessment_score": 85.0,
            "quiz_accuracy": 80.0,
            "practical_performance": 81.0,
            "assessment_ratio": "1/6 incorrect",
            "repeated_errors": 0,
            "confidence_pattern": "Calibrated: High confidence + correct",
        },
    },
    {
        "id": "comp_survey_method",
        "name": "Survey Methodology",
        "category": "Field Operations",
        "score": 76,
        "required_score": 75,
        "gap_points": 0,
        "status": "competent",
        "description": "Stratified multi-stage sampling, sampling frame verification, non-response weighting in NSS & PLFS.",
        "evidence": {
            "assessment_score": 78.0,
            "quiz_accuracy": 82.0,
            "practical_performance": 48.0,
            "assessment_ratio": "2/7 incorrect",
            "repeated_errors": 1,
            "confidence_pattern": "Borderline: Fluctuating confidence",
        },
    },
    {
        "id": "comp_sampling_theory",
        "name": "Sampling Theory & Estimation",
        "category": "Core Methodology",
        "score": 70,
        "required_score": 75,
        "gap_points": 5,
        "status": "moderate_gap",
        "description": "Probability Proportional to Size (PPS), multi-stage cluster sampling, Horvitz-Thompson estimation and design effects.",
        "evidence": {
            "assessment_score": 68.0,
            "quiz_accuracy": 72.0,
            "practical_performance": 70.0,
            "assessment_ratio": "2/6 incorrect",
            "repeated_errors": 0,
            "confidence_pattern": "Calibrated: Moderate confidence",
        },
    },
    {
        "id": "comp_data_gov",
        "name": "Data Governance & Metadata",
        "category": "Standards & Compliance",
        "score": 64,
        "required_score": 75,
        "gap_points": 11,
        "status": "moderate_gap",
        "description": "National Data Sharing & Accessibility Policy (NDSAP), schema standardization, metadata cataloging, PII masking.",
        "evidence": {
            "assessment_score": 62.0,
            "quiz_accuracy": 65.0,
            "practical_performance": 66.0,
            "assessment_ratio": "3/6 incorrect",
            "repeated_errors": 1,
            "confidence_pattern": "Hesitant: Low confidence + incorrect",
        },
    },
    {
        "id": "comp_data_cleaning",
        "name": "Data Cleaning & Validation",
        "category": "Core Methodology",
        "score": 48,
        "required_score": 75,
        "gap_points": 27,
        "status": "critical_gap",
        "description": "Outlier detection using Mahalanobis distance, deterministic and probabilistic imputation, validation rule engines.",
        "evidence": {
            "assessment_score": 46.0,
            "quiz_accuracy": 50.0,
            "practical_performance": 49.0,
            "assessment_ratio": "5/8 incorrect",
            "repeated_errors": 1,
            "confidence_pattern": "Hesitant: Low confidence + incorrect",
        },
    },
    {
        "id": "comp_prob_sampling",
        "name": "Probability Sampling & Weighting",
        "category": "Field Operations",
        "score": 42,
        "required_score": 75,
        "gap_points": 33,
        "status": "critical_gap",
        "description": "Probability Proportional to Size (PPS) selection, post-stratification weighting, Horvitz-Thompson estimation.",
        "evidence": {
            "assessment_score": 38.0,
            "quiz_accuracy": 45.0,
            "practical_performance": 44.0,
            "assessment_ratio": "4/6 incorrect",
            "repeated_errors": 3,
            "confidence_pattern": "Severe Misconception: High confidence + incorrect",
        },
    },
    {
        "id": "comp_macro_acc",
        "name": "Macroeconomic Accounting",
        "category": "Economic Statistics",
        "score": 52,
        "required_score": 75,
        "gap_points": 23,
        "status": "moderate_gap",
        "description": "System of National Accounts (SNA 2008), GVA compilation by economic activity, FISIM allocation, chain volume indexing.",
        "evidence": {
            "assessment_score": 54.0,
            "quiz_accuracy": 55.0,
            "practical_performance": 47.0,
            "assessment_ratio": "4/7 incorrect",
            "repeated_errors": 1,
            "confidence_pattern": "Hesitant: Inconsistent calibration",
        },
    },
]


# ---------------------------------------------------------------------------
# 2. 4-Level Competency Ontology (Cadre -> Function -> Competency -> Sub-skill)
# ---------------------------------------------------------------------------
SEED_ONTOLOGY_NODES = [
    # Level 1: Cadre
    {
        "id": "cadre_iss",
        "code": "CADRE-ISS",
        "name": "Indian Statistical Service (ISS)",
        "description": "Premier civil service cadre responsible for official statistics, national accounts, and survey methodology in India.",
        "category": "Civil Service Cadre",
        "level": "cadre",
        "ontology_level": "cadre",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": None,
        "competency_id": None,
    },
    # Level 2: Functions
    {
        "id": "func_survey_ops",
        "code": "FUNC-SURV-OPS",
        "name": "Survey Operations & Field Management",
        "description": "Planning, sampling frame construction, digital field supervision, and non-sampling error control.",
        "category": "Official Statistics Functions",
        "level": "function",
        "ontology_level": "function",
        "domain": "statistical",
        "required_proficiency": 0.80,
        "parent_id": "cadre_iss",
        "competency_id": None,
    },
    {
        "id": "func_national_accounts",
        "code": "FUNC-NAT-ACCTS",
        "name": "National Accounts & Macroeconomic Aggregation",
        "description": "Compilation of Gross Domestic Product, Gross Value Added, Supply and Use Tables (SUT), and deflator analysis.",
        "category": "Official Statistics Functions",
        "level": "function",
        "ontology_level": "function",
        "domain": "statistical",
        "required_proficiency": 0.85,
        "parent_id": "cadre_iss",
        "competency_id": None,
    },
    {
        "id": "func_data_standards",
        "code": "FUNC-STANDARDS",
        "name": "Statistical Standards & Data Governance",
        "description": "Metadata registries, NDSAP compliance, data quality validation rules, and statistical anonymization.",
        "category": "Official Statistics Functions",
        "level": "function",
        "ontology_level": "function",
        "domain": "digital_governance",
        "required_proficiency": 0.75,
        "parent_id": "cadre_iss",
        "competency_id": None,
    },
    # Level 3: Competencies
    {
        "id": "comp_node_survey_method",
        "code": "COMP-SURV-01",
        "name": "Survey Methodology",
        "description": "Design and execution of large-scale socio-economic household and enterprise surveys.",
        "category": "Field Operations",
        "level": "competency",
        "ontology_level": "competency",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "func_survey_ops",
        "competency_id": "comp_survey_method",
    },
    {
        "id": "comp_node_sampling_theory",
        "code": "COMP-SAMP-01",
        "name": "Sampling Theory & Estimation",
        "description": "Mathematical sampling design, probability selection mechanisms, and post-stratified weighting.",
        "category": "Core Methodology",
        "level": "competency",
        "ontology_level": "competency",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "func_survey_ops",
        "competency_id": "comp_sampling_theory",
    },
    {
        "id": "comp_node_stat_analysis",
        "code": "COMP-STAT-01",
        "name": "Statistical Analysis",
        "description": "Hypothesis testing, variance decomposition, linear regression modeling, and statistical inference.",
        "category": "Core Methodology",
        "level": "competency",
        "ontology_level": "competency",
        "domain": "statistical",
        "required_proficiency": 0.80,
        "parent_id": "func_national_accounts",
        "competency_id": "comp_stat_analysis",
    },
    {
        "id": "comp_node_macro_acc",
        "code": "COMP-MACRO-01",
        "name": "Macroeconomic Accounting",
        "description": "SNA 2008 compilation, production and expenditure approaches to GDP, FISIM, and index compilation.",
        "category": "Economic Statistics",
        "level": "competency",
        "ontology_level": "competency",
        "domain": "statistical",
        "required_proficiency": 0.85,
        "parent_id": "func_national_accounts",
        "competency_id": "comp_macro_acc",
    },
    {
        "id": "comp_node_data_cleaning",
        "code": "COMP-CLEAN-01",
        "name": "Data Cleaning & Validation",
        "description": "Outlier detection, consistency rule engine formulation, and deterministic imputation protocols.",
        "category": "Standards & Compliance",
        "level": "competency",
        "ontology_level": "competency",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "func_data_standards",
        "competency_id": "comp_data_cleaning",
    },
    {
        "id": "comp_node_data_gov",
        "code": "COMP-GOV-01",
        "name": "Data Governance & Metadata",
        "description": "Data cataloging, NDSAP compliance, data privacy, and open statistical dissemination.",
        "category": "Standards & Compliance",
        "level": "competency",
        "ontology_level": "competency",
        "domain": "digital_governance",
        "required_proficiency": 0.75,
        "parent_id": "func_data_standards",
        "competency_id": "comp_data_gov",
    },
    # Level 4: Sub-Skills
    {
        "id": "sub_sampling_frames",
        "code": "SUB-SAMP-01",
        "name": "Sampling Frames & Registry Verification",
        "description": "Construction and updating of primary sampling unit frames (e.g. UFS blocks, Census enumeration blocks).",
        "category": "Sub-Skill",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.80,
        "parent_id": "comp_node_sampling_theory",
        "competency_id": "comp_sampling_theory",
    },
    {
        "id": "sub_prob_sampling",
        "code": "SUB-SAMP-02",
        "name": "Probability Proportional to Size (PPS) Selection",
        "description": "Hansen-Hurwitz and Horvitz-Thompson estimation schemes with unequal selection probabilities.",
        "category": "Sub-Skill",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "comp_node_sampling_theory",
        "competency_id": "comp_sampling_theory",
    },
    {
        "id": "sub_stratified_sampling",
        "code": "SUB-SAMP-03",
        "name": "Stratified Multi-Stage Cluster Sampling",
        "description": "Optimal Neyman allocation across rural/urban strata and intra-cluster correlation control.",
        "category": "Sub-Skill",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "comp_node_sampling_theory",
        "competency_id": "comp_sampling_theory",
    },
    {
        "id": "sub_questionnaire_design",
        "code": "SUB-SURV-01",
        "name": "Questionnaire Design & Cognitive Pre-testing",
        "description": "Question ordering, recall period calibration, and CAPI validation skip logic.",
        "category": "Sub-Skill",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "comp_node_survey_method",
        "competency_id": "comp_survey_method",
    },
    {
        "id": "sub_non_response",
        "code": "SUB-SURV-02",
        "name": "Non-Response Adjustment & Calibration Weighting",
        "description": "Weight adjustments for unit non-response and post-stratification benchmark alignment.",
        "category": "Sub-Skill",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "comp_node_survey_method",
        "competency_id": "comp_survey_method",
    },
    {
        "id": "sub_gdp_compilation",
        "code": "SUB-MACRO-01",
        "name": "GVA by Economic Activity",
        "description": "Sector-wise estimation of gross output, intermediate consumption, and double deflation.",
        "category": "Sub-Skill",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.85,
        "parent_id": "comp_node_macro_acc",
        "competency_id": "comp_macro_acc",
    },
    {
        "id": "sub_deflator_analysis",
        "code": "SUB-MACRO-02",
        "name": "GDP Deflator vs Consumer Price Index (CPI)",
        "description": "Reconciling implicit price deflators with Laspeyres consumer basket inflation measures.",
        "category": "Sub-Skill",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.80,
        "parent_id": "comp_node_macro_acc",
        "competency_id": "comp_macro_acc",
    },
    {
        "id": "concept_variance",
        "code": "CONCEPT-VAR-01",
        "name": "Variance & Dispersion",
        "description": "Population variance, sample variance, sum of squares, and degrees of freedom.",
        "category": "Core Methodology",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "comp_node_stat_analysis",
        "competency_id": "comp_stat_analysis",
    },
    {
        "id": "concept_std_error",
        "code": "CONCEPT-SE-01",
        "name": "Standard Error",
        "description": "Standard deviation of a sampling distribution; quantifying estimator precision.",
        "category": "Core Methodology",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "comp_node_stat_analysis",
        "competency_id": "comp_stat_analysis",
    },
    {
        "id": "concept_conf_interval",
        "code": "CONCEPT-CI-01",
        "name": "Confidence Interval",
        "description": "Interval estimation capturing parameter frequency over hypothetical repeated samples.",
        "category": "Core Methodology",
        "level": "sub_skill",
        "ontology_level": "sub_skill",
        "domain": "statistical",
        "required_proficiency": 0.75,
        "parent_id": "comp_node_stat_analysis",
        "competency_id": "comp_stat_analysis",
    },
]


# ---------------------------------------------------------------------------
# 3. Directed Knowledge Graph Relationships (Parent-of, Prerequisite, Depends-on)
# ---------------------------------------------------------------------------
SEED_RELATIONSHIPS = [
    # Hierarchy edges (PARENT_OF)
    {"source_node_id": "cadre_iss", "target_node_id": "func_survey_ops", "relationship_type": "parent_of", "weight": 1.0, "description": "Cadre contains Survey Operations function"},
    {"source_node_id": "cadre_iss", "target_node_id": "func_national_accounts", "relationship_type": "parent_of", "weight": 1.0, "description": "Cadre contains National Accounts function"},
    {"source_node_id": "cadre_iss", "target_node_id": "func_data_standards", "relationship_type": "parent_of", "weight": 1.0, "description": "Cadre contains Data Standards function"},

    {"source_node_id": "func_survey_ops", "target_node_id": "comp_node_survey_method", "relationship_type": "parent_of", "weight": 1.0, "description": "Function encompasses Survey Methodology"},
    {"source_node_id": "func_survey_ops", "target_node_id": "comp_node_sampling_theory", "relationship_type": "parent_of", "weight": 1.0, "description": "Function encompasses Sampling Theory"},
    {"source_node_id": "func_national_accounts", "target_node_id": "comp_node_stat_analysis", "relationship_type": "parent_of", "weight": 1.0, "description": "Function encompasses Statistical Analysis"},
    {"source_node_id": "func_national_accounts", "target_node_id": "comp_node_macro_acc", "relationship_type": "parent_of", "weight": 1.0, "description": "Function encompasses Macroeconomic Accounting"},

    # Prerequisite DAG edges
    {"source_node_id": "comp_node_sampling_theory", "target_node_id": "comp_node_survey_method", "relationship_type": "prerequisite", "weight": 1.0, "description": "Sampling theory is required to design surveys"},
    {"source_node_id": "sub_sampling_frames", "target_node_id": "sub_prob_sampling", "relationship_type": "prerequisite", "weight": 1.0, "description": "Verified sampling frames are required for PPS selection"},
    {"source_node_id": "sub_prob_sampling", "target_node_id": "sub_stratified_sampling", "relationship_type": "prerequisite", "weight": 1.0, "description": "PPS selection is applied within stratified multi-stage designs"},
    {"source_node_id": "concept_variance", "target_node_id": "concept_std_error", "relationship_type": "prerequisite", "weight": 1.0, "description": "Standard error formulation directly requires variance calculation"},
    {"source_node_id": "concept_std_error", "target_node_id": "concept_conf_interval", "relationship_type": "prerequisite", "weight": 1.0, "description": "Confidence intervals use standard error"},
    {"source_node_id": "sub_gdp_compilation", "target_node_id": "sub_deflator_analysis", "relationship_type": "depends_on", "weight": 0.9, "description": "Deflator analysis requires industry gross value added figures"},
]


# ---------------------------------------------------------------------------
# 4. Structured Misconception Library
# ---------------------------------------------------------------------------
SEED_MISCONCEPTIONS = [
    {
        "id": "misc_p_value_null_true",
        "title": "P-Value as Probability Null is True",
        "concept": "Hypothesis Testing",
        "explanation": "Confusing P(Data | H0) with P(H0 | Data). A low p-value indicates observed data is unlikely under the null, not that the null itself has low probability.",
        "detection_rule": "High confidence incorrect answer on p-value definition item in adaptive quiz.",
        "confidence_level": "High",
        "counter_example": "A fair coin tossed 10 times showing 10 heads gives p < 0.001 under H0: p=0.5, but this is the probability of the sequence, not the probability that the coin is fair.",
        "remediation_hint": "Review the formal definition of conditional probability: P(Evidence | H0) is strictly not P(H0 | Evidence).",
    },
    {
        "id": "misc_sample_size_pop_ratio",
        "title": "Sample Size Must Be Fixed Percentage of Population",
        "concept": "Survey Sampling",
        "explanation": "Believing valid survey samples require a 5% or 10% sampling fraction regardless of population size N, ignoring the finite population correction factor.",
        "detection_rule": "Repeated errors on sample size determination items + severe gap on probability sampling.",
        "confidence_level": "High",
        "counter_example": "A blood sample of 5ml tests a human with 5 liters of blood (fraction 0.001), yet provides a reliable diagnosis due to dispersion homogeneity.",
        "remediation_hint": "Focus on the Central Limit Theorem: standard error depends primarily on sample size n, not population size N (when N is large).",
    },
    {
        "id": "misc_conf_interval_individual",
        "title": "Confidence Interval Captures 95% of Individual Observations",
        "concept": "Interval Estimation",
        "explanation": "Mistaking a confidence interval for the population parameter (mean) with a prediction interval or tolerance interval for individual observations.",
        "detection_rule": "High confidence error on confidence interval interpretation item.",
        "confidence_level": "High",
        "counter_example": "A 95% CI for average household income in PLFS might be [₹24,000, ₹26,000], but very few individual households earn within that narrow band.",
        "remediation_hint": "Confidence intervals bound the unknown population parameter (mean), not the distribution of individual observation points.",
    },
    {
        "id": "misc_gdp_deflator_cpi",
        "title": "Conflating GDP Deflator with Consumer Price Index (CPI)",
        "concept": "Macroeconomic Accounting",
        "explanation": "Treating GDP Deflator and CPI as interchangeable inflation measures, ignoring imported good inclusions and base-year Laspeyres vs Paasche weighting differences.",
        "detection_rule": "Repeated errors on national accounts deflator compilation + moderate gap.",
        "confidence_level": "Medium",
        "counter_example": "Imported crude oil price increases directly inflate CPI but do not directly enter the GDP deflator except through domestic production margins.",
        "remediation_hint": "Distinguish domestic production basket (GDP Deflator) from consumer consumption basket (CPI).",
    },
]


# ---------------------------------------------------------------------------
# 5. Competency Requirements Matrix
# ---------------------------------------------------------------------------
SEED_REQUIREMENTS = [
    # National Accounts Division requirements (Officer Ananya's assignment)
    {"competency_id": "comp_macro_acc", "cadre": "ISS", "current_assignment": "National Accounts Compilation & Deflator Analysis", "required_level": 0.85, "priority": 4, "description": "Core requirement for National Accounts Division"},
    {"competency_id": "comp_stat_analysis", "cadre": "ISS", "current_assignment": "National Accounts Compilation & Deflator Analysis", "required_level": 0.80, "priority": 4, "description": "Parametric validation in national aggregation"},
    {"competency_id": "comp_data_cleaning", "cadre": "ISS", "current_assignment": "National Accounts Compilation & Deflator Analysis", "required_level": 0.75, "priority": 4, "description": "Imputation and outlier screening in SUT balancing"},
    # Generic ISS requirements
    {"competency_id": "comp_survey_method", "cadre": "ISS", "current_assignment": None, "required_level": 0.75, "priority": 1, "description": "Standard ISS baseline for sample survey methodology"},
    {"competency_id": "comp_sampling_theory", "cadre": "ISS", "current_assignment": None, "required_level": 0.75, "priority": 1, "description": "Standard ISS baseline for mathematical sampling"},
    {"competency_id": "comp_data_gov", "cadre": "ISS", "current_assignment": None, "required_level": 0.70, "priority": 1, "description": "Standard ISS baseline for data governance"},
]


# ---------------------------------------------------------------------------
# Seeding Main Logic
# ---------------------------------------------------------------------------
def seed_database():
    demo_password = os.environ.get("SEED_DEMO_PASSWORD", "").strip()
    if not demo_password or demo_password == "CHANGE_ME":
        print(
            "ERROR: SEED_DEMO_PASSWORD environment variable is not set or contains placeholder.\n"
            "Usage: $env:SEED_DEMO_PASSWORD='your_secure_password'; python backend/scripts/seed_data.py"
        )
        sys.exit(1)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("1. Seeding Competency catalog...")
        for comp_data in SEED_COMPETENCIES:
            comp = db.query(Competency).filter(Competency.id == comp_data["id"]).first()
            if not comp:
                comp = Competency(
                    id=comp_data["id"],
                    name=comp_data["name"],
                    category=comp_data["category"],
                    score=comp_data["score"],
                    required_score=comp_data["required_score"],
                    gap_points=comp_data["gap_points"],
                    status=comp_data["status"],
                    description=comp_data["description"],
                )
                db.add(comp)
            else:
                comp.name = comp_data["name"]
                comp.category = comp_data["category"]
                comp.score = comp_data["score"]
                comp.required_score = comp_data["required_score"]
                comp.gap_points = comp_data["gap_points"]
                comp.status = comp_data["status"]
                comp.description = comp_data["description"]
        db.commit()
        print("   Competencies seeded successfully.")

        print("2. Seeding 4-Level Competency Ontology Nodes...")
        # Pass 1: Upsert nodes without parent_id to avoid FK ordering constraints
        for node_data in SEED_ONTOLOGY_NODES:
            node = db.query(CompetencyNode).filter(CompetencyNode.id == node_data["id"]).first()
            if not node:
                node = CompetencyNode(
                    id=node_data["id"],
                    code=node_data["code"],
                    name=node_data["name"],
                    description=node_data["description"],
                    category=node_data["category"],
                    level=node_data["level"],
                    ontology_level=node_data["ontology_level"],
                    domain=node_data["domain"],
                    required_proficiency=node_data["required_proficiency"],
                    competency_id=node_data["competency_id"],
                )
                db.add(node)
            else:
                node.code = node_data["code"]
                node.name = node_data["name"]
                node.description = node_data["description"]
                node.category = node_data["category"]
                node.level = node_data["level"]
                node.ontology_level = node_data["ontology_level"]
                node.domain = node_data["domain"]
                node.required_proficiency = node_data["required_proficiency"]
                node.competency_id = node_data["competency_id"]
        db.commit()

        # Pass 2: Connect parent_id pointers
        for node_data in SEED_ONTOLOGY_NODES:
            if node_data["parent_id"]:
                node = db.query(CompetencyNode).filter(CompetencyNode.id == node_data["id"]).first()
                if node:
                    node.parent_id = node_data["parent_id"]
        db.commit()
        print("   Ontology nodes seeded successfully.")


        print("3. Seeding Competency Knowledge Graph Relationships...")
        for rel_data in SEED_RELATIONSHIPS:
            rel = (
                db.query(CompetencyRelationship)
                .filter(
                    CompetencyRelationship.source_node_id == rel_data["source_node_id"],
                    CompetencyRelationship.target_node_id == rel_data["target_node_id"],
                    CompetencyRelationship.relationship_type == rel_data["relationship_type"],
                )
                .first()
            )
            if not rel:
                rel = CompetencyRelationship(
                    source_node_id=rel_data["source_node_id"],
                    target_node_id=rel_data["target_node_id"],
                    relationship_type=rel_data["relationship_type"],
                    weight=rel_data["weight"],
                    description=rel_data["description"],
                )
                db.add(rel)
        db.commit()
        print("   Graph relationships seeded successfully.")

        print("4. Seeding Competency Requirements Matrix...")
        for req_data in SEED_REQUIREMENTS:
            req = (
                db.query(CompetencyRequirement)
                .filter(
                    CompetencyRequirement.competency_id == req_data["competency_id"],
                    CompetencyRequirement.cadre == req_data["cadre"],
                    CompetencyRequirement.current_assignment == req_data["current_assignment"],
                )
                .first()
            )
            if not req:
                req = CompetencyRequirement(
                    competency_id=req_data["competency_id"],
                    cadre=req_data["cadre"],
                    current_assignment=req_data["current_assignment"],
                    required_level=req_data["required_level"],
                    priority=req_data["priority"],
                    description=req_data["description"],
                )
                db.add(req)
        db.commit()
        print("   Competency Requirements seeded successfully.")

        print("5. Seeding Structured Misconceptions...")
        for misc_data in SEED_MISCONCEPTIONS:
            misc = db.query(Misconception).filter(Misconception.id == misc_data["id"]).first()
            if not misc:
                misc = Misconception(
                    id=misc_data["id"],
                    title=misc_data["title"],
                    concept=misc_data["concept"],
                    explanation=misc_data["explanation"],
                    detection_rule=misc_data["detection_rule"],
                    confidence_level=misc_data["confidence_level"],
                    counter_example=misc_data["counter_example"],
                    remediation_hint=misc_data["remediation_hint"],
                )
                db.add(misc)
        db.commit()
        print("   Misconceptions seeded successfully.")

        print("6. Seeding Prototype Civil Service Identities (Officer, Supervisor, Admin)...")
        hashed_pwd = hash_password(demo_password)
        demo_identities = [
            {
                "igot_id": "IGOT202600123",
                "email": "ananya.sharma@demo.statgap.local",
                "role": "OFFICER",
                "name": "Ananya Sharma",
                "phone": "9876543210",
                "dob": "1992-08-14",
                "department": "National Accounts Division",
                "designation": "Statistical Officer",
                "years_of_experience": 6,
                "cadre": "ISS",
                "current_assignment": "National Accounts Compilation & Deflator Analysis",
                "qualifications": "M.Sc. Statistics (University of Delhi)",
                "profile_photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop",
            },
            {
                "igot_id": "IGOT-SUP-2026001",
                "email": "rajesh.verma@demo.statgap.local",
                "role": "SUPERVISOR",
                "name": "Dr. Rajesh Verma",
                "phone": "9876543211",
                "dob": "1982-04-12",
                "department": "Field Operations Division",
                "designation": "Director / Joint Director",
                "years_of_experience": 15,
                "cadre": "ISS",
                "current_assignment": "Field Operations & PLFS Survey Supervision",
                "qualifications": "Ph.D. Econometrics (ISI Kolkata)",
                "profile_photo": None,
            },
            {
                "igot_id": "IGOT-ADM-2026001",
                "email": "admin@demo.statgap.local",
                "role": "ADMIN",
                "name": "Sanjay Mehta",
                "phone": "9876543212",
                "dob": "1978-11-20",
                "department": "Data Informatics & Innovation Division (DIID)",
                "designation": "System Administrator / Joint Director",
                "years_of_experience": 18,
                "cadre": "ISS",
                "current_assignment": "Competency Platform Governance & Access Control",
                "qualifications": "M.Tech CS, B.Stat (ISI Kolkata)",
                "profile_photo": None,
            },
        ]

        officer_user = None
        for id_data in demo_identities:
            u = db.query(User).filter(User.igot_id == id_data["igot_id"]).first()
            if not u:
                u = User(
                    igot_id=id_data["igot_id"],
                    email=id_data["email"],
                    password_hash=hashed_pwd,
                    role=id_data["role"],
                    is_active=True,
                )
                db.add(u)
                db.flush()
                prof = OfficerProfile(
                    user_id=u.id,
                    name=id_data["name"],
                    phone=id_data["phone"],
                    dob=id_data["dob"],
                    department=id_data["department"],
                    designation=id_data["designation"],
                    years_of_experience=id_data["years_of_experience"],
                    profile_photo=id_data["profile_photo"],
                    cadre=id_data["cadre"],
                    current_assignment=id_data["current_assignment"],
                    qualifications=id_data["qualifications"],
                )
                db.add(prof)
                db.commit()
                db.refresh(u)
                print(f"   Created prototype user [{id_data['role']}]: {id_data['name']}")
            else:
                u.password_hash = hashed_pwd
                u.role = id_data["role"]
                u.email = id_data["email"]
                if u.profile:
                    u.profile.name = id_data["name"]
                    u.profile.department = id_data["department"]
                    u.profile.designation = id_data["designation"]
                    u.profile.years_of_experience = id_data["years_of_experience"]
                    u.profile.cadre = id_data["cadre"]
                    u.profile.current_assignment = id_data["current_assignment"]
                    u.profile.qualifications = id_data["qualifications"]
                db.commit()
                print(f"   Updated prototype user [{id_data['role']}]: {id_data['name']}")

            if id_data["role"] == "OFFICER":
                officer_user = u

        demo_user = officer_user
        profile = demo_user.profile

        print("7. Seeding Structured Multi-Source Evidence Ledger...")
        # Clear old structured evidence for clean demonstration
        db.query(StructuredEvidence).filter(StructuredEvidence.officer_profile_id == profile.id).delete()
        db.commit()

        now = datetime.now(timezone.utc)
        structured_evidence_seeds = [
            # Statistical Analysis: Strong assessment and practical
            {"competency_id": "comp_stat_analysis", "source_type": "ASSESSMENT", "source_reference": "IRT-2026-089", "raw_score": 85.0, "normalized_score": 0.85, "recorded_at": now - timedelta(days=12)},
            {"competency_id": "comp_stat_analysis", "source_type": "QUIZ", "source_reference": "QUIZ-NSSTA-44", "raw_score": 80.0, "normalized_score": 0.80, "recorded_at": now - timedelta(days=20)},
            {"competency_id": "comp_stat_analysis", "source_type": "PRACTICAL", "source_reference": "LAB-OLS-02", "raw_score": 81.0, "normalized_score": 0.81, "recorded_at": now - timedelta(days=5)},

            # Survey Methodology: Strong conceptual quiz, moderate practical
            {"competency_id": "comp_survey_method", "source_type": "ASSESSMENT", "source_reference": "IRT-2026-092", "raw_score": 78.0, "normalized_score": 0.78, "recorded_at": now - timedelta(days=15)},
            {"competency_id": "comp_survey_method", "source_type": "QUIZ", "source_reference": "QUIZ-NSS-08", "raw_score": 82.0, "normalized_score": 0.82, "recorded_at": now - timedelta(days=35)},
            {"competency_id": "comp_survey_method", "source_type": "PRACTICAL", "source_reference": "SURVEY-AUDIT-01", "raw_score": 48.0, "normalized_score": 0.48, "recorded_at": now - timedelta(days=10)},

            # Macroeconomic Accounting: Deficit in deflator reconciliation
            {"competency_id": "comp_macro_acc", "source_type": "ASSESSMENT", "source_reference": "IRT-2026-104", "raw_score": 54.0, "normalized_score": 0.54, "recorded_at": now - timedelta(days=8)},
            {"competency_id": "comp_macro_acc", "source_type": "QUIZ", "source_reference": "QUIZ-SNA-01", "raw_score": 55.0, "normalized_score": 0.55, "recorded_at": now - timedelta(days=25)},
            {"competency_id": "comp_macro_acc", "source_type": "PRACTICAL", "source_reference": "SUT-RECON-03", "raw_score": 47.0, "normalized_score": 0.47, "recorded_at": now - timedelta(days=14)},
        ]

        for ev in structured_evidence_seeds:
            db.add(StructuredEvidence(
                officer_profile_id=profile.id,
                competency_id=ev["competency_id"],
                source_type=ev["source_type"],
                source_reference=ev["source_reference"],
                raw_score=ev["raw_score"],
                normalized_score=ev["normalized_score"],
                recorded_at=ev["recorded_at"],
            ))
        db.commit()
        print("   Structured Evidence ledger seeded successfully.")

        print("8. Building Initial Competency Digital Twin & Baseline Snapshot...")
        twin_service = DigitalTwinService(db)
        twin_data = twin_service.build_digital_twin(profile.id)
        snapshot = twin_service.create_snapshot(profile.id, trigger_event="INITIAL_PHASE3_BASELINE")
        print(f"   Digital Twin generated with {len(twin_data['competencyStates'])} evaluated states.")
        print(f"   Baseline Snapshot created: ID [{snapshot.snapshot_id}].")

        print("\nSUCCESS: Phase 3 Competency Intelligence, Ontology, and Digital Twin successfully seeded.")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
