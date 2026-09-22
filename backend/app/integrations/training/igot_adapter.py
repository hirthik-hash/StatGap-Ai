"""iGOT Karmayogi Training Provider Adapter — Phase 7."""
from __future__ import annotations

from typing import List

from backend.app.core.config import settings
from backend.app.integrations.igot.factory import get_igot_adapter
from backend.app.integrations.training.base import (
    NormalizedTrainingResource,
    ProviderActionResult,
    ProviderStatus,
    TrainingProviderAdapter,
)


class IgotTrainingAdapter(TrainingProviderAdapter):
    """Adapter bridging iGOT Karmayogi civil-service LMS to normalized STAT-GAP training."""

    def __init__(self) -> None:
        self._underlying = get_igot_adapter()

    def get_provider_code(self) -> str:
        return "igot"

    def get_display_name(self) -> str:
        return "iGOT Karmayogi Bharat"

    def get_status(self) -> ProviderStatus:
        mode = settings.IGOT_MODE.lower().strip()
        is_configured = getattr(self._underlying, "is_configured", True) if mode != "mock" else True
        desc = (
            "Mock iGOT Adapter active (Prototype Simulation). Provides normalized LMS digital courses."
            if mode == "mock"
            else ("Real iGOT Gateway configured." if is_configured else "Real iGOT Gateway unconfigured (Missing credentials).")
        )
        return ProviderStatus(
            provider="igot",
            name=self.get_display_name(),
            mode=mode,
            is_configured=is_configured,
            description=desc,
        )

    def fetch_catalogue(self) -> List[NormalizedTrainingResource]:
        """Returns normalized digital microlearning and e-learning courses from iGOT."""
        is_mock = settings.IGOT_MODE.lower().strip() == "mock"
        if not is_mock and not getattr(self._underlying, "is_configured", False):
            # Production boundary: Return empty list safely when live credentials unconfigured
            return []

        # Synthetic/Demo iGOT digital modules (clearly labelled is_mock=True in mock mode)
        return [
            NormalizedTrainingResource(
                external_reference_id="IGOT-COURSE-SAMPLING-001",
                provider="igot",
                title="NSS Survey Sampling Design & Multi-Stage Stratification",
                description="Comprehensive online digital module covering primary sampling units (PSU), stratification schemes, and sample weight calibration for national surveys.",
                competency_id="comp_survey_audit",
                subskills=["Stratified Sampling", "Multi-stage Sampling", "Weight Calibration", "Sample Allocation"],
                prerequisites=["comp_stat_theory"],
                duration_hours=12.0,
                delivery_mode="online_self_paced",
                difficulty_level="intermediate",
                programme_priority="high",
                target_cadre=["JSO", "SSO", "Field Investigator"],
                syllabus_highlights=[
                    "Module 1: Foundations of Probability Proportional to Size (PPS)",
                    "Module 2: Circular Systematic Sampling in NSS 78th/79th Rounds",
                    "Module 3: Multiplier and Design Weight Calibration",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"platform": "iGOT Karmayogi LMS", "format": "Interactive SCORM / Video"},
            ),
            NormalizedTrainingResource(
                external_reference_id="IGOT-COURSE-REGRESSION-002",
                provider="igot",
                title="Applied Statistical Inference & Multiple Regression Modeling",
                description="Self-paced interactive course focusing on OLS assumptions, elasticity interpretation, residual diagnostics, and avoiding coefficient misconceptions.",
                competency_id="comp_stat_theory",
                subskills=["Regression Interpretation", "OLS Assumptions", "Elasticity vs Marginal Change", "Hypothesis Testing"],
                prerequisites=[],
                duration_hours=8.0,
                delivery_mode="online_self_paced",
                difficulty_level="foundational",
                programme_priority="recommended",
                target_cadre=["JSO", "SSO", "All Statistical Cadres"],
                syllabus_highlights=[
                    "Module 1: Linear vs Semi-Log and Log-Log Formulations",
                    "Module 2: Marginal Effect (dy/dx) vs Percentage Elasticity",
                    "Module 3: Heteroskedasticity and Multicollinearity Remedies",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"platform": "iGOT Karmayogi LMS", "format": "Interactive Micro-learning"},
            ),
            NormalizedTrainingResource(
                external_reference_id="IGOT-COURSE-NATIONAL-ACCOUNTS-003",
                provider="igot",
                title="System of National Accounts (SNA 2008) & GVA Compilation",
                description="E-learning curriculum on macroeconomic aggregates, Gross Value Added (GVA) by economic activity, and Supply-Use Table (SUT) balances.",
                competency_id="comp_national_accounts",
                subskills=["SNA 2008 Principles", "GVA Estimation", "Double Deflation", "Supply-Use Tables"],
                prerequisites=["comp_stat_theory"],
                duration_hours=16.0,
                delivery_mode="online_self_paced",
                difficulty_level="intermediate",
                programme_priority="standard",
                target_cadre=["SSO", "Assistant Director", "Deputy Director"],
                syllabus_highlights=[
                    "Module 1: Production Boundary and Institutional Sectors",
                    "Module 2: Deflation Techniques for Services and Manufacturing",
                    "Module 3: SUT Matrix balancing and reconciliation",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"platform": "iGOT Karmayogi LMS", "format": "Video Lectures & Case Studies"},
            ),
            NormalizedTrainingResource(
                external_reference_id="IGOT-COURSE-DATA-QUALITY-004",
                provider="igot",
                title="CAPI Field Data Quality Auditing & Real-Time Validation Rules",
                description="Practical digital guide on configuring range checks, consistency logic, and outlier detection routines in Computer Assisted Personal Interviewing.",
                competency_id="comp_data_validation",
                subskills=["CAPI Validation", "Outlier Flagging", "Cross-Field Consistency", "Field Auditing"],
                prerequisites=[],
                duration_hours=6.0,
                delivery_mode="online_self_paced",
                difficulty_level="foundational",
                programme_priority="high",
                target_cadre=["JSO", "SSO", "Field Supervisor"],
                syllabus_highlights=[
                    "Module 1: Designing Hard vs Soft Validation Gates in CAPI",
                    "Module 2: Real-time Paradata Analysis and Speeding Detection",
                    "Module 3: Field Back-Check Protocols and Re-interview Audits",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"platform": "iGOT Karmayogi LMS", "format": "Interactive Simulator"},
            ),
        ]

    def enroll_officer(self, officer_id: str, officer_igot_id: str, resource_ref_id: str) -> ProviderActionResult:
        is_mock = settings.IGOT_MODE.lower().strip() == "mock"
        if not is_mock and not getattr(self._underlying, "is_configured", False):
            return ProviderActionResult(
                status="not_configured",
                provider="igot",
                resource_id=resource_ref_id,
                officer_id=officer_id,
                message="Real iGOT gateway is not configured. Live enrollment requires official API credentials.",
                is_mock=False,
            )

        return ProviderActionResult(
            status="enrolled",
            provider="igot",
            resource_id=resource_ref_id,
            officer_id=officer_id,
            message=f"Officer {officer_igot_id} successfully enrolled in iGOT Karmayogi course '{resource_ref_id}' (Demo Sandbox).",
            is_mock=is_mock,
        )
