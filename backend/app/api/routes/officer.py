"""Officer profile endpoints: view and update."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, verify_officer_access
from backend.app.models.user import User
from backend.app.schemas.auth import UserResponse
from backend.app.schemas.officer import OfficerProfileUpdate
from backend.app.services.officer_service import OfficerService

router = APIRouter(prefix="/officer", tags=["Officer"])


@router.get(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated officer's complete profile",
)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Returns the official profile of the authenticated officer."""
    service = OfficerService(db)
    return service.get_profile(current_user)


@router.get(
    "/{officer_id}/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get specific officer profile with multi-tenant data isolation and IDOR protection",
)
def get_officer_by_id(
    officer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Enforces tenant isolation: Officers can only access their own profile.
    Supervisors and Admins can access subordinate profiles.
    Attempts to access unauthorized profiles strictly return HTTP 404.
    """
    verify_officer_access(resource_officer_id=officer_id, current_user=current_user, allow_supervisor=True)
    service = OfficerService(db)
    return service.get_profile_by_id(officer_id)


@router.put(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update authenticated officer's profile information",
)
def update_profile(
    data: OfficerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Updates editable fields of the officer profile.
    Critical identity fields (iGOT ID, user ID, credentials) cannot be changed.
    """
    service = OfficerService(db)
    return service.update_profile(current_user, data)

