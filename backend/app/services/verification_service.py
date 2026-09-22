"""Independent Competency Verification Service.

Manages the verification lifecycle:
    Unverified / In-Progress -> Verification Assessment + Practical -> Verification Evaluation -> Verified / Failed -> Expired

Rules:
    - Passing a re-assessment or refresher does NOT automatically equal verification.
    - Verification requires meeting ALL criteria:
        1. Independent assessment score >= 70.0%
        2. Practical verification score >= 60.0% (if competency requires practical verification)
        3. Composite score >= 75.0%
    - Verification validity window (90 days) is independent of knowledge retention decay.
    - Verification expiry marks the administrative status as "expired", but does NOT zero out retention.
    - All transitions produce immutable CompetencyAuditEvent records.
    - Prior verifications are preserved historically (is_current=False for previous rows).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.assessment_session import AssessmentResponse, AssessmentSession
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.competency import Competency
from backend.app.models.verification import (
    CompetencyVerification,
    PracticalVerification,
)
from backend.app.services.decay_service import KnowledgeDecayService


class VerificationService:
    @classmethod
    def record_practical_verification(
        cls,
        db: Session,
        officer_id: int,
        competency_id: str,
        practical_type: str,
        practical_score: float,
        evaluator_notes: Optional[str] = None,
        evidence_data: Optional[dict] = None,
    ) -> PracticalVerification:
        """Records a practical exercise / audit evaluation for an officer."""
        passed = practical_score >= settings.VERIFICATION_MIN_PRACTICAL_SCORE  # 60.0
        now = datetime.now(timezone.utc)

        record = PracticalVerification(
            officer_id=officer_id,
            competency_id=competency_id,
            practical_type=practical_type,
            practical_score=practical_score,
            passed=passed,
            evaluator_notes=evaluator_notes,
            evidence_data=evidence_data or {},
            verified_at=now,
        )
        db.add(record)

        audit_event = CompetencyAuditEvent(
            officer_id=officer_id,
            competency_id=competency_id,
            event_type="practical_verification_recorded",
            actor="evaluator",
            event_data={
                "practical_type": practical_type,
                "practical_score": practical_score,
                "passed": passed,
            },
            timestamp=now,
        )
        db.add(audit_event)
        db.commit()
        db.refresh(record)
        return record

    @classmethod
    def evaluate_verification(
        cls,
        db: Session,
        officer_id: int,
        competency_id: str,
        assessment_session_id: Optional[str] = None,
        override_independent_score: Optional[float] = None,
        verification_notes: Optional[str] = None,
    ) -> CompetencyVerification:
        """Evaluates independent and practical criteria to grant or deny verification.
        
        Preserves strict lifecycle:
            assessment/evidence -> evaluation against explicit criteria -> verification status update
        """
        now = datetime.now(timezone.utc)

        # 1. Fetch competency requirements
        competency = db.query(Competency).filter(Competency.id == competency_id).first()
        if not competency:
            raise ValueError(f"Competency {competency_id} not found")

        # 2. Determine independent score
        independent_score: float = 0.0

        if override_independent_score is not None:
            independent_score = float(override_independent_score)
        elif assessment_session_id:
            sess_str_id = str(assessment_session_id)
            session = (
                db.query(AssessmentSession)
                .filter(AssessmentSession.id == sess_str_id)
                .first()
            )
            if session:
                responses = (
                    db.query(AssessmentResponse)
                    .filter(AssessmentResponse.session_id == sess_str_id)
                    .all()
                )
                if responses:
                    correct_count = sum(1 for r in responses if r.is_correct)
                    independent_score = (correct_count / len(responses)) * 100.0

        # 3. Check practical verification if required
        practical_score: Optional[float] = None
        practical_passed = True

        if competency.requires_practical_verification:
            latest_practical = (
                db.query(PracticalVerification)
                .filter(
                    PracticalVerification.officer_id == officer_id,
                    PracticalVerification.competency_id == competency_id,
                )
                .order_by(PracticalVerification.verified_at.desc())
                .first()
            )
            if latest_practical:
                practical_score = latest_practical.practical_score
                practical_passed = practical_score >= settings.VERIFICATION_MIN_PRACTICAL_SCORE
            else:
                practical_passed = False
                practical_score = 0.0

        # 4. Compute composite score
        if competency.requires_practical_verification and practical_score is not None:
            composite_score = 0.70 * independent_score + 0.30 * practical_score
        else:
            composite_score = independent_score

        # 5. Evaluate criteria
        independent_passed = independent_score >= settings.VERIFICATION_MIN_INDEPENDENT_SCORE  # 70.0
        composite_passed = composite_score >= settings.VERIFICATION_PASS_SCORE  # 75.0

        is_verified = independent_passed and practical_passed and composite_passed
        new_status = "verified" if is_verified else "failed"

        valid_until = (
            now + timedelta(days=settings.VERIFICATION_VALIDITY_DAYS)
            if is_verified
            else None
        )

        criteria_details = {
            "requires_practical": competency.requires_practical_verification,
            "independent_score": round(independent_score, 2),
            "independent_threshold": settings.VERIFICATION_MIN_INDEPENDENT_SCORE,
            "independent_passed": independent_passed,
            "practical_score": round(practical_score, 2) if practical_score is not None else None,
            "practical_threshold": settings.VERIFICATION_MIN_PRACTICAL_SCORE if competency.requires_practical_verification else None,
            "practical_passed": practical_passed,
            "composite_score": round(composite_score, 2),
            "composite_threshold": settings.VERIFICATION_PASS_SCORE,
            "composite_passed": composite_passed,
        }

        # 6. Archive prior current verifications for this officer + competency
        db.query(CompetencyVerification).filter(
            CompetencyVerification.officer_id == officer_id,
            CompetencyVerification.competency_id == competency_id,
            CompetencyVerification.is_current == True,
        ).update({"is_current": False})

        # 7. Create new verification record
        verification = CompetencyVerification(
            officer_id=officer_id,
            competency_id=competency_id,
            verification_status=new_status,
            independent_score=round(independent_score, 2),
            practical_score=round(practical_score, 2) if practical_score is not None else None,
            composite_score=round(composite_score, 2),
            assessment_session_id=assessment_session_id,
            verified_at=now if is_verified else None,
            valid_until=valid_until,
            criteria_details=criteria_details,
            verification_notes=verification_notes,
            is_current=True,
            created_at=now,
            updated_at=now,
        )
        db.add(verification)

        # 8. If verified, update retention stability deterministically
        if is_verified:
            stability_days = KnowledgeDecayService.calculate_stability_days(
                independent_score=independent_score,
                practical_score=practical_score,
                requires_practical=competency.requires_practical_verification,
            )
            KnowledgeDecayService.evaluate_officer_retention(
                db=db,
                officer_id=officer_id,
                competency_id=competency_id,
                days_elapsed=0,
                stability_days=stability_days,
            )

        # 9. Audit event
        audit_event = CompetencyAuditEvent(
            officer_id=officer_id,
            competency_id=competency_id,
            event_type="verification_passed" if is_verified else "verification_failed",
            actor="system",
            event_data={
                "status": new_status,
                "composite_score": composite_score,
                "criteria": criteria_details,
            },
            timestamp=now,
        )
        db.add(audit_event)

        db.commit()
        db.refresh(verification)
        return verification

    @classmethod
    def check_and_update_expiry(
        cls,
        db: Session,
        officer_id: int,
        competency_id: str,
        as_of_date: Optional[datetime] = None,
    ) -> Optional[CompetencyVerification]:
        """Checks if current verification has expired.
        
        CRITICAL RULE:
        Verification expiry marks status as 'expired', but does NOT set retention to zero.
        Retention continues to decay smoothly based on the decay model.
        """
        now = as_of_date or datetime.now(timezone.utc)

        verification = (
            db.query(CompetencyVerification)
            .filter(
                CompetencyVerification.officer_id == officer_id,
                CompetencyVerification.competency_id == competency_id,
                CompetencyVerification.is_current == True,
            )
            .first()
        )

        if (
            verification
            and verification.verification_status == "verified"
            and verification.valid_until
        ):
            v_until = verification.valid_until
            cmp_now = now
            if v_until.tzinfo is None and cmp_now.tzinfo is not None:
                cmp_now = cmp_now.replace(tzinfo=None)
            elif v_until.tzinfo is not None and cmp_now.tzinfo is None:
                v_until = v_until.replace(tzinfo=None)

            if v_until < cmp_now:
                verification.verification_status = "expired"
                verification.updated_at = now

                audit_event = CompetencyAuditEvent(
                    officer_id=officer_id,
                    competency_id=competency_id,
                    event_type="verification_expired",
                    actor="system",
                    event_data={
                        "expired_at": now.isoformat(),
                        "valid_until": verification.valid_until.isoformat(),
                    },
                    timestamp=now,
                )
                db.add(audit_event)
                db.commit()
                db.refresh(verification)

        return verification
