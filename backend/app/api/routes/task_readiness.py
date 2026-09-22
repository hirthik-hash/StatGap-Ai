"""API routes for Task Readiness evaluation and What-If simulation — Phase 6.

All routes require authentication.
Officers can only evaluate their own task readiness.
Supervisors/Admins may access any officer's readiness via query parameter.

Simulation routes NEVER mutate authoritative officer state.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.task_readiness import TaskDefinition
from backend.app.schemas.task_readiness import (
    TaskDefinitionResponse,
    TaskReadinessResponse,
    TaskReadinessSimulationRequest,
    TaskReadinessSimulationResponse,
)
from backend.app.services.task_readiness_service import TaskReadinessService

router = APIRouter(prefix="/tasks", tags=["Task Readiness"])


def _resolve_profile(current_user: User, officer_igot_id: Optional[str], db: Session):
    """Enforce officer data isolation with Supervisor/Admin override."""
    from backend.app.models.user import User as UserModel
    from backend.app.models.officer_profile import OfficerProfile

    if officer_igot_id and officer_igot_id != current_user.igot_id:
        role = (current_user.role or "").upper()
        if role not in ("SUPERVISOR", "ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Officers cannot access another officer's task readiness data.",
            )
        target = db.query(UserModel).filter(UserModel.igot_id == officer_igot_id).first()
        if not target or not target.profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Officer '{officer_igot_id}' not found.",
            )
        return target.profile

    if not current_user.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found for authenticated user.",
        )
    return current_user.profile


@router.get(
    "",
    response_model=List[TaskDefinitionResponse],
    status_code=status.HTTP_200_OK,
    summary="List all active task definitions in the system",
)
def list_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all active task definitions with their requirement counts."""
    return TaskReadinessService.list_tasks(db, active_only=True)


@router.get(
    "/{task_id}",
    response_model=TaskDefinitionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single task definition",
)
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(TaskDefinition).filter(TaskDefinition.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task '{task_id}' not found")
    return {
        "taskId": task.id,
        "taskName": task.name,
        "taskDescription": task.description,
        "taskCategory": task.category,
        "cadreApplicable": task.cadre_applicable,
        "requirementCount": len(task.requirements),
        "isActive": task.is_active,
    }


@router.get(
    "/{task_id}/readiness",
    response_model=TaskReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate task readiness for the authenticated officer",
)
def get_task_readiness(
    task_id: str,
    officer_id: Optional[str] = Query(None, description="Target officer iGotId (Supervisor/Admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Evaluates whether the authenticated officer has the competencies required for this task.

    Returns:
        READY / PARTIALLY_READY / NOT_READY / INSUFFICIENT_EVIDENCE
        Plus bottleneck competency and per-requirement breakdown.

    PROTOTYPE DISCLAIMER: Results reflect modelled competency estimates, not validated performance.
    """
    profile = _resolve_profile(current_user, officer_id, db)

    try:
        result = TaskReadinessService.evaluate_task_readiness(
            db=db,
            officer_profile_id=profile.id,
            task_id=task_id,
            persist=True,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/{task_id}/simulate",
    response_model=TaskReadinessSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate task readiness with hypothetical competency changes",
)
def simulate_task_readiness(
    task_id: str,
    payload: TaskReadinessSimulationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Runs a what-if task readiness simulation.

    CRITICAL SAFETY RULE: This endpoint NEVER modifies real officer data.
    Simulated results are clearly labelled as hypothetical.
    The simulation is reproducible — running it again with the same inputs
    produces the same output.
    """
    profile = _resolve_profile(current_user, None, db)

    hypothetical_changes = [
        {"competency_id": ch.competency_id, "hypothetical_level": ch.hypothetical_level}
        for ch in payload.hypothetical_changes
    ]

    try:
        result = TaskReadinessService.simulate_what_if_readiness(
            db=db,
            officer_profile_id=profile.id,
            task_id=task_id,
            hypothetical_changes=hypothetical_changes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
