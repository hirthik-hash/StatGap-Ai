"""TPAC (Training Programme Advisory Committee) Approved Curriculum Adapter — Phase 7."""
from __future__ import annotations

from typing import List

from backend.app.core.config import settings
from backend.app.integrations.training.base import (
    NormalizedTrainingResource,
    ProviderActionResult,
    ProviderStatus,
    TrainingProviderAdapter,
)


class TPACProgrammeAdapter(TrainingProviderAdapter):
    """Adapter for TPAC-approved national curriculum standards and training priorities.
    
    IMPORTANT ARCHITECTURAL NOTE:
    TPAC (Training Programme Advisory Committee) is NOT an LMS and does not host learner profiles.
    It is the statutory/advisory body defining official competency curricula, approved syllabi,
    and cadre training priorities for India's Official Statistical System.
    """

    def __init__(self) -> None:
        self.mode = settings.TPAC_MODE.lower().strip()

    def get_provider_code(self) -> str:
        return "tpac"

    def get_display_name(self) -> str:
        return "TPAC Approved Curriculum (Training Programme Advisory Committee)"

    def get_status(self) -> ProviderStatus:
        return ProviderStatus(
            provider="tpac",
            name=self.get_display_name(),
            mode=self.mode,
            is_configured=True,
            description="TPAC Authoritative Curriculum Repository active. Supplies national priority syllabus standards and mandatory competency baselines.",
        )

    def fetch_catalogue(self) -> List[NormalizedTrainingResource]:
        return [
            NormalizedTrainingResource(
                external_reference_id="TPAC-MANDATORY-2026-SAMPLING",
                provider="tpac",
                title="TPAC Standard Syllabus: Survey Sampling Design & Multiplier Estimation",
                description="Statutory curriculum blueprint approved by TPAC for mandatory induction and mid-career progression of statistical officers handling national socio-economic surveys.",
                competency_id="comp_survey_audit",
                subskills=["Sampling Design", "Stratified Sampling", "Weight Calibration", "Variance Estimation"],
                prerequisites=["comp_stat_theory"],
                duration_hours=18.0,
                delivery_mode="blended",
                difficulty_level="intermediate",
                programme_priority="mandatory",
                target_cadre=["JSO", "SSO", "All Cadres"],
                syllabus_highlights=[
                    "Core Competency Standard 1: Formulation of Sampling Frames in Rural & Urban Sectors",
                    "Core Competency Standard 2: Estimation of Standard Errors and Coefficient of Variation (CV)",
                    "Mandatory Evaluation: Practical Sampling Design Defence before Examination Board",
                ],
                status="active",
                is_mock=True,
                metadata={
                    "authority": "MoSPI Training Programme Advisory Committee",
                    "circular_reference": "TPAC/CURR/2026/01",
                    "statutory_mandatory": True,
                },
            ),
            NormalizedTrainingResource(
                external_reference_id="TPAC-RECOM-2026-REGRESSION-REMED",
                provider="tpac",
                title="TPAC Remediation Guide: Resolving Statistical Misconceptions in Regression Analysis",
                description="Expert-designed pedagogical intervention specifically targeting common elasticity vs marginal effect confusion and inappropriate causal assertions in official reports.",
                competency_id="comp_stat_theory",
                subskills=["Regression Interpretation", "Elasticity vs Marginal Change", "Misconception Diagnosis", "Hypothesis Testing"],
                prerequisites=[],
                duration_hours=5.0,
                delivery_mode="online_self_paced",
                difficulty_level="foundational",
                programme_priority="high",
                target_cadre=["JSO", "SSO", "Field Supervisors"],
                syllabus_highlights=[
                    "Pedagogical Unit 1: Misconception Taxonomy in Elasticity vs Absolute Rates",
                    "Pedagogical Unit 2: Worked Examples from PLFS and ASI Wage Equations",
                    "Pedagogical Unit 3: Verification Criterion for Independent Re-assessment",
                ],
                status="active",
                is_mock=True,
                metadata={
                    "authority": "TPAC Taskforce on Diagnostic Pedagogy",
                    "circular_reference": "TPAC/PEDAGOGY/2026/04",
                },
            ),
            NormalizedTrainingResource(
                external_reference_id="TPAC-MANDATORY-2026-SNA-GVA",
                provider="tpac",
                title="TPAC Curriculum Blueprint: National Accounts, GVA & Supply-Use Balances",
                description="Comprehensive syllabus standard for compilation of National Income, sector accounts, and Gross Fixed Capital Formation (GFCF).",
                competency_id="comp_national_accounts",
                subskills=["National Accounts Compilation", "GVA Estimation", "SUT Matrices", "Capital Formation"],
                prerequisites=["comp_stat_theory"],
                duration_hours=25.0,
                delivery_mode="virtual_instructor_led",
                difficulty_level="advanced",
                programme_priority="mandatory",
                target_cadre=["SSO", "Assistant Director", "National Accounts Wing"],
                syllabus_highlights=[
                    "Standard 1: Sequence of Accounts from Production to Financial Balance Sheet",
                    "Standard 2: Unincorporated Enterprise Survey Data Integration",
                    "Standard 3: Deflation and Constant Price Series Consistency",
                ],
                status="active",
                is_mock=True,
                metadata={
                    "authority": "TPAC Working Group on Macroeconomic Statistics",
                    "circular_reference": "TPAC/MACRO/2026/02",
                    "statutory_mandatory": True,
                },
            ),
            NormalizedTrainingResource(
                external_reference_id="TPAC-GUIDE-2026-DATA-VALIDATION",
                provider="tpac",
                title="TPAC National Guideline: Statistical Data Quality Framework & Integrity Audits",
                description="Authoritative guideline on data lifecycle assurance, computer-assisted interview validation, and anomaly prevention across state and central directorates.",
                competency_id="comp_data_validation",
                subskills=["Data Quality Framework", "Integrity Auditing", "CAPI Standards", "Anomaly Detection"],
                prerequisites=[],
                duration_hours=10.0,
                delivery_mode="blended",
                difficulty_level="intermediate",
                programme_priority="high",
                target_cadre=["All Statistical Cadres", "Data Managers"],
                syllabus_highlights=[
                    "Section A: Principles of Official Data Integrity (UN-FPOS Alignment)",
                    "Section B: Algorithmic Verification Gates during Field Ingestion",
                    "Section C: Audit Trail Standards for Field Re-interviews",
                ],
                status="active",
                is_mock=True,
                metadata={
                    "authority": "TPAC Committee on Data Quality & Standards",
                    "circular_reference": "TPAC/DQF/2026/03",
                },
            ),
        ]

    def enroll_officer(self, officer_id: str, officer_igot_id: str, resource_ref_id: str) -> ProviderActionResult:
        # TPAC is a syllabus/recommendation repository, not a direct LMS.
        # Direct action registers adherence or syllabus assignment in STAT-GAP.
        return ProviderActionResult(
            status="enrolled",
            provider="tpac",
            resource_id=resource_ref_id,
            officer_id=officer_id,
            message=f"TPAC Curriculum Standard '{resource_ref_id}' assigned to officer {officer_igot_id} learning pathway.",
            is_mock=True,
        )
