"""API routes for Competency Verification, Knowledge Decay, and Refresher Triggers."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.retention import KnowledgeRetention, RefreshRecommendation
from backend.app.models.user import User
from backend.app.models.verification import (
    CompetencyVerification,
    PracticalVerification,
)
from backend.app.schemas.verification import (
    CompetencyAuditEventResponse,
    CompetencyVerificationResponse,
    KnowledgeRetentionResponse,
    PracticalVerificationCreate,
    PracticalVerificationResponse,
    ReassessmentProcessRequest,
    ReassessmentResultResponse,
    RefreshRecommendationCreate,
    RefreshRecommendationResponse,
    RetentionEvaluateRequest,
    VerificationEvaluationRequest,
)
from backend.app.services.decay_service import KnowledgeDecayService
from backend.app.services.refresh_service import RefreshService
from backend.app.services.verification_service import VerificationService

router = APIRouter(tags=["Competency Verification & Retention"])


# ----------------------------------------------------
# Verification Endpoints
# ----------------------------------------------------
@router.post(
    "/verifications/practical",
    response_model=PracticalVerificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a practical verification evaluation (e.g., dataset audit or field survey)",
)
def record_practical(
    payload: PracticalVerificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    record = VerificationService.record_practical_verification(
        db=db,
        officer_id=profile.id,
        competency_id=payload.competency_id,
        practical_type=payload.practical_type,
        practical_score=payload.practical_score,
        evaluator_notes=payload.evaluator_notes,
        evidence_data=payload.evidence_data,
    )
    return record


@router.post(
    "/verifications/evaluate",
    response_model=CompetencyVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate independent and practical verification criteria",
)
def evaluate_verification(
    payload: VerificationEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    try:
        verification = VerificationService.evaluate_verification(
            db=db,
            officer_id=profile.id,
            competency_id=payload.competency_id,
            assessment_session_id=payload.assessment_session_id,
            override_independent_score=payload.override_independent_score,
            verification_notes=payload.verification_notes,
        )
        return verification
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/verifications/status",
    response_model=List[CompetencyVerificationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get current competency verification status for the authenticated officer",
)
def get_verification_status(
    competency_id: Optional[str] = Query(None),
    include_history: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    records_q = db.query(CompetencyVerification).filter(
        CompetencyVerification.officer_id == profile.id
    )
    if competency_id:
        records_q = records_q.filter(CompetencyVerification.competency_id == competency_id)
    if not include_history:
        records_q = records_q.filter(CompetencyVerification.is_current == True)

    records = records_q.order_by(CompetencyVerification.created_at.desc()).all()

    # Apply expiry check dynamically
    for r in records:
        if r.is_current and r.verification_status == "verified":
            VerificationService.check_and_update_expiry(
                db=db, officer_id=profile.id, competency_id=r.competency_id
            )

    return records_q.order_by(CompetencyVerification.created_at.desc()).all()


# ----------------------------------------------------
# Retention Endpoints
# ----------------------------------------------------
@router.get(
    "/retention/status",
    response_model=List[KnowledgeRetentionResponse],
    status_code=status.HTTP_200_OK,
    summary="Get knowledge retention decay statuses for the authenticated officer",
)
def get_retention_status(
    competency_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    query = db.query(KnowledgeRetention).filter(
        KnowledgeRetention.officer_id == profile.id
    )
    if competency_id:
        query = query.filter(KnowledgeRetention.competency_id == competency_id)

    records = query.order_by(KnowledgeRetention.updated_at.desc()).all()
    return records


@router.post(
    "/retention/evaluate",
    response_model=KnowledgeRetentionResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate knowledge retention for a competency (supports simulation of days elapsed)",
)
def evaluate_retention(
    payload: RetentionEvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    retention = KnowledgeDecayService.evaluate_officer_retention(
        db=db,
        officer_id=profile.id,
        competency_id=payload.competency_id,
        days_elapsed=payload.days_elapsed,
        stability_days=payload.stability_days,
    )
    return retention


# ----------------------------------------------------
# Refresher & Re-Assessment Endpoints
# ----------------------------------------------------
@router.get(
    "/refresh/recommendations",
    response_model=List[RefreshRecommendationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get refresher recommendations for the authenticated officer",
)
def list_refresh_recommendations(
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    query = db.query(RefreshRecommendation).filter(
        RefreshRecommendation.officer_id == profile.id
    )
    if status_filter:
        query = query.filter(RefreshRecommendation.status == status_filter)

    return query.order_by(RefreshRecommendation.created_at.desc()).all()


@router.post(
    "/refresh/trigger",
    response_model=RefreshRecommendationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger a refresher recommendation for an at-risk competency",
)
def trigger_refresh(
    payload: RefreshRecommendationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    rec = RefreshService.trigger_refresh_recommendation(
        db=db,
        officer_id=profile.id,
        competency_id=payload.competency_id,
        trigger_reason=payload.trigger_reason,
        priority=payload.priority,
    )
    return rec


@router.post(
    "/refresh/{recommendation_id}/complete",
    response_model=RefreshRecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark a refresher module as completed (requires subsequent re-assessment for verification)",
)
def complete_refresh(
    recommendation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    try:
        rec = RefreshService.complete_refresh_module(
            db=db,
            officer_id=profile.id,
            recommendation_id=recommendation_id,
        )
        return rec
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/refresh/reassessment",
    response_model=ReassessmentResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Process re-assessment outcome and evaluate verification criteria",
)
def process_reassessment(
    payload: ReassessmentProcessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    result = RefreshService.process_reassessment_result(
        db=db,
        officer_id=profile.id,
        competency_id=payload.competency_id,
        assessment_session_id=payload.assessment_session_id,
        override_independent_score=payload.override_independent_score,
    )
    return result


# ----------------------------------------------------
# Audit History
# ----------------------------------------------------
@router.get(
    "/audit/events",
    response_model=List[CompetencyAuditEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve immutable competency and verification audit event history",
)
def get_audit_events(
    competency_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    query = db.query(CompetencyAuditEvent).filter(
        CompetencyAuditEvent.officer_id == profile.id
    )
    if competency_id:
        query = query.filter(CompetencyAuditEvent.competency_id == competency_id)

    return query.order_by(CompetencyAuditEvent.timestamp.desc()).limit(limit).all()
