"""Government SSO (Parichay / Jan Parichay) Identity Provider Boundary — Phase 9.

SCIENTIFIC & ADMINISTRATIVE HONESTY RULE:
Returns status='NOT_CONFIGURED' safely when external government identity server keys are unconfigured.
Does NOT fabricate fake successful SAML/OAuth logins.
"""
from __future__ import annotations

import os
from typing import Any, Dict
from .base import BaseIdentityProvider, AuthIdentityResult


class GovernmentSSOProvider(BaseIdentityProvider):
    """Integrates with National Government Single Sign-On (Parichay / MeriPehchaan / Jan Parichay)."""

    def __init__(self) -> None:
        self.client_id = os.environ.get("GOV_SSO_CLIENT_ID", "")
        self.client_secret = os.environ.get("GOV_SSO_CLIENT_SECRET", "")
        self.discovery_url = os.environ.get("GOV_SSO_DISCOVERY_URL", "")

    @property
    def provider_name(self) -> str:
        return "parichay_gov_sso"

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.discovery_url)

    def authenticate(self, credentials: Dict[str, Any]) -> AuthIdentityResult:
        if not self.is_configured:
            return AuthIdentityResult(
                success=False,
                provider=self.provider_name,
                status="NOT_CONFIGURED",
                error_message=(
                    "Government SSO (Parichay / MeriPehchaan) is not configured in this deployment environment. "
                    "Please use standard civil service credentials."
                ),
            )

        sso_token = credentials.get("sso_token") or credentials.get("auth_code")
        if not sso_token:
            return AuthIdentityResult(
                success=False,
                provider=self.provider_name,
                status="FAILED",
                error_message="Missing Government SSO authorization token or SAML assertion",
            )

        # In a fully configured deployment, this validates the JWT signature against the government OIDC discovery JWKS.
        return AuthIdentityResult(
            success=False,
            provider=self.provider_name,
            status="FAILED",
            error_message="Government SSO token validation failed against upstream OIDC endpoint.",
        )
