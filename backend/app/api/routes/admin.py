"""Admin and Supervisor RBAC protected endpoints."""
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from backend.app.core.database import get_db
from backend.app.core.security import require_admin, require_supervisor, UserRole
from backend.app.models.user import User
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.schemas.auth import UserResponse
from backend.app.schemas.verification import CompetencyAuditEventResponse
from backend.app.schemas.admin_analytics import (
    WorkforceOverviewResponse,
    HeatmapMatrixResponse,
    GapDistributionItem,
    TaskReadinessAnalyticsItem,
    TrainingDemandRollupItem,
    TrainingEffectivenessResponse,
    FutureRoleComparisonItem,
    CapacityBuildingPriorityItem,
    SupervisorAnalyticsOverview,
)
from backend.app.services.auth_service import AuthService
from backend.app.services.audit_service import AuditService, SecurityEventType
from backend.app.services.workforce_analytics_service import WorkforceAnalyticsService

admin_router = APIRouter(prefix="/admin", tags=["Admin & RBAC Management"])
supervisor_router = APIRouter(prefix="/supervisor", tags=["Supervisor Management"])


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., description="Target role: OFFICER, SUPERVISOR, or ADMIN")


# ----------------------------------------------------
# Admin Endpoints (Require ADMIN role)
# ----------------------------------------------------
@admin_router.get(
    "/audit-events",
    response_model=List[CompetencyAuditEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Admin view of system-wide audit and security events",
)
def get_system_audit_events(
    limit: int = Query(100, ge=1, le=500),
    event_type: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Allows administrators to inspect system-wide audit logs, login histories, and security alerts."""
    query = db.query(CompetencyAuditEvent)
    if event_type:
        query = query.filter(CompetencyAuditEvent.event_type == event_type)
    return query.order_by(CompetencyAuditEvent.timestamp.desc()).limit(limit).all()


@admin_router.get(
    "/users",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Admin list of registered civil service users",
)
def list_all_users(
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Allows administrators to view all registered civil servants and their roles."""
    query = db.query(User).options(joinedload(User.profile))
    if role:
        query = query.filter(User.role == role.upper())
    users = query.limit(limit).all()
    return [AuthService.to_user_response(u) for u in users]


@admin_router.put(
    "/users/{user_id}/role",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin update user role",
)
def update_user_role(
    user_id: int,
    payload: RoleUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Updates a user's role and logs a ROLE_CHANGE audit event."""
    new_role = payload.role.strip().upper()
    if new_role not in UserRole.ALL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(UserRole.ALL)}",
        )

    target_user = db.query(User).options(joinedload(User.profile)).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    old_role = target_user.role
    target_user.role = new_role
    db.commit()
    db.refresh(target_user)

    # Record security audit event
    AuditService(db).log_security_event(
        event_type=SecurityEventType.ROLE_CHANGE,
        actor_id=admin_user.igot_id,
        user_id=target_user.id,
        officer_id=target_user.igot_id,
        metadata={"old_role": old_role, "new_role": new_role},
    )

    return AuthService.to_user_response(target_user)


# ----------------------------------------------------
# Admin Workforce Analytics (Phase 8)
# ----------------------------------------------------
@admin_router.get(
    "/analytics/overview",
    response_model=WorkforceOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Cadre and workforce summary metrics",
)
def get_workforce_overview(
    cadre: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Calculates cadre summary metrics, verified mastery rates, critical gaps, and readiness."""
    service = WorkforceAnalyticsService(db)
    return service.get_overview(cadre=cadre, department=department)


@admin_router.get(
    "/analytics/heatmap",
    response_model=HeatmapMatrixResponse,
    status_code=status.HTTP_200_OK,
    summary="Cadre x Competency aggregate mastery heatmap",
)
def get_cadre_heatmap(
    cadre: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Aggregates mean mastery, verified rates, gap rates, and red alert counts across cadres and competencies."""
    service = WorkforceAnalyticsService(db)
    return service.get_heatmap(cadre=cadre, department=department)


@admin_router.get(
    "/analytics/gaps",
    response_model=List[GapDistributionItem],
    status_code=status.HTTP_200_OK,
    summary="Cadre-wide gap distribution and high-risk competency concentrations",
)
def get_gap_distribution(
    cadre: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Calculates overall gap breakdown (red/orange/green) and flags high-risk competencies."""
    service = WorkforceAnalyticsService(db)
    return service.get_gap_distribution(cadre=cadre, department=department)


@admin_router.get(
    "/analytics/task-readiness",
    response_model=List[TaskReadinessAnalyticsItem],
    status_code=status.HTTP_200_OK,
    summary="National/cadre task deployment readiness and common bottleneck rollups",
)
def get_task_readiness_analytics(
    cadre: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Rolls up readiness across statistical tasks and flags key bottleneck competencies blocking readiness."""
    service = WorkforceAnalyticsService(db)
    return service.get_task_readiness_analytics(cadre=cadre, department=department)


@admin_router.get(
    "/analytics/training-demand",
    response_model=List[TrainingDemandRollupItem],
    status_code=status.HTTP_200_OK,
    summary="Aggregated training demand rollup across iGOT, NSSTA, and TPAC providers",
)
def get_training_demand(
    cadre: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Rolls up training recommendations by provider and specific course demand."""
    service = WorkforceAnalyticsService(db)
    return service.get_training_demand(cadre=cadre, department=department)


@admin_router.get(
    "/analytics/training-effectiveness",
    response_model=TrainingEffectivenessResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluated training outcome trends and longitudinal mastery shifts",
)
def get_training_effectiveness(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Assesses pre-vs-post intervention mastery shifts. Returns status='insufficient_longitudinal_data' when data is limited."""
    service = WorkforceAnalyticsService(db)
    return service.get_training_effectiveness()


@admin_router.get(
    "/analytics/future-requirements",
    response_model=List[FutureRoleComparisonItem],
    status_code=status.HTTP_200_OK,
    summary="Cadre-wide future role readiness comparisons and pipeline analytics",
)
def get_future_requirements(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Compares current cadre profiles against upcoming/modernized statistical role definitions."""
    service = WorkforceAnalyticsService(db)
    return service.get_future_requirements()


@admin_router.get(
    "/analytics/capacity-priorities",
    response_model=List[CapacityBuildingPriorityItem],
    status_code=status.HTTP_200_OK,
    summary="Ranked capacity-building priorities for national training calendars",
)
def get_capacity_priorities(
    cadre: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Calculates prioritized interventions ranked by urgency, reach, and task impact."""
    service = WorkforceAnalyticsService(db)
    return service.get_capacity_building_priorities(cadre=cadre, department=department)


@admin_router.get(
    "/analytics/export",
    status_code=status.HTTP_200_OK,
    summary="Export cadre competency matrix and gap summaries as CSV",
)
def export_analytics_csv(
    cadre: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Generates a downloadable CSV matrix of competency states across the workforce."""
    service = WorkforceAnalyticsService(db)
    csv_content = service.export_csv(cadre=cadre, department=department)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=workforce_competency_analytics.csv"
        },
    )


# ----------------------------------------------------
# Supervisor Endpoints (Require SUPERVISOR or ADMIN role)
# ----------------------------------------------------
@supervisor_router.get(
    "/officers",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List subordinate officers under supervisor jurisdiction",
)
def list_subordinate_officers(
    department: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    supervisor_user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Retrieves officers for supervisor review and team oversight."""
    query = db.query(User).options(joinedload(User.profile)).filter(User.role == UserRole.OFFICER)
    users = query.limit(limit).all()
    return [AuthService.to_user_response(u) for u in users]


@supervisor_router.get(
    "/analytics/overview",
    response_model=SupervisorAnalyticsOverview,
    status_code=status.HTTP_200_OK,
    summary="Supervisor unit/team-level overview",
)
def get_supervisor_overview(
    department: Optional[str] = Query(None),
    supervisor_user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Calculates team summary metrics, top gaps, and readiness within supervisor's departmental scope."""
    service = WorkforceAnalyticsService(db)
    return service.get_supervisor_overview(supervisor_user=supervisor_user, department=department)


