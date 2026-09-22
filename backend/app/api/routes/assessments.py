"""Protected Adaptive Assessment Endpoints: Session management, item delivery, and response scoring."""
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.assessment_item import AssessmentItem
from backend.app.models.assessment_session import AssessmentSession
from backend.app.services.assessment_service import AdaptiveAssessmentService
from backend.app.services.irt_engine import map_difficulty_to_label
from backend.app.schemas.assessment import (
    StartAssessmentRequest,
    AssessmentItemPayload,
    SubmitResponseRequest,
    ResponseOutcomeResponse,
    AssessmentResultResponse,
)

router = APIRouter(prefix="/assessments", tags=["Adaptive Assessment Engine"])


def _serialize_item_payload(item: AssessmentItem) -> AssessmentItemPayload:
    """Safely serializes item for delivery, strictly omitting correct_answer and private metadata."""
    options_list = json.loads(item.options) if isinstance(item.options, str) else list(item.options)
    diff_label = map_difficulty_to_label(item.difficulty_b)

    return AssessmentItemPayload(
        id=item.id,
        competencyId=item.competency_id,
        questionType=item.question_type,
        stem=item.stem,
        options=options_list,
        difficultyLabel=diff_label,
        cognitiveLevel=item.cognitive_level,
    )


@router.post(
    "/start",
    status_code=status.HTTP_201_CREATED,
    summary="Start a new adaptive assessment session for target competency",
)
def start_assessment_session(
    request: StartAssessmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found for authenticated user",
        )

    service = AdaptiveAssessmentService(db)
    session, first_item = service.start_session(
        officer_profile_id=profile.id,
        target_competency_id=request.target_competency_id,
    )

    return {
        "sessionId": session.id,
        "targetCompetencyId": session.target_competency_id,
        "initialTheta": session.initial_theta,
        "status": session.status,
        "firstItem": _serialize_item_payload(first_item),
    }


@router.get(
    "/{session_id}",
    status_code=status.HTTP_200_OK,
    summary="Get current adaptive assessment session status",
)
def get_session_status(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    session = db.query(AssessmentSession).filter(AssessmentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.officer_profile_id != profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to session forbidden")

    current_item_payload = None
    if session.status == "active" and session.current_assigned_item:
        current_item_payload = _serialize_item_payload(session.current_assigned_item)

    return {
        "sessionId": session.id,
        "targetCompetencyId": session.target_competency_id,
        "status": session.status,
        "currentTheta": session.current_theta,
        "standardError": session.standard_error,
        "itemsAnswered": session.items_answered,
        "currentAssignedItem": current_item_payload,
    }


@router.post(
    "/{session_id}/responses",
    response_model=ResponseOutcomeResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit response for current item in adaptive assessment session",
)
def submit_item_response(
    session_id: str,
    payload: SubmitResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResponseOutcomeResponse:
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    service = AdaptiveAssessmentService(db)
    response_record, next_item, result_payload = service.submit_response(
        session_id=session_id,
        officer_profile_id=profile.id,
        item_id=payload.itemId,
        selected_answer=payload.selectedAnswer,
        confidence=payload.confidence,
        response_time_ms=payload.responseTimeMs,
    )

    next_payload = _serialize_item_payload(next_item) if next_item else None
    result_resp = AssessmentResultResponse(**result_payload.to_dict()) if result_payload else None

    # After response submission, reveal explanation and correct answer for learning feedback
    answered_item = response_record.item

    return ResponseOutcomeResponse(
        isCorrect=response_record.is_correct,
        correctAnswer=answered_item.correct_answer,
        explanation=answered_item.explanation,
        thetaAfter=response_record.theta_after,
        standardError=response_record.session.standard_error,
        itemsAnswered=response_record.session.items_answered,
        nextItem=next_payload,
        isCompleted=bool(result_payload is not None),
        result=result_resp,
    )


@router.post(
    "/{session_id}/abandon",
    status_code=status.HTTP_200_OK,
    summary="Abandon an active assessment session",
)
def abandon_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    session = db.query(AssessmentSession).filter(AssessmentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.officer_profile_id != profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

    session.status = "abandoned"
    session.stopping_reason = "officer_abandoned"
    session.current_assigned_item_id = None
    db.commit()

    return {"message": "Session marked as abandoned", "sessionId": session_id}


@router.get(
    "/{session_id}/result",
    response_model=AssessmentResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Get result summary for completed assessment session",
)
def get_assessment_result(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssessmentResultResponse:
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    service = AdaptiveAssessmentService(db)
    result_payload = service.get_session_result(session_id, profile.id)

    return AssessmentResultResponse(**result_payload.to_dict())
