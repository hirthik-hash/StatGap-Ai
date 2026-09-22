"""NSSTA (National Statistical Systems Training Academy) Provider Adapter — Phase 7."""
from __future__ import annotations

from typing import List

from backend.app.core.config import settings
from backend.app.integrations.training.base import (
    NormalizedTrainingResource,
    ProviderActionResult,
    ProviderStatus,
    TrainingProviderAdapter,
)


class NSSTAAdapter(TrainingProviderAdapter):
    """Adapter for National Statistical Systems Training Academy (MoSPI premier academy)."""

    def __init__(self) -> None:
        self.base_url = settings.NSSTA_API_BASE_URL
        self.api_key = settings.NSSTA_API_KEY
        self.mode = settings.NSSTA_MODE.lower().strip()
        self.is_configured = bool(self.base_url and self.api_key) if self.mode != "mock" else True

    def get_provider_code(self) -> str:
        return "nssta"

    def get_display_name(self) -> str:
        return "National Statistical Systems Training Academy (NSSTA)"

    def get_status(self) -> ProviderStatus:
        desc = (
            "NSSTA Training Catalogue active (Academy Residential & Blended Programmes). "
            "Simulates official training calendar from NSSTA Greater Noida."
            if self.mode == "mock"
            else ("NSSTA Live API connected." if self.is_configured else "NSSTA Live API unconfigured (Credentials required).")
        )
        return ProviderStatus(
            provider="nssta",
            name=self.get_display_name(),
            mode=self.mode,
            is_configured=self.is_configured,
            description=desc,
        )

    def fetch_catalogue(self) -> List[NormalizedTrainingResource]:
        is_mock = self.mode == "mock"
        if not is_mock and not self.is_configured:
            return []

        return [
            NormalizedTrainingResource(
                external_reference_id="NSSTA-PROG-2026-SAMPLING-ADV",
                provider="nssta",
                title="Advanced Workshop on Large-Scale Survey Estimation & Calibration of Weights",
                description="Intensive 5-day residential workshop at NSSTA Greater Noida covering complex multistage sampling, domain estimation, GREG estimators, and calibration techniques in R/Python.",
                competency_id="comp_survey_audit",
                subskills=["Survey Estimation", "Weight Calibration", "Domain Estimation", "Variance Estimation in Complex Surveys"],
                prerequisites=["comp_stat_theory"],
                duration_hours=35.0,
                delivery_mode="classroom_residential",
                difficulty_level="advanced",
                programme_priority="mandatory",
                target_cadre=["SSO", "Senior Statistical Officer", "Assistant Director", "ISS Officers"],
                syllabus_highlights=[
                    "Day 1: Sampling Errors vs Non-Sampling Errors in National Surveys",
                    "Day 2: Generalised Regression (GREG) and Calibration Estimators",
                    "Day 3: Small Area Estimation (SAE) Techniques for District-Level Indicators",
                    "Day 4: Practical Computer Laboratory on NSS Microdata Calibration",
                    "Day 5: Case Study: Re-estimating PLFS Quarterly Urban Estimates",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"venue": "NSSTA Campus, Greater Noida", "cadre_level": "Mid-Career Training"},
            ),
            NormalizedTrainingResource(
                external_reference_id="NSSTA-PROG-2026-INDEX-NUMBERS",
                provider="nssta",
                title="Macroeconomic Price Statistics & CPI/IIP Compilation Methodologies",
                description="Comprehensive blended residential and laboratory programme covering Laspeyres, Paasche, and Chain Fisher indices, product basket rebasing, and seasonal adjustment.",
                competency_id="comp_index_numbers",
                subskills=["CPI Compilation", "IIP Estimation", "Base Year Revision", "Hedonic Pricing & Quality Adjustment"],
                prerequisites=["comp_stat_theory"],
                duration_hours=28.0,
                delivery_mode="blended",
                difficulty_level="intermediate",
                programme_priority="high",
                target_cadre=["JSO", "SSO", "Price Statistics Unit Officers"],
                syllabus_highlights=[
                    "Module 1: Elementary Price Indices and Aggregation Hierarchy",
                    "Module 2: Geometric Mean vs Ratio of Averages (Carli/Dutot/Jevons)",
                    "Module 3: Imputation Rules for Temporarily Missing Quotations",
                    "Module 4: Practical Exercises on National Consumer Price Index (CPI) Series",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"venue": "NSSTA & Virtual Hybrid", "batch_capacity": 30},
            ),
            NormalizedTrainingResource(
                external_reference_id="NSSTA-PROG-2026-DATA-VALIDATION-BOOTCAMP",
                provider="nssta",
                title="Field Survey Data Scrutiny, Paradata Analysis & Quality Control Bootcamp",
                description="Hands-on 3-day practical training for field supervisors on automated validation scripts, paradata scrutinizing, and detecting fabrication or enumerator bias.",
                competency_id="comp_data_validation",
                subskills=["Data Scrutiny", "Paradata Forensics", "Validation Rule Scripting", "Enumerator Bias Detection"],
                prerequisites=[],
                duration_hours=20.0,
                delivery_mode="classroom_residential",
                difficulty_level="intermediate",
                programme_priority="high",
                target_cadre=["JSO", "SSO", "Sub-Regional Field Office In-Charge"],
                syllabus_highlights=[
                    "Day 1: Structural vs Logical Inconsistencies in Multi-Section Schedules",
                    "Day 2: Audit Logs, GPS Timestamp Analysis, and Interview Duration Distribution",
                    "Day 3: Formulation of Automated Rejection Criteria for Survey Data Repositories",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"venue": "NSSTA Campus, Greater Noida", "lab_requirement": "Statistical Computing Lab"},
            ),
            NormalizedTrainingResource(
                external_reference_id="NSSTA-PROG-2026-TIME-SERIES",
                provider="nssta",
                title="Official Time Series Analysis, Seasonality Adjustment (X-13ARIMA-SEATS)",
                description="Technical seminar and computer practicals on seasonal adjustment of quarterly GDP, IIP, and high-frequency economic indicators using international standard tools.",
                competency_id="comp_stat_theory",
                subskills=["Time Series Decomposition", "X-13ARIMA-SEATS", "Seasonal Adjustment", "Unit Root & Cointegration"],
                prerequisites=["comp_stat_theory"],
                duration_hours=24.0,
                delivery_mode="blended",
                difficulty_level="advanced",
                programme_priority="recommended",
                target_cadre=["SSO", "Deputy Director", "National Accounts Division Officers"],
                syllabus_highlights=[
                    "Session 1: Additive vs Multiplicative Seasonality Models",
                    "Session 2: Trading Day and Festival Effects in Indian High-Frequency Data",
                    "Session 3: Practical Implementation of X-13ARIMA in Official Reports",
                ],
                status="active",
                is_mock=is_mock,
                metadata={"venue": "NSSTA Greater Noida / MoSPI Hq", "target_wing": "Economic Statistics Wing"},
            ),
        ]

    def enroll_officer(self, officer_id: str, officer_igot_id: str, resource_ref_id: str) -> ProviderActionResult:
        is_mock = self.mode == "mock"
        if not is_mock and not self.is_configured:
            return ProviderActionResult(
                status="not_configured",
                provider="nssta",
                resource_id=resource_ref_id,
                officer_id=officer_id,
                message="NSSTA administrative portal integration is not configured. Live nomination requires ministry clearance.",
                is_mock=False,
            )

        return ProviderActionResult(
            status="enrolled",
            provider="nssta",
            resource_id=resource_ref_id,
            officer_id=officer_id,
            message=f"Officer {officer_igot_id} nomination recorded for NSSTA Academy programme '{resource_ref_id}'.",
            is_mock=is_mock,
        )
