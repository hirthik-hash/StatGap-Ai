"""Officer profile service for profile retrieval and safe modifications."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.repositories.user_repository import UserRepository
from backend.app.schemas.auth import UserResponse
from backend.app.schemas.officer import OfficerProfileUpdate
from backend.app.services.auth_service import AuthService
from backend.app.services.audit_service import AuditService, SecurityEventType


class OfficerService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_service = AuditService(db)

    def get_profile(self, user: User) -> UserResponse:
        """Retrieve current officer profile."""
        return AuthService.to_user_response(user)

    def get_profile_by_id(self, officer_id: int) -> UserResponse:
        """Retrieve officer profile by officer profile ID."""
        profile = self.db.query(OfficerProfile).filter(OfficerProfile.id == officer_id).first()
        if not profile or not profile.user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")
        return AuthService.to_user_response(profile.user)

    def update_profile(self, user: User, data: OfficerProfileUpdate) -> UserResponse:
        """Update safe, editable officer profile fields."""
        self.user_repo.update_profile(user, data)
        # Reload user to ensure profile relationship is up-to-date
        updated_user = self.user_repo.get_by_id(user.id) or user

        # Log profile update audit event
        updated_fields = list(data.model_dump(exclude_unset=True).keys())
        self.audit_service.log_security_event(
            event_type=SecurityEventType.PROFILE_UPDATE,
            actor_id=user.igot_id,
            user_id=user.id,
            officer_id=user.igot_id,
            metadata={"updated_fields": updated_fields},
        )
        return AuthService.to_user_response(updated_user)

