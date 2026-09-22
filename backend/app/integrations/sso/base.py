"""Abstract Base for Identity Providers and SSO Integration Boundary — Phase 9.

Defines the pluggable authentication contract for local database authentication and external Government SSO
(e.g., Parichay / Jan Parichay / MeriPehchaan).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class AuthIdentityResult(BaseModel):
    """Normalized identity result returned by an authentication provider."""

    success: bool
    igot_id: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    cadre: Optional[str] = None
    department: Optional[str] = None
    provider: str
    status: str = Field(..., description="AUTHENTICATED, FAILED, NOT_CONFIGURED")
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseIdentityProvider(ABC):
    """Abstract contract for identity verification."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    def authenticate(self, credentials: Dict[str, Any]) -> AuthIdentityResult:
        """Validates credentials or token and returns normalized AuthIdentityResult."""
        pass
