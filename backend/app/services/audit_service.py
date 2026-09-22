"""Audit logging service for security, authentication, and statutory civil service actions.

IMPORTANT SECURITY RULE:
Never log plaintext passwords, password hashes, JWT tokens, or raw encryption keys.
All events are committed append-only with timestamps and optional correlation IDs.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from backend.app.models.audit_event import CompetencyAuditEvent

logger = logging.getLogger("statgapai.audit")


class SecurityEventType:
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    ROLE_CHANGE = "ROLE_CHANGE"
    PROFILE_UPDATE = "PROFILE_UPDATE"
    UNAUTHORIZED_ACCESS_ATTEMPT = "UNAUTHORIZED_ACCESS_ATTEMPT"
    ADMIN_CONFIG_CHANGE = "ADMIN_CONFIG_CHANGE"


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_event(
        self,
        event_type: str,
        actor: str = "system",
        user_id: Optional[int] = None,
        officer_id: Optional[int] = None,
        competency_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ) -> CompetencyAuditEvent:
        """
        Records an immutable audit event in the database ledger.
        Sanitizes details to ensure no secrets or sensitive credentials are persisted.
        """
        sanitized_details = (details or {}).copy()
        # Security: Strip any accidental credential keys
        for sensitive_key in ("password", "password_hash", "token", "secret", "jwt", "authorization"):
            sanitized_details.pop(sensitive_key, None)

        if correlation_id:
            sanitized_details["correlation_id"] = correlation_id

        audit_record = CompetencyAuditEvent(
            event_type=event_type,
            actor=actor,
            user_id=user_id,
            officer_id=officer_id,
            competency_id=competency_id,
            event_data=sanitized_details,
        )
        self.db.add(audit_record)
        try:
            self.db.commit()
            self.db.refresh(audit_record)
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to commit audit event %s: %s", event_type, str(e))
            raise

        return audit_record

    def log_security_event(
        self,
        event_type: str,
        actor_id: str = "system",
        user_id: Optional[int] = None,
        officer_id: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ) -> CompetencyAuditEvent:
        """Convenience method for security, login, and authorization events."""
        prof_id = officer_id if isinstance(officer_id, int) else None
        details = (metadata or {}).copy()
        if isinstance(officer_id, str):
            details["officer_igot_id"] = officer_id

        return self.log_event(
            event_type=event_type,
            actor=actor_id,
            user_id=user_id,
            officer_id=prof_id,
            details=details,
            correlation_id=correlation_id,
        )

