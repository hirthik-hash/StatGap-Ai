"""iGOT Integration Service.

Bridges external iGOT learning ecosystems with STAT-GAP AI internal evidence representations.

ARCHITECTURAL RULE:
The STAT-GAP AI intelligence core does NOT depend directly on iGOT.
This service translates external records into normalized internal CompetencyEvidence records,
preserving source_system and external_reference_id for provenance and idempotency.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from backend.app.integrations.igot.factory import get_igot_adapter
from backend.app.integrations.igot.igot_adapter import IGOTAdapter
from backend.app.integrations.igot.models import (
    IGOTCompetencyExport,
    IGOTSyncResult,
    IGOTSyncStatus,
)
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.verification import CompetencyVerification


class IGOTIntegrationService:
    """Service orchestrating iGOT learning record import, verification export, and auditing."""

    def __init__(self, adapter: Optional[IGOTAdapter] = None) -> None:
        self.adapter = adapter or get_igot_adapter()

    def _resolve_competency_id(self, db: Session, course_id: str, competency_hint: Optional[str]) -> Optional[str]:
        """Deterministically maps an external iGOT course identifier to a STAT-GAP competency ID."""
        # Check direct hint first
        if competency_hint:
            comp = db.query(Competency).filter(Competency.id == competency_hint).first()
            if comp:
                return comp.id

        # Deterministic fallback mapping table
        mapping = {
            "MOCK-COURSE-SAMPLING-001": "comp_survey_audit",
            "MOCK-COURSE-REGRESSION-002": "comp_stat_theory",
            "MOCK-COURSE-NATIONAL-ACCOUNTS-003": "comp_national_accounts",
            "MOCK-COURSE-INDEX-PRICE-004": "comp_price_indices",
        }
        target_id = mapping.get(course_id)
        if target_id:
            comp = db.query(Competency).filter(Competency.id == target_id).first()
            if comp:
                return comp.id

        # If designated competency doesn't exist, map to the first available competency
        first_comp = db.query(Competency).first()
        return first_comp.id if first_comp else None

    def import_learning_records(
        self,
        db: Session,
        officer_profile_id: int,
        officer_igot_id: str,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, object]:
        """Imports completed learning records from iGOT into normalized CompetencyEvidence.
        
        IDEMPOTENCY GUARANTEE:
        Records matching (officer_profile_id, source_system, external_reference_id)
        are skipped, ensuring repeated executions never create duplicate evidence.
        """
        now = datetime.now(timezone.utc)
        external_records = self.adapter.fetch_learning_records(officer_igot_id)

        imported_count = 0
        skipped_count = 0
        imported_evidences: List[int] = []

        for record in external_records:
            # 1. Idempotency check
            existing = (
                db.query(CompetencyEvidence)
                .filter(
                    CompetencyEvidence.officer_profile_id == officer_profile_id,
                    CompetencyEvidence.source_system == record.source_system,
                    CompetencyEvidence.external_reference_id == record.external_reference_id,
                )
                .first()
            )
            if existing:
                skipped_count += 1
                continue

            # 2. Resolve competency ID
            comp_id = self._resolve_competency_id(db, record.course_id, record.competency_hint)
            if not comp_id:
                skipped_count += 1
                continue

            # 3. Insert normalized internal evidence
            evidence = CompetencyEvidence(
                officer_profile_id=officer_profile_id,
                competency_id=comp_id,
                assessment_score=record.score,
                quiz_accuracy=round(record.score * 0.95, 2),
                practical_performance=round(record.score * 0.85, 2),
                assessment_ratio="4/5",
                repeated_errors=0,
                confidence_pattern="High",
                source_system=record.source_system,
                external_reference_id=record.external_reference_id,
            )
            db.add(evidence)
            db.flush()
            imported_count += 1
            imported_evidences.append(evidence.id)

        # 4. Record audit event (scrubbed, no secrets or credentials)
        audit_event = CompetencyAuditEvent(
            officer_id=officer_profile_id,
            competency_id=None,
            event_type="igot_learning_imported",
            actor="system",
            event_data={
                "officer_igot_id": officer_igot_id,
                "total_fetched": len(external_records),
                "imported_count": imported_count,
                "skipped_count": skipped_count,
                "correlation_id": correlation_id,
            },
            timestamp=now,
        )
        db.add(audit_event)
        db.commit()

        return {
            "status": "success",
            "officer_igot_id": officer_igot_id,
            "total_fetched": len(external_records),
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "correlation_id": correlation_id,
        }

    def export_competency_verification(
        self,
        db: Session,
        officer_profile_id: int,
        officer_igot_id: str,
        competency_id: str,
        correlation_id: Optional[str] = None,
    ) -> IGOTSyncResult:
        """Publishes verified competency certification event to iGOT via the adapter."""
        now = datetime.now(timezone.utc)

        # 1. Fetch current verification record
        verification = (
            db.query(CompetencyVerification)
            .filter(
                CompetencyVerification.officer_id == officer_profile_id,
                CompetencyVerification.competency_id == competency_id,
                CompetencyVerification.is_current == True,
            )
            .first()
        )

        competency = db.query(Competency).filter(Competency.id == competency_id).first()
        comp_name = competency.name if competency else competency_id

        if not verification:
            sync_result = IGOTSyncResult(
                status=IGOTSyncStatus.FAILED,
                operation="export_competency_verification",
                external_reference=None,
                local_reference=f"{officer_igot_id}:{competency_id}",
                timestamp=now,
                error_code="NO_VERIFICATION_RECORD",
                message=f"No verification record exists for competency {competency_id}.",
                correlation_id=correlation_id,
            )
        elif verification.verification_status != "verified":
            sync_result = IGOTSyncResult(
                status=IGOTSyncStatus.FAILED,
                operation="export_competency_verification",
                external_reference=None,
                local_reference=f"{officer_igot_id}:{competency_id}",
                timestamp=now,
                error_code="NOT_VERIFIED",
                message=f"Competency {competency_id} is not verified (status: {verification.verification_status}). Only verified competencies can be exported.",
                correlation_id=correlation_id,
            )
        else:
            payload = IGOTCompetencyExport(
                officer_igot_id=officer_igot_id,
                competency_id=competency_id,
                competency_name=comp_name,
                verification_status=verification.verification_status,
                composite_score=verification.composite_score or 0.0,
                verified_at=verification.verified_at,
                valid_until=verification.valid_until,
                correlation_id=correlation_id,
            )
            sync_result = self.adapter.publish_competency_verification(payload)

        # 2. Audit the synchronization event
        audit_event = CompetencyAuditEvent(
            officer_id=officer_profile_id,
            competency_id=competency_id,
            event_type="igot_competency_exported",
            actor="system",
            event_data={
                "sync_status": sync_result.status.value,
                "operation": sync_result.operation,
                "external_reference": sync_result.external_reference,
                "message": sync_result.message,
                "correlation_id": correlation_id,
            },
            timestamp=now,
        )
        db.add(audit_event)
        db.commit()

        return sync_result
