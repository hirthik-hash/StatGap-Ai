"""Local Database Authentication Identity Provider."""
from __future__ import annotations

from typing import Any, Dict
from sqlalchemy.orm import Session
from backend.app.core.security import verify_password
from backend.app.models.user import User
from .base import BaseIdentityProvider, AuthIdentityResult


class LocalIdentityProvider(BaseIdentityProvider):
    """Authenticates against the internal PostgreSQL/SQLite database with Argon2/Bcrypt."""

    def __init__(self, db: Session):
        self.db = db

    @property
    def provider_name(self) -> str:
        return "local_database"

    @property
    def is_configured(self) -> bool:
        return True

    def authenticate(self, credentials: Dict[str, Any]) -> AuthIdentityResult:
        username_or_email = credentials.get("username") or credentials.get("email")
        password = credentials.get("password")

        if not username_or_email or not password:
            return AuthIdentityResult(
                success=False,
                provider=self.provider_name,
                status="FAILED",
                error_message="Missing email/username or password",
            )

        user = (
            self.db.query(User)
            .filter((User.email == username_or_email) | (User.igot_id == username_or_email))
            .first()
        )

        if not user or not verify_password(password, user.password_hash):
            return AuthIdentityResult(
                success=False,
                provider=self.provider_name,
                status="FAILED",
                error_message="Invalid civil service credentials",
            )

        if not user.is_active:
            return AuthIdentityResult(
                success=False,
                provider=self.provider_name,
                status="FAILED",
                error_message="User account is deactivated",
            )

        profile = user.profile
        return AuthIdentityResult(
            success=True,
            igot_id=user.igot_id,
            email=user.email,
            full_name=profile.name if profile else user.full_name if hasattr(user, 'full_name') else "Officer",
            cadre=profile.cadre if profile else None,
            department=profile.department if profile else None,
            provider=self.provider_name,
            status="AUTHENTICATED",
        )
