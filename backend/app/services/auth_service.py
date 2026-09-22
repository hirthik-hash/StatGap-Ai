"""Authentication service orchestrating registration, credential verification, and token issuance."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.repositories.user_repository import UserRepository
from backend.app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.services.audit_service import AuditService, SecurityEventType


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_service = AuditService(db)

    @staticmethod
    def to_user_response(user: User) -> UserResponse:
        """Helper to convert User and OfficerProfile models into safe UserResponse."""
        profile = user.profile
        return UserResponse(
            id=user.id,
            name=profile.name if profile else user.igot_id,
            iGotId=user.igot_id,
            email=user.email,
            phone=profile.phone if profile else "",
            dob=profile.dob if profile else "",
            department=profile.department if profile else "",
            designation=profile.designation if profile else "",
            role=getattr(user, "role", "OFFICER") or "OFFICER",
            cadre=profile.cadre if (profile and profile.cadre) else "ISS",
            currentAssignment=profile.current_assignment if profile else None,
            qualifications=profile.qualifications if profile else None,
            yearsOfExperience=profile.years_of_experience if profile else 0,
            profilePhoto=profile.profile_photo if profile else None,
        )

    def register(self, data: UserRegister) -> UserResponse:
        """Register a new civil service officer with duplicate account prevention."""
        # Check uniqueness of iGOT ID
        existing_igot = self.user_repo.get_by_igot_id(data.iGotId)
        if existing_igot:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with iGOT ID '{data.iGotId}' is already registered.",
            )

        # Check uniqueness of Email
        existing_email = self.user_repo.get_by_email(data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{data.email}' is already registered.",
            )

        # Hash password using Argon2
        hashed_pwd = hash_password(data.password)

        # Persist user and profile
        user = self.user_repo.create_user_with_profile(data, hashed_pwd)
        return self.to_user_response(user)

    def login(self, data: UserLogin) -> TokenResponse:
        """Authenticate officer credentials and return a signed JWT access token."""
        user = self.user_repo.get_by_igot_id(data.iGotId)
        if not user or not verify_password(data.password, user.password_hash):
            self.audit_service.log_security_event(
                event_type=SecurityEventType.LOGIN_FAILURE,
                actor_id=data.iGotId,
                user_id=user.id if user else None,
                officer_id=user.igot_id if user else None,
                metadata={"attempted_igot_id": data.iGotId, "reason": "invalid_credentials"},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Please verify your iGOT ID and password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            self.audit_service.log_security_event(
                event_type=SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
                actor_id=user.igot_id,
                user_id=user.id,
                officer_id=user.igot_id,
                metadata={"reason": "account_deactivated"},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Officer account is deactivated. Please contact your department administrator.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_role = getattr(user, "role", "OFFICER") or "OFFICER"

        # Log successful login
        self.audit_service.log_security_event(
            event_type=SecurityEventType.LOGIN_SUCCESS,
            actor_id=user.igot_id,
            user_id=user.id,
            officer_id=user.igot_id,
            metadata={"role": user_role},
        )

        # Create JWT token with stable subject and role claim
        access_token = create_access_token(data={"sub": user.igot_id, "role": user_role})
        user_res = self.to_user_response(user)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_res,
        )

