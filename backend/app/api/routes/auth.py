"""Authentication endpoints: register, login, me."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from backend.app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new civil service officer",
)
def register(
    data: UserRegister,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Registers a new officer profile with Argon2 password hashing.
    Rejects duplicate iGOT ID or email with HTTP 409 Conflict.
    """
    service = AuthService(db)
    return service.register(data)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login officer and obtain JWT access token",
)
def login(
    data: UserLogin,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates officer credentials using Argon2 verification and returns
    a signed JWT access token and safe officer profile.
    """
    service = AuthService(db)
    return service.login(data)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get currently authenticated officer identity",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Returns the currently authenticated civil service officer profile.
    Requires Bearer token authorization header.
    """
    return AuthService.to_user_response(current_user)
