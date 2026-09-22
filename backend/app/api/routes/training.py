"""API routes for Training Resources & Intervention Optimizer — Phase 7."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.integrations.training.factory import get_training_adapter
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.training_resource import TrainingResource
from backend.app.models.user import User
from backend.app.schemas.training import (
    EnrollmentRequest,
    EnrollmentResponse,
    PersonalizedRecommendationsResponse,
    ProviderStatusSchema,
    TrainingConstraintInput,
    TrainingResourceResponse,
    TrainingSyncResponse,
)
from backend.app.services.training_optimizer_service import TrainingOptimizerService
from backend.app.services.training_sync_service import TrainingSyncService

router = APIRouter(prefix="/training", tags=["Training Interventions & Provider Optimization"])


@router.get("/providers/status", response_model=List[ProviderStatusSchema], summary="Get all training provider statuses")
def get_provider_statuses(db: Session = Depends(get_db)):
    """Returns integration status of iGOT, NSSTA, and TPAC adapters without leaking secrets."""
    service = TrainingOptimizerService(db)
    return service.get_provider_statuses()


@router.post("/sync", response_model=TrainingSyncResponse, summary="Synchronize training catalogues from providers")
def sync_training_catalogues(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Idempotently synchronizes training resources from iGOT, NSSTA, and TPAC adapters."""
    correlation_id = getattr(request.state, "request_id", None)
    service = TrainingSyncService(db)
    result = service.sync_all_catalogues(
        actor=current_user.email or current_user.igot_id or "authenticated_user",
        correlation_id=correlation_id,
    )
    return TrainingSyncResponse(
        status=result["status"],
        total_synced=result["total_synced"],
        created_count=result["created_count"],
        updated_count=result["updated_count"],
        providers=result["providers"],
        timestamp=result["timestamp"],
        correlation_id=correlation_id,
    )


@router.get("/resources", response_model=List[TrainingResourceResponse], summary="List normalized training resources")
def list_training_resources(
    provider: Optional[str] = Query(None, description="Filter by provider: igot, nssta, tpac"),
    competency_id: Optional[str] = Query(None, description="Filter by competency ID"),
    delivery_mode: Optional[str] = Query(None, description="Filter by delivery mode"),
    difficulty_level: Optional[str] = Query(None, description="Filter by difficulty level"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Returns normalized training resources across all national providers."""
    # Ensure seed
    count = db.query(TrainingResource).count()
    if count == 0:
        sync_service = TrainingSyncService(db)
        sync_service.sync_all_catalogues(actor="auto_seed")

    query = db.query(TrainingResource).filter(TrainingResource.status == "active")
    if provider:
        query = query.filter(TrainingResource.provider == provider.lower())
    if competency_id:
        query = query.filter(TrainingResource.competency_id == competency_id)
    if delivery_mode:
        query = query.filter(TrainingResource.delivery_mode == delivery_mode)
    if difficulty_level:
        query = query.filter(TrainingResource.difficulty_level == difficulty_level)

    resources = query.order_by(TrainingResource.provider, TrainingResource.title).limit(limit).all()
    return [TrainingResourceResponse.model_validate(r) for r in resources]


@router.get("/resources/{resource_id}", response_model=TrainingResourceResponse, summary="Get single training resource")
def get_training_resource(
    resource_id: str,
    db: Session = Depends(get_db),
):
    """Fetches full details of a specific normalized training resource."""
    res = db.query(TrainingResource).filter(TrainingResource.id == resource_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training resource with ID '{resource_id}' not found.",
        )
    return TrainingResourceResponse.model_validate(res)


@router.get("/recommendations/me", response_model=PersonalizedRecommendationsResponse, summary="Get personalized training recommendations")
def get_my_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns deterministic training recommendations matched to the current officer's verified gaps and task bottlenecks."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found for authenticated user.",
        )

    service = TrainingOptimizerService(db)
    return service.optimize_recommendations(profile)


@router.post("/recommendations/me/optimize", response_model=PersonalizedRecommendationsResponse, summary="Optimize recommendations with custom constraints")
def optimize_my_recommendations(
    constraints: TrainingConstraintInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Optimizes training recommendations using custom constraints (e.g. max duration, target task, delivery modes)."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found for authenticated user.",
        )

    service = TrainingOptimizerService(db)
    return service.optimize_recommendations(profile, constraints)


@router.get("/recommendations/officer/{officer_id}", response_model=PersonalizedRecommendationsResponse, summary="Supervisor/Admin view of officer recommendations")
def get_officer_recommendations(
    officer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Supervisor/Admin view for an officer's training recommendations (with RBAC enforcement)."""
    # Enforce Officer Isolation: Officer can only view their own profile
    user_role = (current_user.role or "officer").lower()
    if user_role == "officer":
        if not current_user.profile or str(current_user.profile.id) != str(officer_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Officers can only access their own personalized recommendations.",
            )

    profile_query = db.query(OfficerProfile)
    if officer_id.isdigit():
        profile = profile_query.filter(OfficerProfile.id == int(officer_id)).first()
    else:
        profile = profile_query.filter(OfficerProfile.id == officer_id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Officer profile with ID '{officer_id}' not found.",
        )

    service = TrainingOptimizerService(db)
    return service.optimize_recommendations(profile)


@router.post("/enroll", response_model=EnrollmentResponse, summary="Enroll officer in training programme")
def enroll_training_programme(
    payload: EnrollmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Attempts enrollment in the specified training resource via provider adapter."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found.",
        )

    res = db.query(TrainingResource).filter(TrainingResource.id == payload.resource_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training resource with ID '{payload.resource_id}' not found.",
        )

    try:
        adapter = get_training_adapter(res.provider)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    action_result = adapter.enroll_officer(
        officer_id=profile.id,
        officer_igot_id=current_user.igot_id,
        resource_ref_id=res.external_reference_id,
    )

    if action_result.status == "not_configured":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=action_result.message,
        )

    return EnrollmentResponse(
        status=action_result.status,
        resource_id=res.id,
        provider=res.provider,
        message=action_result.message,
        is_mock=action_result.is_mock,
        timestamp=action_result.timestamp,
    )
