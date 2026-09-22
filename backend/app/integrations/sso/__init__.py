"""SSO Identity Provider Integration Package."""
from .base import BaseIdentityProvider, AuthIdentityResult
from .local_auth_adapter import LocalIdentityProvider
from .gov_sso_adapter import GovernmentSSOProvider

LocalAuthAdapter = LocalIdentityProvider
GovSSOAdapter = GovernmentSSOProvider

__all__ = [
    "BaseIdentityProvider",
    "AuthIdentityResult",
    "LocalIdentityProvider",
    "LocalAuthAdapter",
    "GovernmentSSOProvider",
    "GovSSOAdapter",
]
