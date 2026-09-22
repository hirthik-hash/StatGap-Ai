"""Training Intervention Optimizer Service — Phase 7.

Deterministic, transparent optimization engine that matches verified competency gaps,
task-readiness bottlenecks, and officer constraints to normalized training interventions.

SCIENTIFIC INTEGRITY RULE:
Does NOT make unsupported claims (e.g. "+25% productivity").
All scoring and explanations are strictly grounded in competency alignment, gap severity,
task bottlenecks, prerequisite fit, and constraint compliance.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.integrations.training.factory import get_training_adapters
from backend.app.models.competency import Competency
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.task_readiness import TaskDefinition
from backend.app.models.training_resource import TrainingResource
from backend.app.models.verification import CompetencyVerification
from backend.app.schemas.training import (
    ExcludedIntervention,
    FactorScoreDetail,
    InterventionRecommendation,
    PersonalizedRecommendationsResponse,
    ProviderStatusSchema,
    TrainingConstraintInput,
    TrainingResourceResponse,
)
from backend.app.services.task_readiness_service import TaskReadinessService
from backend.app.services.training_sync_service import TrainingSyncService


class TrainingOptimizerService:
    """Deterministic Optimizer for selecting and ranking training interventions."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def _ensure_catalogue_seeded(self) -> None:
        """Seeds training resources from adapters if table is currently empty."""
        count = self.db.query(TrainingResource).count()
        if count == 0:
            sync_service = TrainingSyncService(self.db)
            sync_service.sync_all_catalogues(actor="system_auto_seed")

    def get_provider_statuses(self) -> List[ProviderStatusSchema]:
        """Returns current status of all registered training providers."""
        adapters = get_training_adapters()
        res = []
        for p_code, adapter in adapters.items():
            st = adapter.get_status()
            res.append(
                ProviderStatusSchema(
                    provider=st.provider,
                    name=st.name,
                    mode=st.mode,
                    is_configured=st.is_configured,
                    description=st.description,
                )
            )
        return res

    def optimize_recommendations(
        self,
        officer_profile: OfficerProfile,
        constraints: Optional[TrainingConstraintInput] = None,
    ) -> PersonalizedRecommendationsResponse:
        """Computes deterministic, explainable training recommendations for an officer."""
        self._ensure_catalogue_seeded()
        if constraints is None:
            constraints = TrainingConstraintInput()

        # 1. Fetch Officer Competency States & Gaps
        states = (
            self.db.query(OfficerCompetencyState)
            .filter(OfficerCompetencyState.officer_profile_id == officer_profile.id)
            .all()
        )
        state_map: Dict[str, OfficerCompetencyState] = {s.competency_id: s for s in states}

        # Fetch Competencies
        all_comps = self.db.query(Competency).all()
        comp_name_map: Dict[str, str] = {c.id: c.name for c in all_comps}

        # Find Priority Gap (largest gap with highest severity)
        priority_gap_state: Optional[OfficerCompetencyState] = None
        max_gap_val = -1.0
        for s in states:
            gap = getattr(s, "gap", 0.0) or 0.0
            if gap > max_gap_val:
                max_gap_val = gap
                priority_gap_state = s

        priority_comp_id = priority_gap_state.competency_id if priority_gap_state else "comp_survey_audit"
        priority_comp_name = comp_name_map.get(priority_comp_id, priority_comp_id)
        priority_severity = getattr(priority_gap_state, "severity", "moderate") if priority_gap_state else "moderate"
        priority_gap_num = max_gap_val if max_gap_val > 0 else 0.35

        # 2. Fetch Active Diagnoses / Misconceptions
        diagnoses = (
            self.db.query(GapDiagnosis)
            .filter(GapDiagnosis.officer_profile_id == officer_profile.id)
            .all()
        )
        diagnosed_comp_ids = {d.competency_id for d in diagnoses}

        # 3. Determine Task Bottleneck (Phase 6 Integration)
        bottleneck_comp_id: Optional[str] = None
        bottleneck_task_id: Optional[str] = None
        bottleneck_task_title: Optional[str] = None

        if constraints.target_task_id:
            task_def = self.db.query(TaskDefinition).filter(TaskDefinition.id == constraints.target_task_id).first()
            if task_def:
                try:
                    eval_res = TaskReadinessService.evaluate_task_readiness(
                        self.db, officer_profile.id, task_def.id, persist=False
                    )
                    bottleneck_comp_id = eval_res.get("bottleneckCompetencyId") or eval_res.get("bottleneck_competency_id")
                    bottleneck_task_id = task_def.id
                    bottleneck_task_title = getattr(task_def, "name", None) or getattr(task_def, "title", "Task")
                except Exception:
                    pass
        else:
            # Check active tasks to find the primary bottleneck
            tasks = self.db.query(TaskDefinition).filter(TaskDefinition.is_active == True).all()  # noqa: E712
            for t in tasks:
                try:
                    eval_res = TaskReadinessService.evaluate_task_readiness(
                        self.db, officer_profile.id, t.id, persist=False
                    )
                    b_id = eval_res.get("bottleneckCompetencyId") or eval_res.get("bottleneck_competency_id")
                    if b_id:
                        bottleneck_comp_id = b_id
                        bottleneck_task_id = t.id
                        bottleneck_task_title = getattr(t, "name", None) or getattr(t, "title", "Task")
                        break
                except Exception:
                    continue

        # 4. Fetch Active Verifications for Prerequisite checking
        verifications = (
            self.db.query(CompetencyVerification)
            .filter(
                CompetencyVerification.officer_id == officer_profile.id,
                CompetencyVerification.verification_status.in_(["VERIFIED", "verified"]),
            )
            .all()
        )
        verified_comp_ids = {v.competency_id for v in verifications}

        # 5. Query candidate resources
        query = self.db.query(TrainingResource).filter(TrainingResource.status == "active")
        if constraints.provider_filter:
            query = query.filter(TrainingResource.provider.in_(constraints.provider_filter))
        candidate_resources = query.all()

        recommendations: List[InterventionRecommendation] = []
        excluded_interventions: List[ExcludedIntervention] = []

        # 6. Evaluate Each Candidate Resource
        for resource in candidate_resources:
            # Check Exclusions
            is_excluded, exclusion_reason = self._check_exclusion(
                resource=resource,
                constraints=constraints,
                state_map=state_map,
                verified_comp_ids=verified_comp_ids,
            )

            if is_excluded:
                excluded_interventions.append(
                    ExcludedIntervention(
                        resource_id=resource.id,
                        title=resource.title,
                        provider=resource.provider,
                        exclusion_reason=exclusion_reason or "Does not satisfy constraints.",
                    )
                )
                continue

            # Compute Deterministic Factor Scores
            rec = self._score_resource(
                resource=resource,
                priority_comp_id=priority_comp_id,
                priority_comp_name=priority_comp_name,
                priority_severity=priority_severity,
                priority_gap_num=priority_gap_num,
                state_map=state_map,
                comp_name_map=comp_name_map,
                bottleneck_comp_id=bottleneck_comp_id,
                bottleneck_task_title=bottleneck_task_title,
                verified_comp_ids=verified_comp_ids,
                constraints=constraints,
                diagnosed_comp_ids=diagnosed_comp_ids,
            )
            recommendations.append(rec)

        # Sort recommendations by total score descending, then by duration ascending for tie-breaking
        recommendations.sort(key=lambda r: (r.score, -r.resource.duration_hours), reverse=True)
        top_recommendations = recommendations[: constraints.max_recommendations]

        # Officer & Cadre Details
        officer_user = officer_profile.user
        officer_name = getattr(officer_profile, "name", None) or (officer_user.full_name if officer_user and officer_user.full_name else "Statistical Officer")
        officer_cadre = officer_profile.cadre if officer_profile.cadre else "Junior Statistical Officer (JSO)"
        officer_igot_id = officer_user.igot_id if officer_user else "N/A"

        return PersonalizedRecommendationsResponse(
            officer_id=str(officer_profile.id),
            officer_igot_id=officer_igot_id,
            officer_name=officer_name,
            cadre=officer_cadre,
            priority_gap_competency_id=priority_comp_id,
            priority_gap_competency_name=priority_comp_name,
            priority_gap_severity=priority_severity,
            priority_gap_value=round(priority_gap_num, 3),
            active_bottleneck_task=bottleneck_task_id,
            active_bottleneck_task_title=bottleneck_task_title,
            recommendations=top_recommendations,
            excluded_interventions=excluded_interventions,
            total_candidates_evaluated=len(candidate_resources),
            providers_status=self.get_provider_statuses(),
        )

    def _check_exclusion(
        self,
        resource: TrainingResource,
        constraints: TrainingConstraintInput,
        state_map: Dict[str, OfficerCompetencyState],
        verified_comp_ids: set[str],
    ) -> Tuple[bool, Optional[str]]:
        """Checks if a resource must be deterministically excluded based on strict constraints."""
        # 1. Max Duration Constraint
        if constraints.max_duration_hours is not None:
            if resource.duration_hours > constraints.max_duration_hours:
                return True, (
                    f"Excluded because programme duration ({resource.duration_hours} hrs) "
                    f"exceeds officer maximum constraint of {constraints.max_duration_hours} hrs."
                )

        # 2. Preferred Delivery Modes Filter
        if constraints.preferred_delivery_modes:
            if resource.delivery_mode not in constraints.preferred_delivery_modes:
                return True, (
                    f"Excluded because delivery mode '{resource.delivery_mode}' "
                    f"does not match preferred modes ({', '.join(constraints.preferred_delivery_modes)})."
                )

        # 3. Missing Critical Prerequisites (where prerequisite is neither verified nor score >= 0.50)
        if resource.prerequisites:
            for req_comp in resource.prerequisites:
                if req_comp in verified_comp_ids:
                    continue
                req_state = state_map.get(req_comp)
                obs_score = getattr(req_state, "current_level", None)
                if obs_score is None:
                    obs_score = getattr(req_state, "observed_score", 0.0) or 0.0
                if obs_score < 0.40:
                    return True, (
                        f"Excluded because prerequisite competency '{req_comp}' is unsatisfied "
                        f"(observed level {obs_score:.0%} < 40% required threshold)."
                    )

        return False, None

    def _score_resource(
        self,
        resource: TrainingResource,
        priority_comp_id: str,
        priority_comp_name: str,
        priority_severity: str,
        priority_gap_num: float,
        state_map: Dict[str, OfficerCompetencyState],
        comp_name_map: Dict[str, str],
        bottleneck_comp_id: Optional[str],
        bottleneck_task_title: Optional[str],
        verified_comp_ids: set[str],
        constraints: TrainingConstraintInput,
        diagnosed_comp_ids: set[str],
    ) -> InterventionRecommendation:
        """Calculates transparent factor scores and generates human-readable explanations."""
        reasons: List[str] = []
        factor_breakdown: Dict[str, FactorScoreDetail] = {}

        w_comp = settings.OPTIMIZER_WEIGHT_COMPETENCY
        w_sub = settings.OPTIMIZER_WEIGHT_SUBSKILL
        w_gap = settings.OPTIMIZER_WEIGHT_GAP
        w_btlk = settings.OPTIMIZER_WEIGHT_BOTTLENECK
        w_pre = settings.OPTIMIZER_WEIGHT_PREREQUISITE
        w_cst = settings.OPTIMIZER_WEIGHT_CONSTRAINT
        w_prio = settings.OPTIMIZER_WEIGHT_PRIORITY

        aligned_comp_id = resource.competency_id
        aligned_comp_name = comp_name_map.get(aligned_comp_id, aligned_comp_id)

        # 1. Competency Alignment Score
        if aligned_comp_id == priority_comp_id:
            s_comp = 1.0
            reasons.append(f"Directly addresses verified priority gap in '{aligned_comp_name}'.")
        elif aligned_comp_id in diagnosed_comp_ids:
            s_comp = 0.8
            reasons.append(f"Aligns with diagnosed misconception domain in '{aligned_comp_name}'.")
        elif aligned_comp_id in state_map and (getattr(state_map[aligned_comp_id], "gap", 0.0) or 0.0) > 0.15:
            s_comp = 0.6
            reasons.append(f"Addresses moderate gap in '{aligned_comp_name}'.")
        else:
            s_comp = 0.3

        factor_breakdown["competency_alignment"] = FactorScoreDetail(
            raw_score=s_comp,
            weight=w_comp,
            weighted_score=round(s_comp * w_comp, 4),
            explanation=f"Alignment with officer competency profile: {s_comp:.1f}",
        )

        # 2. Subskill Alignment Score
        subskills_count = len(resource.subskills)
        if subskills_count > 0:
            s_sub = 0.9
            sample_sub = ", ".join(resource.subskills[:2])
            reasons.append(f"Covers key sub-skills: {sample_sub}.")
        else:
            s_sub = 0.5

        factor_breakdown["subskill_alignment"] = FactorScoreDetail(
            raw_score=s_sub,
            weight=w_sub,
            weighted_score=round(s_sub * w_sub, 4),
            explanation=f"Covers {subskills_count} targeted statistical sub-skills.",
        )

        # 3. Gap Relevance Score
        aligned_state = state_map.get(aligned_comp_id)
        aligned_gap = getattr(aligned_state, "gap", 0.0) or 0.0 if aligned_state else (priority_gap_num if aligned_comp_id == priority_comp_id else 0.2)
        s_gap = min(1.0, max(0.1, aligned_gap / 0.50))
        factor_breakdown["gap_relevance"] = FactorScoreDetail(
            raw_score=round(s_gap, 3),
            weight=w_gap,
            weighted_score=round(s_gap * w_gap, 4),
            explanation=f"Scaled to gap severity ({aligned_gap:.1%}).",
        )

        # 4. Task Bottleneck Relevance Score
        is_bottleneck = bool(bottleneck_comp_id and aligned_comp_id == bottleneck_comp_id)
        if is_bottleneck:
            s_btlk = 1.0
            task_name = bottleneck_task_title or "Assigned MoSPI Task"
            reasons.append(f"Priority bottleneck: Directly limits readiness for task '{task_name}'.")
        else:
            s_btlk = 0.0

        factor_breakdown["task_bottleneck_relevance"] = FactorScoreDetail(
            raw_score=s_btlk,
            weight=w_btlk,
            weighted_score=round(s_btlk * w_btlk, 4),
            explanation="Critical operational task readiness bottleneck." if is_bottleneck else "Not a current task bottleneck.",
        )

        # 5. Prerequisite Fit Score
        missing_prereqs: List[str] = []
        for req in resource.prerequisites:
            if req not in verified_comp_ids:
                req_state = state_map.get(req)
                obs_score = getattr(req_state, "current_level", None)
                if obs_score is None:
                    obs_score = getattr(req_state, "observed_score", 0.0) or 0.0
                if obs_score < 0.60:
                    missing_prereqs.append(comp_name_map.get(req, req))

        if not resource.prerequisites:
            s_pre = 1.0
            reasons.append("No prerequisite barriers; immediate entry available.")
        elif not missing_prereqs:
            s_pre = 1.0
            reasons.append(f"Officer satisfies all {len(resource.prerequisites)} prerequisite competency standards.")
        else:
            s_pre = 0.3

        factor_breakdown["prerequisite_fit"] = FactorScoreDetail(
            raw_score=s_pre,
            weight=w_pre,
            weighted_score=round(s_pre * w_pre, 4),
            explanation="Prerequisites satisfied." if not missing_prereqs else f"Missing prerequisites: {', '.join(missing_prereqs)}",
        )

        # 6. Constraint Fit Score
        s_cst = 1.0
        if constraints.max_duration_hours and resource.duration_hours <= constraints.max_duration_hours:
            reasons.append(f"Duration ({resource.duration_hours}h) fits maximum constraint ({constraints.max_duration_hours}h).")
        if constraints.preferred_delivery_modes and resource.delivery_mode in constraints.preferred_delivery_modes:
            reasons.append(f"Delivery mode '{resource.delivery_mode}' matches officer preference.")

        factor_breakdown["constraint_fit"] = FactorScoreDetail(
            raw_score=s_cst,
            weight=w_cst,
            weighted_score=round(s_cst * w_cst, 4),
            explanation="Complies with configured duration and delivery constraints.",
        )

        # 7. Programme Priority Score
        prio_map = {"mandatory": 1.0, "high": 0.8, "recommended": 0.6, "standard": 0.4}
        s_prio = prio_map.get(resource.programme_priority.lower(), 0.5)
        if resource.programme_priority in ["mandatory", "high"]:
            reasons.append(f"National Priority: Tagged as '{resource.programme_priority.upper()}' by {resource.provider.upper()}.")

        factor_breakdown["programme_priority"] = FactorScoreDetail(
            raw_score=s_prio,
            weight=w_prio,
            weighted_score=round(s_prio * w_prio, 4),
            explanation=f"Programme designated priority: {resource.programme_priority}.",
        )

        # Composite Score Calculation
        total_score = sum(f.weighted_score for f in factor_breakdown.values())

        resource_resp = TrainingResourceResponse(
            id=resource.id,
            provider=resource.provider,
            external_reference_id=resource.external_reference_id,
            title=resource.title,
            description=resource.description,
            competency_id=resource.competency_id,
            subskills=resource.subskills,
            prerequisites=resource.prerequisites,
            duration_hours=resource.duration_hours,
            delivery_mode=resource.delivery_mode,
            difficulty_level=resource.difficulty_level,
            programme_priority=resource.programme_priority,
            target_cadre=resource.target_cadre,
            syllabus_highlights=resource.syllabus_highlights,
            status=resource.status,
            is_mock=resource.is_mock,
            metadata_json=resource.metadata_json,
            created_at=resource.created_at,
            updated_at=resource.updated_at,
        )

        return InterventionRecommendation(
            resource=resource_resp,
            score=round(total_score, 4),
            reasons=reasons,
            addresses_priority_gap=(aligned_comp_id == priority_comp_id),
            aligned_competency_name=aligned_comp_name,
            addresses_task_bottleneck=is_bottleneck,
            bottleneck_task_title=bottleneck_task_title if is_bottleneck else None,
            satisfies_prerequisites=(len(missing_prereqs) == 0),
            missing_prerequisites=missing_prereqs,
            fits_constraints=True,
            factor_breakdown=factor_breakdown,
        )
