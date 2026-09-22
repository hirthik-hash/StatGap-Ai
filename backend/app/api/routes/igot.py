"""Protected API routes for iGOT Karmayogi Integration."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.integrations.igot.exceptions import IGOTNotConfiguredError
from backend.app.integrations.igot.factory import get_igot_adapter
from backend.app.integrations.igot.models import (
    IGOTLearningRecord,
    IGOTSyncResult,
)
from backend.app.integrations.igot.service import IGOTIntegrationService
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.user import User

router = APIRouter(prefix="/igot", tags=["iGOT Karmayogi Integration"])


class IGOTStatusResponse(BaseModel):
    mode: str
    adapter_name: str
    is_configured: bool
    description: str


class IGOTImportResponse(BaseModel):
    status: str
    officer_igot_id: str
    total_fetched: int
    imported_count: int
    skipped_count: int
    correlation_id: Optional[str] = None


@router.get("/status", response_model=IGOTStatusResponse, summary="Get iGOT adapter integration status")
def get_status():
    """Reports current integration mode without leaking credentials."""
    adapter = get_igot_adapter()
    is_configured = getattr(adapter, "is_configured", True)
    mode = settings.IGOT_MODE.lower().strip()

    desc = (
        "Deterministic Mock iGOT Adapter active for SIH demonstration. "
        "Provides reproducible learning history import and verification synchronization."
        if mode == "mock"
        else "Real iGOT Adapter active (Production boundary)."
    )

    return IGOTStatusResponse(
        mode=mode,
        adapter_name=adapter.__class__.__name__,
        is_configured=is_configured,
        description=desc,
    )


@router.get("/records", response_model=List[IGOTLearningRecord], summary="Fetch available external iGOT learning records")
def get_available_records(
    current_user: User = Depends(get_current_user),
):
    """Fetches candidate learning records for the officer from the configured iGOT adapter."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    service = IGOTIntegrationService()
    try:
        return service.adapter.fetch_learning_records(current_user.igot_id)
    except IGOTNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


@router.post("/import", response_model=IGOTImportResponse, summary="Import learning records into STAT-GAP evidence (Idempotent)")
def import_learning_records(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Imports learning records from iGOT into normalized CompetencyEvidence records.
    
    Idempotent: Repeated imports of previously ingested records will not create duplicates.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    correlation_id = getattr(request.state, "request_id", None)
    service = IGOTIntegrationService()

    try:
        result = service.import_learning_records(
            db=db,
            officer_profile_id=profile.id,
            officer_igot_id=current_user.igot_id,
            correlation_id=correlation_id,
        )
        return result
    except IGOTNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


@router.post("/export/{competency_id}", response_model=IGOTSyncResult, summary="Export verified competency certification to iGOT")
def export_verification(
    competency_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exports verified competency record to iGOT via the adapter.
    
    If unconfigured in authorized mode, returns explicit NOT_CONFIGURED status.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    correlation_id = getattr(request.state, "request_id", None)
    service = IGOTIntegrationService()

    return service.export_competency_verification(
        db=db,
        officer_profile_id=profile.id,
        officer_igot_id=current_user.igot_id,
        competency_id=competency_id,
        correlation_id=correlation_id,
    )


@router.get("/sync-history", summary="Retrieve iGOT synchronization audit history")
def get_sync_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns immutable synchronization audit events for the authenticated officer."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found",
        )

    events = (
        db.query(CompetencyAuditEvent)
        .filter(
            CompetencyAuditEvent.officer_id == profile.id,
            CompetencyAuditEvent.event_type.in_(["igot_learning_imported", "igot_competency_exported"]),
        )
        .order_by(CompetencyAuditEvent.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "actor": e.actor,
            "event_data": e.event_data,
            "timestamp": e.timestamp,
        }
        for e in events
    ]
