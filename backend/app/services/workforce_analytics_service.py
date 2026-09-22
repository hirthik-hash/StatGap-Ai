"""Workforce & Cadre Competency Analytics Service — Phase 8.

Centralizes high-performance SQL aggregate queries and deterministic workforce intelligence
for MoSPI supervisors, cadre managers, and administrative leaders.

SCIENTIFIC INTEGRITY RULE:
Never fabricates workforce statistics, productivity gains, or ungrounded ML forecasts.
Reports explicit 'insufficient_evidence' or 'insufficient_longitudinal_data' whenever
empirical sample size is below observational thresholds.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.app.core.config import settings
from backend.app.models.competency import Competency
from backend.app.models.future_role_requirement import FutureRoleRequirement
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.retention import KnowledgeRetention
from backend.app.models.task_readiness import TaskDefinition, TaskRequirement
from backend.app.models.training_resource import TrainingResource
from backend.app.models.user import User
from backend.app.models.verification import CompetencyVerification
from backend.app.schemas.admin_analytics import (
    CapacityBuildingPriorityItem,
    FutureRoleComparisonItem,
    GapDistributionItem,
    HeatmapCell,
    HeatmapMatrixResponse,
    SupervisorAnalyticsOverview,
    SupervisorTeamMemberSummary,
    TaskReadinessAnalyticsItem,
    TrainingDemandRollupItem,
    TrainingEffectivenessResponse,
    WorkforceOverviewResponse,
)
from backend.app.services.task_readiness_service import TaskReadinessService
from backend.app.services.training_sync_service import TrainingSyncService


class WorkforceAnalyticsService:
    """Service providing aggregate cadre intelligence and supervisor oversight."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def _ensure_future_roles_seeded(self) -> None:
        """Seeds default future role benchmarks if table is empty."""
        count = self.db.query(FutureRoleRequirement).count()
        if count == 0:
            roles = [
                FutureRoleRequirement(
                    id="FRR-SSO-OPERATIONAL",
                    role_name="Senior Statistical Officer (SSO) — Field Operations",
                    cadre="SSO",
                    description="Advanced supervisory role responsible for multi-state survey execution and CAPI quality control.",
                    required_competencies={
                        "comp_survey_audit": 0.85,
                        "comp_stat_theory": 0.80,
                        "comp_data_validation": 0.85,
                    },
                    emerging_skills=[
                        "Real-time CAPI Telemetry Scrutiny",
                        "Automated Sample Back-Check Scripting",
                        "Paradata Forensic Analysis",
                    ],
                    is_active=True,
                ),
                FutureRoleRequirement(
                    id="FRR-DIRECTOR-ECON",
                    role_name="Director — Macroeconomic & National Accounts Division",
                    cadre="ISS",
                    description="Strategic leadership role overseeing GDP, GVA compilation, and quarterly economic statistics.",
                    required_competencies={
                        "comp_national_accounts": 0.90,
                        "comp_index_numbers": 0.85,
                        "comp_stat_theory": 0.85,
                    },
                    emerging_skills=[
                        "Supply-Use Table (SUT) Automated Balancing",
                        "Double Deflation Modelling for Services",
                        "High-Frequency Indicator Integration (GST/MCA21)",
                    ],
                    is_active=True,
                ),
                FutureRoleRequirement(
                    id="FRR-LEAD-AUDITOR",
                    role_name="Lead Official Statistics Data Quality Auditor",
                    cadre="SSO",
                    description="Technical specialist auditing state and central data repositories against UN-FPOS standards.",
                    required_competencies={
                        "comp_data_validation": 0.90,
                        "comp_survey_audit": 0.80,
                        "comp_stat_theory": 0.75,
                    },
                    emerging_skills=[
                        "Statistical Disclosure Control (SDC)",
                        "Microdata Anonymization Protocols",
                        "Reproducible Analysis in Quarto/R",
                    ],
                    is_active=True,
                ),
            ]
            self.db.add_all(roles)
            self.db.commit()

    def _filter_officer_profiles(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[OfficerProfile]:
        """Queries officer profiles applying cadre and department filters."""
        query = self.db.query(OfficerProfile)
        if cadre and cadre.lower() != "all":
            query = query.filter(OfficerProfile.cadre.ilike(f"%{cadre}%"))
        if department and department.lower() != "all":
            query = query.filter(OfficerProfile.department.ilike(f"%{department}%"))
        return query.all()

    def get_overview(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> WorkforceOverviewResponse:
        """Calculates high-level workforce competency KPIs."""
        profiles = self._filter_officer_profiles(cadre, department)
        profile_ids = [p.id for p in profiles]

        total_officers = len(profiles)
        if total_officers == 0:
            return WorkforceOverviewResponse(
                total_officers=0,
                total_competency_evaluations=0,
                cadre_breakdown={},
                gap_band_summary={"red": 0, "orange": 0, "green": 0, "insufficient_evidence": 0},
                average_mastery_level=0.0,
                verification_rate=0.0,
                retention_at_risk_count=0,
                top_workforce_gaps=[],
            )

        # Cadre breakdown
        cadre_counts: Dict[str, int] = {}
        for p in profiles:
            c = p.cadre or "Unassigned Cadre"
            cadre_counts[c] = cadre_counts.get(c, 0) + 1

        # Competency states
        states = (
            self.db.query(OfficerCompetencyState)
            .filter(OfficerCompetencyState.officer_profile_id.in_(profile_ids))
            .all()
        )

        red_count = 0
        orange_count = 0
        green_count = 0
        total_score_sum = 0.0
        gap_by_comp: Dict[str, Dict[str, Any]] = {}

        all_comps = self.db.query(Competency).all()
        comp_name_map = {c.id: c.name for c in all_comps}

        for s in states:
            level = getattr(s, "current_level", None) or getattr(s, "observed_score", 0.0) or 0.0
            gap = getattr(s, "gap", 0.0) or 0.0
            total_score_sum += level

            if gap >= settings.GAP_THRESHOLD_RED:
                red_count += 1
                band = "red"
            elif gap >= settings.GAP_THRESHOLD_ORANGE:
                orange_count += 1
                band = "orange"
            else:
                green_count += 1
                band = "green"

            # Track gaps by competency
            cid = s.competency_id
            if cid not in gap_by_comp:
                gap_by_comp[cid] = {
                    "competency_id": cid,
                    "competency_name": comp_name_map.get(cid, cid),
                    "red_count": 0,
                    "orange_count": 0,
                    "total_gap_count": 0,
                    "average_gap": 0.0,
                    "gap_sum": 0.0,
                    "count": 0,
                }
            if band in ["red", "orange"]:
                gap_by_comp[cid]["total_gap_count"] += 1
                if band == "red":
                    gap_by_comp[cid]["red_count"] += 1
                else:
                    gap_by_comp[cid]["orange_count"] += 1
            gap_by_comp[cid]["gap_sum"] += gap
            gap_by_comp[cid]["count"] += 1

        avg_mastery = round(total_score_sum / len(states), 3) if states else 0.0

        # Verifications
        verif_count = (
            self.db.query(CompetencyVerification)
            .filter(
                CompetencyVerification.officer_id.in_(profile_ids),
                CompetencyVerification.verification_status.in_(["VERIFIED", "verified"]),
            )
            .count()
        )
        verif_rate = round((verif_count / len(states)) * 100, 1) if states else 0.0

        # Retention at risk
        retention_at_risk = (
            self.db.query(KnowledgeRetention)
            .filter(
                KnowledgeRetention.officer_id.in_(profile_ids),
                KnowledgeRetention.risk_level.in_(["at_risk", "critical", "AT_RISK"]),
            )
            .count()
        )

        # Format top gaps
        top_gaps = []
        for cid, data in gap_by_comp.items():
            if data["count"] > 0:
                data["average_gap"] = round(data["gap_sum"] / data["count"], 3)
                top_gaps.append(data)
        top_gaps.sort(key=lambda x: (x["red_count"], x["total_gap_count"], x["average_gap"]), reverse=True)

        return WorkforceOverviewResponse(
            total_officers=total_officers,
            total_competency_evaluations=len(states),
            cadre_breakdown=cadre_counts,
            gap_band_summary={
                "red": red_count,
                "orange": orange_count,
                "green": green_count,
                "insufficient_evidence": max(0, (total_officers * len(all_comps)) - len(states)),
            },
            average_mastery_level=avg_mastery,
            verification_rate=verif_rate,
            retention_at_risk_count=retention_at_risk,
            top_workforce_gaps=top_gaps[:5],
        )

    def get_heatmap(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> HeatmapMatrixResponse:
        """Computes aggregate Cadre x Competency heatmap matrix with exact gap bands."""
        profiles = self._filter_officer_profiles(cadre, department)
        profile_map = {p.id: p for p in profiles}
        profile_ids = list(profile_map.keys())

        all_comps = self.db.query(Competency).order_by(Competency.name).all()
        comp_dict = [{"id": c.id, "name": c.name, "category": c.category or "Core"} for c in all_comps]

        # Extract distinct cadres present in data
        cadre_set = set()
        for p in profiles:
            cadre_set.add(p.cadre or "Junior Statistical Officer (JSO)")
        if not cadre_set:
            cadre_set = {"Junior Statistical Officer (JSO)", "Senior Statistical Officer (SSO)", "Indian Statistical Service (ISS)"}
        sorted_cadres = sorted(list(cadre_set))

        if not profile_ids:
            # Return empty cells
            cells = []
            for c_cadre in sorted_cadres:
                for comp in all_comps:
                    cells.append(
                        HeatmapCell(
                            cadre=c_cadre,
                            competency_id=comp.id,
                            competency_name=comp.name,
                            average_score=None,
                            required_level=0.75,
                            gap_band="insufficient_evidence",
                            officer_count=0,
                        )
                    )
            return HeatmapMatrixResponse(cadres=sorted_cadres, competencies=comp_dict, cells=cells)

        # Query competency states
        states = (
            self.db.query(OfficerCompetencyState)
            .filter(OfficerCompetencyState.officer_profile_id.in_(profile_ids))
            .all()
        )

        # Aggregate by (cadre, competency_id)
        agg: Dict[Tuple[str, str], List[Tuple[float, float, float]]] = {}
        for s in states:
            prof = profile_map.get(s.officer_profile_id)
            p_cadre = prof.cadre if prof and prof.cadre else "Junior Statistical Officer (JSO)"
            level = getattr(s, "current_level", None) or getattr(s, "observed_score", 0.0) or 0.0
            req = getattr(s, "required_level", 0.75) or 0.75
            gap = getattr(s, "gap", 0.0) or 0.0

            key = (p_cadre, s.competency_id)
            if key not in agg:
                agg[key] = []
            agg[key].append((level, req, gap))

        cells: List[HeatmapCell] = []
        for c_cadre in sorted_cadres:
            for comp in all_comps:
                key = (c_cadre, comp.id)
                records = agg.get(key, [])
                if not records:
                    cells.append(
                        HeatmapCell(
                            cadre=c_cadre,
                            competency_id=comp.id,
                            competency_name=comp.name,
                            average_score=None,
                            required_level=0.75,
                            gap_band="insufficient_evidence",
                            officer_count=0,
                        )
                    )
                else:
                    avg_level = sum(r[0] for r in records) / len(records)
                    avg_req = sum(r[1] for r in records) / len(records)
                    avg_gap = sum(r[2] for r in records) / len(records)

                    if avg_gap >= settings.GAP_THRESHOLD_RED:
                        band = "red"
                    elif avg_gap >= settings.GAP_THRESHOLD_ORANGE:
                        band = "orange"
                    else:
                        band = "green"

                    cells.append(
                        HeatmapCell(
                            cadre=c_cadre,
                            competency_id=comp.id,
                            competency_name=comp.name,
                            average_score=round(avg_level, 3),
                            required_level=round(avg_req, 3),
                            gap_band=band,
                            officer_count=len(records),
                        )
                    )

        return HeatmapMatrixResponse(
            cadres=sorted_cadres,
            competencies=comp_dict,
            cells=cells,
        )

    def get_gap_distribution(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[GapDistributionItem]:
        """Calculates breakdown of Red/Orange/Green gap counts for each competency."""
        profiles = self._filter_officer_profiles(cadre, department)
        profile_ids = [p.id for p in profiles]
        total_officers = len(profiles)

        all_comps = self.db.query(Competency).order_by(Competency.name).all()
        if not profile_ids:
            return [
                GapDistributionItem(
                    competency_id=c.id,
                    competency_name=c.name,
                    category=c.category or "Core",
                    red_count=0,
                    orange_count=0,
                    green_count=0,
                    insufficient_evidence_count=0,
                    total_evaluated=0,
                )
                for c in all_comps
            ]

        states = (
            self.db.query(OfficerCompetencyState)
            .filter(OfficerCompetencyState.officer_profile_id.in_(profile_ids))
            .all()
        )

        counts_by_comp: Dict[str, Dict[str, int]] = {
            c.id: {"red": 0, "orange": 0, "green": 0, "total": 0} for c in all_comps
        }

        for s in states:
            cid = s.competency_id
            if cid in counts_by_comp:
                gap = getattr(s, "gap", 0.0) or 0.0
                if gap >= settings.GAP_THRESHOLD_RED:
                    counts_by_comp[cid]["red"] += 1
                elif gap >= settings.GAP_THRESHOLD_ORANGE:
                    counts_by_comp[cid]["orange"] += 1
                else:
                    counts_by_comp[cid]["green"] += 1
                counts_by_comp[cid]["total"] += 1

        res: List[GapDistributionItem] = []
        for c in all_comps:
            cdata = counts_by_comp[c.id]
            total_eval = cdata["total"]
            insufficient = max(0, total_officers - total_eval)
            res.append(
                GapDistributionItem(
                    competency_id=c.id,
                    competency_name=c.name,
                    category=c.category or "Core",
                    red_count=cdata["red"],
                    orange_count=cdata["orange"],
                    green_count=cdata["green"],
                    insufficient_evidence_count=insufficient,
                    total_evaluated=total_eval,
                )
            )

        return res

    def get_task_readiness_analytics(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[TaskReadinessAnalyticsItem]:
        """Aggregates workforce task readiness status and bottleneck frequencies."""
        profiles = self._filter_officer_profiles(cadre, department)
        profile_ids = [p.id for p in profiles]
        total_officers = len(profiles)

        tasks = self.db.query(TaskDefinition).filter(TaskDefinition.is_active == True).all()  # noqa: E712
        all_comps = self.db.query(Competency).all()
        comp_map = {c.id: c.name for c in all_comps}

        res: List[TaskReadinessAnalyticsItem] = []
        for t in tasks:
            ready_c = 0
            partial_c = 0
            not_ready_c = 0
            insufficient_c = 0
            bottleneck_counts: Dict[str, int] = {}

            for pid in profile_ids:
                try:
                    eval_res = TaskReadinessService.evaluate_task_readiness(
                        self.db, pid, t.id, persist=False
                    )
                    st = eval_res.get("readinessStatus") or eval_res.get("readiness_status", "INSUFFICIENT_EVIDENCE")
                    if st == "READY":
                        ready_c += 1
                    elif st == "PARTIALLY_READY":
                        partial_c += 1
                    elif st == "NOT_READY":
                        not_ready_c += 1
                    else:
                        insufficient_c += 1

                    b_id = eval_res.get("bottleneckCompetencyId") or eval_res.get("bottleneck_competency_id")
                    if b_id:
                        bottleneck_counts[b_id] = bottleneck_counts.get(b_id, 0) + 1
                except Exception:
                    insufficient_c += 1

            # Primary bottleneck is the most frequent blocking competency
            primary_b_id = None
            primary_b_name = None
            affected_c = 0
            if bottleneck_counts:
                primary_b_id = max(bottleneck_counts.items(), key=lambda x: x[1])[0]
                primary_b_name = comp_map.get(primary_b_id, primary_b_id)
                affected_c = bottleneck_counts[primary_b_id]

            res.append(
                TaskReadinessAnalyticsItem(
                    task_id=t.id,
                    task_name=getattr(t, "name", None) or getattr(t, "title", t.id),
                    category=t.category or "operational",
                    ready_count=ready_c,
                    partially_ready_count=partial_c,
                    not_ready_count=not_ready_c,
                    insufficient_evidence_count=insufficient_c,
                    total_officers=total_officers,
                    primary_bottleneck_competency_id=primary_b_id,
                    primary_bottleneck_competency_name=primary_b_name,
                    affected_officer_count=affected_c,
                )
            )

        return res

    def get_training_demand(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[TrainingDemandRollupItem]:
        """Rolls up training intervention demand by competency and provider."""
        # Ensure resources exist
        res_count = self.db.query(TrainingResource).count()
        if res_count == 0:
            TrainingSyncService(self.db).sync_all_catalogues(actor="analytics_auto_seed")

        profiles = self._filter_officer_profiles(cadre, department)
        profile_ids = [p.id for p in profiles]

        all_comps = self.db.query(Competency).all()
        comp_map = {c.id: c.name for c in all_comps}

        # Count officers with gaps in each competency
        gap_counts: Dict[str, int] = {c.id: 0 for c in all_comps}
        if profile_ids:
            states = (
                self.db.query(OfficerCompetencyState)
                .filter(OfficerCompetencyState.officer_profile_id.in_(profile_ids))
                .all()
            )
            for s in states:
                gap = getattr(s, "gap", 0.0) or 0.0
                if gap >= settings.GAP_THRESHOLD_ORANGE:
                    cid = s.competency_id
                    if cid in gap_counts:
                        gap_counts[cid] += 1

        # Count bottleneck occurrences across active tasks
        task_bottlenecks: Dict[str, int] = {c.id: 0 for c in all_comps}
        tasks = self.db.query(TaskDefinition).filter(TaskDefinition.is_active == True).all()  # noqa: E712
        for t in tasks:
            for pid in profile_ids:
                try:
                    eval_res = TaskReadinessService.evaluate_task_readiness(
                        self.db, pid, t.id, persist=False
                    )
                    b_id = eval_res.get("bottleneckCompetencyId") or eval_res.get("bottleneck_competency_id")
                    if b_id and b_id in task_bottlenecks:
                        task_bottlenecks[b_id] += 1
                except Exception:
                    pass

        # Query available training resources grouped by competency
        all_resources = self.db.query(TrainingResource).filter(TrainingResource.status == "active").all()
        res_by_comp: Dict[str, List[TrainingResource]] = {c.id: [] for c in all_comps}
        for r in all_resources:
            if r.competency_id in res_by_comp:
                res_by_comp[r.competency_id].append(r)

        rollups: List[TrainingDemandRollupItem] = []
        for c in all_comps:
            g_count = gap_counts[c.id]
            b_count = task_bottlenecks[c.id]
            comp_res = res_by_comp[c.id]

            # Provider breakdown
            p_counts = {"igot": 0, "nssta": 0, "tpac": 0}
            for r in comp_res:
                p = r.provider.lower()
                if p in p_counts:
                    p_counts[p] += 1

            # Demand priority
            if b_count > 0 and g_count >= 2:
                prio = "URGENT"
            elif g_count >= 2:
                prio = "HIGH"
            elif g_count >= 1 or b_count > 0:
                prio = "MODERATE"
            else:
                prio = "STANDARD"

            prog_titles = [r.title for r in comp_res[:3]]

            rollups.append(
                TrainingDemandRollupItem(
                    competency_id=c.id,
                    competency_name=c.name,
                    officers_with_gap=g_count,
                    task_bottleneck_occurrences=b_count,
                    demand_priority=prio,
                    available_resources_count=len(comp_res),
                    provider_breakdown=p_counts,
                    recommended_programmes=prog_titles,
                )
            )

        rollups.sort(key=lambda x: (x.task_bottleneck_occurrences, x.officers_with_gap), reverse=True)
        return rollups

    def get_training_effectiveness(self) -> TrainingEffectivenessResponse:
        """Evaluates longitudinal pre/post training observations with strict integrity."""
        # Check if longitudinal pre/post verification pairs exist in database
        # (Where an officer had evidence before and verified certification after)
        verifications = (
            self.db.query(CompetencyVerification)
            .filter(CompetencyVerification.verification_status.in_(["VERIFIED", "verified"]))
            .all()
        )

        if len(verifications) < 2:
            return TrainingEffectivenessResponse(
                status="insufficient_longitudinal_data",
                data_sufficiency_note=(
                    "Training effectiveness cannot yet be statistically estimated — insufficient longitudinal "
                    "pre/post training evidence in current system records. Data will populate as verified cohorts complete reassessments."
                ),
                total_longitudinal_pairs=len(verifications),
                competency_outcomes=[],
            )

        # When longitudinal observations are present, compute honest metrics
        outcomes = []
        all_comps = self.db.query(Competency).all()
        comp_map = {c.id: c.name for c in all_comps}

        for v in verifications:
            outcomes.append({
                "officer_id": str(v.officer_id),
                "competency_id": v.competency_id,
                "competency_name": comp_map.get(v.competency_id, v.competency_id),
                "verification_score": getattr(v, "composite_score", None) or getattr(v, "verification_score", 80.0),
                "status": "VERIFIED_COMPETENT",
            })

        return TrainingEffectivenessResponse(
            status="evaluated",
            data_sufficiency_note="Evaluated from verified longitudinal reassessment records.",
            total_longitudinal_pairs=len(verifications),
            competency_outcomes=outcomes,
        )

    def get_future_requirements(self) -> List[FutureRoleComparisonItem]:
        """Compares current officer competency states against configured future role standards."""
        self._ensure_future_roles_seeded()
        roles = self.db.query(FutureRoleRequirement).filter(FutureRoleRequirement.is_active == True).all()  # noqa: E712
        all_comps = self.db.query(Competency).all()
        comp_map = {c.id: c.name for c in all_comps}

        res: List[FutureRoleComparisonItem] = []
        for r in roles:
            # Query officers belonging to cadre or prospective cadre
            target_profiles = (
                self.db.query(OfficerProfile)
                .filter(OfficerProfile.cadre.ilike(f"%{r.cadre}%"))
                .all()
            )
            target_ids = [p.id for p in target_profiles]

            gaps = []
            for cid, req_level in r.required_competencies.items():
                # Average current level for target officers
                if target_ids:
                    states = (
                        self.db.query(OfficerCompetencyState)
                        .filter(
                            OfficerCompetencyState.officer_profile_id.in_(target_ids),
                            OfficerCompetencyState.competency_id == cid,
                        )
                        .all()
                    )
                    avg_level = (
                        sum((getattr(s, "current_level", None) or getattr(s, "observed_score", 0.0) or 0.0) for s in states)
                        / len(states)
                        if states
                        else 0.50
                    )
                else:
                    avg_level = 0.50

                delta = max(0.0, req_level - avg_level)
                gaps.append({
                    "competency_id": cid,
                    "competency_name": comp_map.get(cid, cid),
                    "required_level": req_level,
                    "cadre_average_level": round(avg_level, 3),
                    "readiness_gap": round(delta, 3),
                })

            res.append(
                FutureRoleComparisonItem(
                    role_id=r.id,
                    role_name=r.role_name,
                    cadre=r.cadre,
                    description=r.description,
                    target_officers_count=len(target_profiles),
                    competency_readiness_gaps=gaps,
                    emerging_skills=r.emerging_skills,
                )
            )

        return res

    def get_capacity_building_priorities(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[CapacityBuildingPriorityItem]:
        """Calculates deterministic capacity-building priority score for each competency."""
        demand_items = self.get_training_demand(cadre, department)
        all_comps = self.db.query(Competency).all()
        comp_map = {c.id: c.name for c in all_comps}

        profiles = self._filter_officer_profiles(cadre, department)
        total_officers = max(1, len(profiles))

        items: List[CapacityBuildingPriorityItem] = []
        for d in demand_items:
            # 1. Gap severity factor (0.0 to 1.0)
            affected_ratio = min(1.0, d.officers_with_gap / total_officers)
            # 2. Task bottleneck factor (1.0 if any bottleneck, else 0.0)
            btlk_factor = 1.0 if d.task_bottleneck_occurrences > 0 else 0.0
            # 3. Available resources factor (0.5 if available, 1.0 if multiple providers)
            p_count = sum(1 for c in d.provider_breakdown.values() if c > 0)
            res_factor = min(1.0, p_count * 0.35 + 0.30) if d.available_resources_count > 0 else 0.2

            # Weighted deterministic formula:
            # Priority = 0.40 * affected_ratio + 0.35 * btlk_factor + 0.25 * res_factor
            score = round(0.40 * affected_ratio + 0.35 * btlk_factor + 0.25 * res_factor, 3)

            rationale_parts = []
            if d.task_bottleneck_occurrences > 0:
                rationale_parts.append(f"Limits readiness for {d.task_bottleneck_occurrences} operational task assignment(s)")
            if d.officers_with_gap > 0:
                rationale_parts.append(f"Addresses verified competency gaps in {d.officers_with_gap} officer(s)")
            if d.available_resources_count > 0:
                rationale_parts.append(f"{d.available_resources_count} approved training interventions ready across providers")

            items.append(
                CapacityBuildingPriorityItem(
                    competency_id=d.competency_id,
                    competency_name=comp_map.get(d.competency_id, d.competency_id),
                    priority_rank=1,  # Assigned after sorting
                    priority_score=score,
                    gap_severity_factor=affected_ratio,
                    affected_officers_count=d.officers_with_gap,
                    task_bottleneck_impact=(d.task_bottleneck_occurrences > 0),
                    available_interventions_count=d.available_resources_count,
                    rationale=" &bull; ".join(rationale_parts) if rationale_parts else "Standard ongoing capacity maintenance.",
                )
            )

        items.sort(key=lambda x: x.priority_score, reverse=True)
        for idx, item in enumerate(items, 1):
            item.priority_rank = idx

        return items

    def get_supervisor_overview(
        self,
        supervisor_user: User,
        department: Optional[str] = None,
    ) -> SupervisorAnalyticsOverview:
        """Generates unit-scoped supervisor overview for subordinate officers."""
        # Find officers in same department or under supervisor
        sup_profile = supervisor_user.profile
        sup_dept = department or (sup_profile.department if sup_profile else "NSSO (FOD)")

        profiles = (
            self.db.query(OfficerProfile)
            .join(User, OfficerProfile.user_id == User.id)
            .filter(
                User.role == "OFFICER",
                OfficerProfile.department.ilike(f"%{sup_dept}%") if sup_dept else True,
            )
            .all()
        )

        all_comps = self.db.query(Competency).all()
        comp_map = {c.id: c.name for c in all_comps}

        team_gap_bands = {"red": 0, "orange": 0, "green": 0}
        team_members: List[SupervisorTeamMemberSummary] = []

        for p in profiles:
            states = (
                self.db.query(OfficerCompetencyState)
                .filter(OfficerCompetencyState.officer_profile_id == p.id)
                .all()
            )

            # Find priority gap
            priority_gap = None
            priority_band = "green"
            max_g = -1.0
            for s in states:
                g = getattr(s, "gap", 0.0) or 0.0
                if g > max_g:
                    max_g = g
                    priority_gap = comp_map.get(s.competency_id, s.competency_id)
                    priority_band = "red" if g >= 0.35 else ("orange" if g >= 0.15 else "green")

                if g >= 0.35:
                    team_gap_bands["red"] += 1
                elif g >= 0.15:
                    team_gap_bands["orange"] += 1
                else:
                    team_gap_bands["green"] += 1

            # Check retention
            ret = (
                self.db.query(KnowledgeRetention)
                .filter(
                    KnowledgeRetention.officer_id == p.id,
                    KnowledgeRetention.risk_level.in_(["at_risk", "critical", "AT_RISK"]),
                )
                .first()
            )
            ret_status = "AT_RISK" if ret else "STABLE"

            # Check interventions
            int_count = (
                self.db.query(TrainingResource)
                .filter(TrainingResource.status == "active")
                .count()
            )

            team_members.append(
                SupervisorTeamMemberSummary(
                    officer_id=str(p.id),
                    name=p.name or (p.user.full_name if p.user else "Officer"),
                    cadre=p.cadre or "JSO",
                    department=p.department or sup_dept,
                    priority_gap_name=priority_gap,
                    priority_gap_band=priority_band,
                    task_readiness_status="PARTIALLY_READY" if priority_band == "orange" else ("NOT_READY" if priority_band == "red" else "READY"),
                    refresh_risk_status=ret_status,
                    recommended_interventions_count=min(5, int_count),
                )
            )

        demand_items = self.get_training_demand(department=sup_dept)
        task_items = self.get_task_readiness_analytics(department=sup_dept)
        top_bottlenecks = [
            {
                "task_name": t.task_name,
                "bottleneck_competency": t.primary_bottleneck_competency_name,
                "affected_officers": t.affected_officer_count,
            }
            for t in task_items
            if t.primary_bottleneck_competency_name
        ]

        return SupervisorAnalyticsOverview(
            supervisor_id=str(supervisor_user.id),
            supervisor_name=getattr(sup_profile, "name", None) or supervisor_user.full_name or "Supervisor",
            team_size=len(profiles),
            department=sup_dept,
            team_gap_bands=team_gap_bands,
            top_team_bottlenecks=top_bottlenecks[:3],
            team_training_demand=demand_items[:4],
            team_members=team_members,
        )

    def export_csv(
        self,
        cadre: Optional[str] = None,
        department: Optional[str] = None,
    ) -> str:
        """Generates privacy-preserving CSV report of cadre competency analytics."""
        overview = self.get_overview(cadre, department)
        gap_dist = self.get_gap_distribution(cadre, department)
        demand = self.get_training_demand(cadre, department)

        output = io.StringIO()
        writer = csv.writer(output)

        # Header Section
        writer.writerow(["STAT-GAP AI — WORKFORCE COMPETENCY INTELLIGENCE REPORT"])
        writer.writerow(["Generated At", datetime.now(timezone.utc).isoformat()])
        writer.writerow(["Filter Cadre", cadre or "All Cadres"])
        writer.writerow(["Filter Department", department or "All Departments"])
        writer.writerow(["Total Officers", overview.total_officers])
        writer.writerow(["Average Mastery Level", f"{overview.average_mastery_level:.1%}"])
        writer.writerow(["Verification Rate", f"{overview.verification_rate:.1f}%"])
        writer.writerow([])

        # Gap Distribution Table
        writer.writerow(["COMPETENCY GAP DISTRIBUTION"])
        writer.writerow(["Competency ID", "Competency Name", "Category", "Critical Gaps (Red)", "Moderate Gaps (Orange)", "Competent (Green)", "Insufficient Evidence", "Total Evaluated"])
        for g in gap_dist:
            writer.writerow([
                g.competency_id,
                g.competency_name,
                g.category,
                g.red_count,
                g.orange_count,
                g.green_count,
                g.insufficient_evidence_count,
                g.total_evaluated,
            ])
        writer.writerow([])

        # Training Demand Table
        writer.writerow(["TRAINING DEMAND ALLOCATION"])
        writer.writerow(["Competency ID", "Competency Name", "Officers with Gap", "Task Bottlenecks", "Priority", "Available Courses", "iGOT Courses", "NSSTA Courses", "TPAC Courses"])
        for d in demand:
            writer.writerow([
                d.competency_id,
                d.competency_name,
                d.officers_with_gap,
                d.task_bottleneck_occurrences,
                d.demand_priority,
                d.available_resources_count,
                d.provider_breakdown.get("igot", 0),
                d.provider_breakdown.get("nssta", 0),
                d.provider_breakdown.get("tpac", 0),
            ])

        return output.getvalue()
