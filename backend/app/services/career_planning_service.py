"""Career Progression and Future Role Planning Service — Phase 9.

Enables officers and supervisors to compare current officer competencies against
configured cadre progression benchmarks (e.g. JSO -> SSO -> Director), identifying
competency deltas, emerging skill requirements, and recommended training pathways.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.user import User
from backend.app.models.competency import Competency
from backend.app.models.future_role_requirement import FutureRoleRequirement
from backend.app.models.training_resource import TrainingResource
from backend.app.services.digital_twin_service import DigitalTwinService
from backend.app.schemas.career_planning import (
    TargetRoleSummary,
    CompetencyDeltaItem,
    CareerComparisonResponse,
)


class CareerPlanningService:
    """Service providing career progression analysis and target role competency gap matching."""

    def __init__(self, db: Session):
        self.db = db
        self.twin_service = DigitalTwinService(db)

    def list_target_roles(self, cadre: Optional[str] = None) -> List[TargetRoleSummary]:
        """List active target role benchmarks, optionally filtered by cadre."""
        query = self.db.query(FutureRoleRequirement).filter(
            FutureRoleRequirement.is_active == True  # noqa: E712
        )
        if cadre:
            query = query.filter(FutureRoleRequirement.cadre == cadre)

        roles = query.order_by(FutureRoleRequirement.role_name).all()
        return [
            TargetRoleSummary(
                id=r.id,
                role_name=r.role_name,
                cadre=r.cadre,
                description=r.description,
                required_competencies_count=len(r.required_competencies or {}),
                emerging_skills=r.emerging_skills or [],
                is_active=r.is_active,
            )
            for r in roles
        ]

    def compare_officer_to_target_role(
        self, officer_id: str, target_role_id: str
    ) -> CareerComparisonResponse:
        """Compares an officer's current competencies with a target role requirement benchmark."""
        # 1. Resolve officer profile
        profile = (
            self.db.query(OfficerProfile)
            .join(User, OfficerProfile.user_id == User.id, isouter=True)
            .filter(
                (User.igot_id == officer_id)
                | (OfficerProfile.id == (int(officer_id) if officer_id.isdigit() else -1))
            )
            .first()
        )
        if not profile:
            raise ValueError(f"Officer profile '{officer_id}' not found")

        # 2. Resolve target role
        target_role = (
            self.db.query(FutureRoleRequirement)
            .filter(
                (FutureRoleRequirement.id == target_role_id)
                | (FutureRoleRequirement.role_name == target_role_id)
            )
            .first()
        )
        if not target_role:
            raise ValueError(f"Target role benchmark '{target_role_id}' not found")

        required_map: Dict[str, float] = target_role.required_competencies or {}
        deltas: List[CompetencyDeltaItem] = []
        met_count = 0
        readiness_ratios: List[float] = []
        pathway_items: List[Dict[str, Any]] = []

        # 3. For each required competency in target role
        for comp_id, required_level in required_map.items():
            comp = self.db.query(Competency).filter(Competency.id == comp_id).first()
            comp_name = comp.name if comp else comp_id
            domain = comp.category if comp and comp.category else "Statistical Operations"

            # Evaluate current level
            if comp:
                eval_res = self.twin_service.evaluate_officer_competency(
                    profile, comp, persist=False
                )
                current_level = float(eval_res.get("currentLevel", 0.0))
            else:
                current_level = 0.0

            gap = max(0.0, round(required_level - current_level, 4))
            
            # Status classification
            if gap <= 0.05:
                status = "MET"
                met_count += 1
                ratio = 1.0
            elif gap <= 0.25:
                status = "MODERATE_GAP"
                ratio = max(0.0, min(1.0, current_level / required_level)) if required_level > 0 else 1.0
            else:
                status = "CRITICAL_GAP"
                ratio = max(0.0, min(1.0, current_level / required_level)) if required_level > 0 else 1.0

            readiness_ratios.append(ratio)

            # Find matching training interventions if there is a gap
            interventions: List[Dict[str, Any]] = []
            if gap > 0.05:
                matching_resources = (
                    self.db.query(TrainingResource)
                    .filter(
                        TrainingResource.competency_id == comp_id,
                        TrainingResource.status == "active",
                    )
                    .limit(3)
                    .all()
                )
                for tr in matching_resources:
                    intervention_info = {
                        "resource_id": tr.id,
                        "title": tr.title,
                        "provider": tr.provider,
                        "course_url": tr.metadata_json.get("course_url") if tr.metadata_json else None,
                        "duration_hours": tr.duration_hours,
                        "format": tr.delivery_mode,
                        "expected_gain": tr.metadata_json.get("expected_gain", 0.25) if tr.metadata_json else 0.25,
                    }
                    interventions.append(intervention_info)
                    pathway_items.append({
                        "competency_id": comp_id,
                        "competency_name": comp_name,
                        "gap": gap,
                        **intervention_info,
                    })

            deltas.append(
                CompetencyDeltaItem(
                    competency_id=comp_id,
                    competency_name=comp_name,
                    domain=domain,
                    required_level=required_level,
                    current_level=current_level,
                    gap=gap,
                    status=status,
                    recommended_interventions=interventions,
                )
            )

        total_reqs = len(required_map)
        overall_score = round(
            (sum(readiness_ratios) / total_reqs * 100.0) if total_reqs > 0 else 100.0, 1
        )

        resolved_officer_id = (
            profile.user.igot_id if profile.user and profile.user.igot_id else str(profile.id)
        )

        return CareerComparisonResponse(
            officer_id=resolved_officer_id,
            officer_name=profile.name,
            current_designation=profile.designation,
            current_cadre=profile.cadre,
            target_role_id=target_role.id,
            target_role_name=target_role.role_name,
            target_cadre=target_role.cadre,
            target_description=target_role.description,
            overall_readiness_score=overall_score,
            met_competencies_count=met_count,
            total_required_competencies_count=total_reqs,
            competency_deltas=deltas,
            emerging_skills_required=target_role.emerging_skills or [],
            recommended_pathway=pathway_items[:6],
        )
