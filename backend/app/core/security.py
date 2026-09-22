"""Security module: Argon2 password hashing, JWT generation, and OAuth2 authentication dependencies."""
from datetime import datetime, timedelta, timezone
from typing import Optional
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.user import User

# Argon2 password hasher instance
_ph = PasswordHasher()

# OAuth2 scheme extracting Bearer token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/auth/login",
    auto_error=False
)


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using Argon2."""
    if not plain_password:
        raise ValueError("Password cannot be empty")
    return _ph.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2 hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed PyJWT access token with expiration."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI reusable dependency: retrieves and validates the authenticated civil service officer.
    Raises HTTP 401 if missing, invalid, or expired.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    igot_id: Optional[str] = payload.get("sub")
    if igot_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: subject missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Find user in database
    user = db.query(User).filter(User.igot_id == igot_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated officer identity not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


class UserRole:
    OFFICER = "OFFICER"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"

    ALL = [OFFICER, SUPERVISOR, ADMIN]


def require_role(*allowed_roles: str):
    """
    Dependency factory enforcing that the authenticated officer possesses at least one of the allowed roles.
    Raises HTTP 403 Forbidden if unauthorized.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (getattr(current_user, "role", None) or UserRole.OFFICER).upper()
        allowed = [r.upper() for r in allowed_roles]
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Required role(s): {', '.join(allowed)}. Current role: '{user_role}'.",
            )
        return current_user

    return role_checker


# Convenient pre-configured role dependencies
require_officer = require_role(UserRole.OFFICER, UserRole.SUPERVISOR, UserRole.ADMIN)
require_supervisor = require_role(UserRole.SUPERVISOR, UserRole.ADMIN)
require_admin = require_role(UserRole.ADMIN)


def verify_officer_access(
    resource_officer_id: int,
    current_user: User,
    allow_supervisor: bool = True,
) -> None:
    """
    Enforces multi-tenant data isolation and prevents IDOR vulnerabilities.
    - Admins and Supervisors (if enabled) can view subordinate records.
    - Officers can ONLY access their own records.
    - Unauthorized access returns HTTP 404 to eliminate resource enumeration.
    """
    user_role = (getattr(current_user, "role", None) or UserRole.OFFICER).upper()
    if user_role == UserRole.ADMIN:
        return
    if allow_supervisor and user_role == UserRole.SUPERVISOR:
        return

    profile = getattr(current_user, "profile", None)
    if profile and profile.id == resource_officer_id:
        return

    # Strictly return 404 to avoid enumeration of other officers' existence
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Requested officer resource was not found.",
    )
