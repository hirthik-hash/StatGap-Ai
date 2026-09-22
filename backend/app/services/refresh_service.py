"""Refresher Recommendation and Re-Assessment Lifecycle Service.

Lifecycle:
    Decay / Expiry / Gap Trigger
        ↓
    Refresher Recommended (Deduplicated)
        ↓
    Refresher Completed
        ↓
    Re-Assessment Session (assessment_purpose='refresh_reassessment')
        ↓
    Evidence Update & Re-Diagnosis
        ↓
    Verification Criteria Evaluation
        ↓
    New Verification ONLY IF Criteria Satisfied
    (If criteria not met: status=failed, gap remains, NO new verification)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.models.assessment_session import AssessmentSession
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.competency import Competency
from backend.app.models.knowledge_graph import CompetencyNode
from backend.app.models.retention import RefreshRecommendation
from backend.app.services.verification_service import VerificationService


class RefreshService:
    @classmethod
    def trigger_refresh_recommendation(
        cls,
        db: Session,
        officer_id: int,
        competency_id: str,
        trigger_reason: str = "retention_decay",
        priority: str = "medium",
    ) -> RefreshRecommendation:
        """Creates or updates a deduplicated refresher recommendation for an officer."""
        now = datetime.now(timezone.utc)

        # Check for existing active recommendation
        existing = (
            db.query(RefreshRecommendation)
            .filter(
                RefreshRecommendation.officer_id == officer_id,
                RefreshRecommendation.competency_id == competency_id,
                RefreshRecommendation.status.in_(["pending", "in_progress"]),
            )
            .first()
        )

        if existing:
            priority_order = {"low": 0, "medium": 1, "high": 2, "urgent": 3}
            if priority_order.get(priority, 1) > priority_order.get(existing.priority, 1):
                existing.priority = priority
            existing.updated_at = now
            db.commit()
            db.refresh(existing)
            return existing

        # Fetch knowledge nodes to assemble targeted curriculum
        nodes = (
            db.query(CompetencyNode)
            .filter(CompetencyNode.competency_id == competency_id)
            .all()
        )

        recommended_modules = []
        for node in nodes[:4]:
            recommended_modules.append({
                "concept_id": node.id,
                "concept_name": node.name,
                "estimated_minutes": 15,
                "focus_area": "Remediation & Refresher Practice",
            })

        if not recommended_modules:
            recommended_modules.append({
                "concept_id": "core_refresher",
                "concept_name": "Core Concepts Review",
                "estimated_minutes": 20,
                "focus_area": "General Core Review",
            })

        rec = RefreshRecommendation(
            officer_id=officer_id,
            competency_id=competency_id,
            trigger_reason=trigger_reason,
            priority=priority,
            status="pending",
            recommended_modules=recommended_modules,
            triggered_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(rec)

        audit_event = CompetencyAuditEvent(
            officer_id=officer_id,
            competency_id=competency_id,
            event_type="refresh_recommended",
            actor="system",
            event_data={
                "trigger_reason": trigger_reason,
                "priority": priority,
                "module_count": len(recommended_modules),
            },
            timestamp=now,
        )
        db.add(audit_event)

        db.commit()
        db.refresh(rec)
        return rec

    @classmethod
    def complete_refresh_module(
        cls,
        db: Session,
        officer_id: int,
        recommendation_id: str,
    ) -> RefreshRecommendation:
        """Marks refresher module as completed.
        
        CRITICAL: Completing a refresh does NOT equal verification!
        """
        now = datetime.now(timezone.utc)
        rec = (
            db.query(RefreshRecommendation)
            .filter(
                RefreshRecommendation.id == recommendation_id,
                RefreshRecommendation.officer_id == officer_id,
            )
            .first()
        )
        if not rec:
            raise ValueError(f"Refresh recommendation {recommendation_id} not found")

        rec.status = "completed"
        rec.completed_at = now
        rec.updated_at = now

        audit_event = CompetencyAuditEvent(
            officer_id=officer_id,
            competency_id=rec.competency_id,
            event_type="refresh_completed",
            actor="officer",
            event_data={
                "recommendation_id": str(rec.id),
                "completed_at": now.isoformat(),
            },
            timestamp=now,
        )
        db.add(audit_event)
        db.commit()
        db.refresh(rec)
        return rec

    @classmethod
    def process_reassessment_result(
        cls,
        db: Session,
        officer_id: int,
        competency_id: str,
        assessment_session_id: Optional[str] = None,
        override_independent_score: Optional[float] = None,
    ) -> dict:
        """Processes the outcome of a refresher re-assessment.
        
        Evaluates criteria deterministically via VerificationService:
        - If criteria satisfied: issues new verification record.
        - If criteria NOT satisfied: verification is NOT granted, status is failed,
          existing gap remains.
        """
        now = datetime.now(timezone.utc)

        verification_record = VerificationService.evaluate_verification(
            db=db,
            officer_id=officer_id,
            competency_id=competency_id,
            assessment_session_id=assessment_session_id,
            override_independent_score=override_independent_score,
            verification_notes="Evaluated following refresher re-assessment",
        )

        audit_event = CompetencyAuditEvent(
            officer_id=officer_id,
            competency_id=competency_id,
            event_type="reassessment_completed",
            actor="system",
            event_data={
                "verification_status": verification_record.verification_status,
                "composite_score": verification_record.composite_score,
                "criteria_details": verification_record.criteria_details,
            },
            timestamp=now,
        )
        db.add(audit_event)
        db.commit()

        return {
            "reassessment_passed": verification_record.verification_status == "verified",
            "verification": verification_record,
            "status": verification_record.verification_status,
            "composite_score": verification_record.composite_score,
            "criteria_details": verification_record.criteria_details,
        }
