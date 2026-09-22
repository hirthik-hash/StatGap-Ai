"""API Routes for Career Progression and Future Role Planning — Phase 9."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.career_planning import (
    TargetRoleSummary,
    CareerComparisonRequest,
    CareerComparisonResponse,
)
from backend.app.services.career_planning_service import CareerPlanningService
from backend.app.services.workforce_analytics_service import WorkforceAnalyticsService

router = APIRouter(prefix="/career", tags=["career_progression"])


@router.get(
    "/target-roles",
    response_model=List[TargetRoleSummary],
    summary="List target role benchmarks for career progression",
)
def list_target_roles(
    cadre: Optional[str] = Query(None, description="Optional cadre filter (e.g., SSO, Director)"),
    db: Session = Depends(get_db),
):
    """Returns configured institutional future role benchmarks and competency profiles."""
    # Ensure default roles are seeded if empty
    WorkforceAnalyticsService(db)
    service = CareerPlanningService(db)
    return service.list_target_roles(cadre=cadre)


@router.post(
    "/compare",
    response_model=CareerComparisonResponse,
    summary="Compare officer competencies against a target future role",
)
def compare_officer_role(
    payload: CareerComparisonRequest,
    db: Session = Depends(get_db),
):
    """Evaluates competency deltas, emerging skill gaps, and recommended training pathways."""
    service = CareerPlanningService(db)
    try:
        return service.compare_officer_to_target_role(
            officer_id=payload.officer_id,
            target_role_id=payload.target_role_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Career comparison failed: {str(e)}",
        )
