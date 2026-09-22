"""Protected Officer Competency Intelligence and Digital Twin API routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.structured_evidence import StructuredEvidence
from backend.app.models.competency import Competency
from backend.app.schemas.competency_intelligence import (
    OfficerCompetencyStateResponse,
    EvidenceRecordResponse,
    DigitalTwinResponse,
    DigitalTwinSnapshotResponse,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
)
from backend.app.services.digital_twin_service import DigitalTwinService

router = APIRouter(tags=["Officer Competency Digital Twin"])


def _resolve_target_profile(current_user: User, officer_id: Optional[str], db: Session) -> OfficerProfile:
    """Enforces officer data isolation with Supervisor/Admin override for multi-officer access."""
    if officer_id and officer_id != current_user.igot_id:
        role_upper = (current_user.role or "").upper()
        if role_upper not in ("SUPERVISOR", "ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Officers cannot access other officers' data."
            )
        target_user = db.query(User).filter(User.igot_id == officer_id).first()
        if not target_user or not target_user.profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Officer with ID '{officer_id}' not found."
            )
        return target_user.profile

    if not current_user.profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")
    return current_user.profile


@router.get(
    "/officer/competencies",
    response_model=List[OfficerCompetencyStateResponse],
    status_code=status.HTTP_200_OK,
    summary="Get authenticated officer's evaluated competency states",
)
def get_officer_competencies(
    officer_id: Optional[str] = Query(None, description="Target officer iGotId (Supervisor/Admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns deterministic, evaluated competency states for the target officer,
    including normalized scores, gaps, traffic-light bands, and 3-factor evidence confidence.
    """
    profile = _resolve_target_profile(current_user, officer_id, db)
    service = DigitalTwinService(db)
    twin = service.build_digital_twin(profile.id)
    return twin["competencyStates"]


@router.get(
    "/officer/competencies/{competency_id}",
    response_model=OfficerCompetencyStateResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single evaluated competency state with evidence breakdown",
)
def get_officer_competency_detail(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    comp = db.query(Competency).filter(Competency.id == competency_id).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Competency '{competency_id}' not found")

    service = DigitalTwinService(db)
    return service.evaluate_officer_competency(profile, comp, persist=True)


@router.get(
    "/officer/gaps",
    response_model=List[OfficerCompetencyStateResponse],
    status_code=status.HTTP_200_OK,
    summary="Get officer's prioritized competency gap deficit list",
)
def get_officer_gaps(
    band_filter: Optional[str] = Query(None, description="Filter by band: red, orange, green"),
    officer_id: Optional[str] = Query(None, description="Target officer iGotId (Supervisor/Admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _resolve_target_profile(current_user, officer_id, db)
    service = DigitalTwinService(db)
    twin = service.build_digital_twin(profile.id)
    states = twin["competencyStates"]

    if band_filter:
        states = [s for s in states if s["gapBand"] == band_filter.lower()]

    # Sort deficits descending by raw gap
    states.sort(key=lambda s: s["rawGap"], reverse=True)
    return states


@router.get(
    "/officer/evidence",
    response_model=List[EvidenceRecordResponse],
    status_code=status.HTTP_200_OK,
    summary="Get multi-source evidence ledger for authenticated officer",
)
def get_officer_evidence_ledger(
    competency_id: Optional[str] = Query(None),
    officer_id: Optional[str] = Query(None, description="Target officer iGotId (Supervisor/Admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _resolve_target_profile(current_user, officer_id, db)
    query = db.query(StructuredEvidence).filter(StructuredEvidence.officer_profile_id == profile.id)
    if competency_id:
        query = query.filter(StructuredEvidence.competency_id == competency_id)

    records = query.order_by(StructuredEvidence.recorded_at.desc()).all()
    return [
        EvidenceRecordResponse(
            id=r.id,
            competencyId=r.competency_id,
            subSkillId=r.sub_skill_id,
            sourceType=r.source_type,
            sourceReference=r.source_reference,
            rawScore=r.raw_score,
            normalizedScore=r.normalized_score,
            weight=r.weight,
            validityStatus=r.validity_status,
            recordedAt=r.recorded_at.isoformat(),
        )
        for r in records
    ]


@router.get(
    "/officer/digital-twin",
    response_model=DigitalTwinResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated officer's complete computational Digital Twin",
)
def get_officer_digital_twin(
    officer_id: Optional[str] = Query(None, description="Target officer iGotId (Supervisor/Admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _resolve_target_profile(current_user, officer_id, db)
    service = DigitalTwinService(db)
    return service.build_digital_twin(profile.id)


@router.post(
    "/officer/digital-twin/snapshot",
    status_code=status.HTTP_201_CREATED,
    summary="Create immutable point-in-time snapshot of Digital Twin state",
)
def create_digital_twin_snapshot(
    trigger_event: str = Query("MANUAL_SNAPSHOT", description="Triggering event or lifecycle tag"),
    officer_id: Optional[str] = Query(None, description="Target officer iGotId (Supervisor/Admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _resolve_target_profile(current_user, officer_id, db)
    service = DigitalTwinService(db)
    snapshot = service.create_snapshot(profile.id, trigger_event=trigger_event)
    return {
        "message": "Digital Twin snapshot successfully captured",
        "snapshotId": snapshot.snapshot_id,
        "triggerEvent": snapshot.trigger_event,
        "createdAt": snapshot.created_at.isoformat(),
    }


@router.get(
    "/officer/digital-twin/snapshots",
    response_model=List[DigitalTwinSnapshotResponse],
    status_code=status.HTTP_200_OK,
    summary="Get timeline of saved Digital Twin snapshots",
)
def list_digital_twin_snapshots(
    officer_id: Optional[str] = Query(None, description="Target officer iGotId (Supervisor/Admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _resolve_target_profile(current_user, officer_id, db)
    service = DigitalTwinService(db)
    return service.list_snapshots(profile.id)


@router.post(
    "/officer/digital-twin/simulate",
    response_model=WhatIfSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate hypothetical post-intervention competency state without mutating data",
)
def simulate_digital_twin_what_if(
    request: WhatIfSimulationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    service = DigitalTwinService(db)
    try:
        result = service.simulate_what_if(
            officer_profile_id=profile.id,
            target_competency_id=request.targetCompetencyId,
            intervention_type=request.interventionType,
            hypothetical_score=request.hypotheticalScore,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
