"""Deterministic Mock iGOT Adapter for SIH Prototype Demonstration.

Demonstrates bidirectional integration (import of training history + export of verified competency)
without requiring live government credentials or external API connections.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.app.integrations.igot.igot_adapter import IGOTAdapter
from backend.app.integrations.igot.models import (
    IGOTCompetencyExport,
    IGOTCourseCompletion,
    IGOTLearningRecord,
    IGOTSyncResult,
    IGOTSyncStatus,
)


class MockIGOTAdapter(IGOTAdapter):
    """Deterministic in-memory mock implementation of the IGOTAdapter contract."""

    def __init__(self) -> None:
        self.exported_verifications: List[IGOTCompetencyExport] = []
        self.exported_statuses: List[Dict[str, str]] = []

    def _get_mock_catalog_records(self, officer_igot_id: str) -> List[IGOTLearningRecord]:
        now = datetime.now(timezone.utc)
        return [
            IGOTLearningRecord(
                source_system="mock_igot",
                external_reference_id=f"MOCK-COURSE-SAMPLING-001-{officer_igot_id}",
                officer_igot_id=officer_igot_id,
                course_id="MOCK-COURSE-SAMPLING-001",
                course_title="National Sample Survey (NSS) Sampling Design & Weight Calibration",
                competency_hint="comp_survey_audit",
                completion_status="completed",
                score=82.0,
                completion_date=now,
                metadata={"provider": "iGOT Karmayogi Mock Sandbox", "module_hours": 12},
            ),
            IGOTLearningRecord(
                source_system="mock_igot",
                external_reference_id=f"MOCK-COURSE-REGRESSION-002-{officer_igot_id}",
                officer_igot_id=officer_igot_id,
                course_id="MOCK-COURSE-REGRESSION-002",
                course_title="Applied Statistical Inference & Multiple Regression Modeling",
                competency_hint="comp_stat_theory",
                completion_status="completed",
                score=78.0,
                completion_date=now,
                metadata={"provider": "iGOT Karmayogi Mock Sandbox", "module_hours": 16},
            ),
            IGOTLearningRecord(
                source_system="mock_igot",
                external_reference_id=f"MOCK-COURSE-NATIONAL-ACCOUNTS-003-{officer_igot_id}",
                officer_igot_id=officer_igot_id,
                course_id="MOCK-COURSE-NATIONAL-ACCOUNTS-003",
                course_title="System of National Accounts (SNA 2008) & Gross Value Added Principles",
                competency_hint="comp_national_accounts",
                completion_status="completed",
                score=88.0,
                completion_date=now,
                metadata={"provider": "iGOT Karmayogi Mock Sandbox", "module_hours": 20},
            ),
        ]

    def fetch_learning_records(self, officer_igot_id: str) -> List[IGOTLearningRecord]:
        """Returns deterministic mock learning records for the officer."""
        return self._get_mock_catalog_records(officer_igot_id)

    def fetch_course_completion(
        self, external_reference_id: str, officer_igot_id: str
    ) -> Optional[IGOTCourseCompletion]:
        """Finds completion record by external ID."""
        records = self._get_mock_catalog_records(officer_igot_id)
        for r in records:
            if r.external_reference_id == external_reference_id:
                return IGOTCourseCompletion(
                    external_reference_id=r.external_reference_id,
                    course_id=r.course_id,
                    officer_igot_id=r.officer_igot_id,
                    completion_date=r.completion_date,
                    score=r.score,
                    verified=True,
                )
        return None

    def publish_competency_verification(
        self, export_payload: IGOTCompetencyExport
    ) -> IGOTSyncResult:
        """Simulates exporting verified competency evidence back to iGOT."""
        self.exported_verifications.append(export_payload)
        return IGOTSyncResult(
            status=IGOTSyncStatus.SYNCED,
            operation="export_competency_verification",
            external_reference=f"MOCK-SYNC-VERIF-{export_payload.competency_id}",
            local_reference=f"{export_payload.officer_igot_id}:{export_payload.competency_id}",
            timestamp=datetime.now(timezone.utc),
            message=(
                f"Successfully published verified competency '{export_payload.competency_name}' "
                f"to Mock-iGOT Karmayogi endpoint (Prototype Simulation)."
            ),
            correlation_id=export_payload.correlation_id,
        )

    def publish_learning_status(
        self, officer_igot_id: str, competency_id: str, status: str
    ) -> IGOTSyncResult:
        """Simulates exporting learning status updates."""
        self.exported_statuses.append({
            "officer_igot_id": officer_igot_id,
            "competency_id": competency_id,
            "status": status,
        })
        return IGOTSyncResult(
            status=IGOTSyncStatus.SYNCED,
            operation="publish_learning_status",
            external_reference=f"MOCK-SYNC-STATUS-{competency_id}",
            local_reference=f"{officer_igot_id}:{competency_id}",
            timestamp=datetime.now(timezone.utc),
            message=f"Published learning status '{status}' to Mock-iGOT.",
        )
