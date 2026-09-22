"""Task Readiness Service — Phase 6.

Evaluates whether an officer currently has the required competencies
to perform a defined operational task.

Task Readiness does NOT:
  - Grant operational clearances
  - Certify officers for deployment
  - Make authoritative HR decisions

Task Readiness DOES:
  - Identify competency gaps blocking task performance
  - Highlight bottleneck competencies
  - Evaluate dependency satisfaction from the Phase 3 knowledge graph
  - Support What-If simulation for hypothetical competency changes

NOTE ON SCIENTIFIC HONESTY:
    Readiness status is derived from prototype competency estimates.
    It reflects the current modeled state, not empirically validated job performance.
    All thresholds are configurable policy parameters, not validated standards.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.competency import Competency
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.structured_evidence import StructuredEvidence
from backend.app.models.task_readiness import (
    TaskDefinition,
    TaskReadinessEvaluation,
    TaskRequirement,
)
from backend.app.services.evaluation_service import CompetencyEvaluationService


# ---------------------------------------------------------------------------
# Readiness Status Constants
# ---------------------------------------------------------------------------
READY = "READY"
PARTIALLY_READY = "PARTIALLY_READY"
NOT_READY = "NOT_READY"
INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class TaskReadinessService:

    @classmethod
    def _get_officer_competency_level(
        cls,
        db: Session,
        officer_profile_id: int,
        competency_id: str,
    ) -> Tuple[Optional[float], bool]:
        """Returns (current_level, has_sufficient_evidence).

        Reads from OfficerCompetencyState if available (persisted by DigitalTwinService),
        or falls back to StructuredEvidence direct calculation.

        Returns (None, False) when no evidence at all exists.
        """
        # Try persisted state first (populated by DigitalTwinService)
        state = (
            db.query(OfficerCompetencyState)
            .filter(
                OfficerCompetencyState.officer_profile_id == officer_profile_id,
                OfficerCompetencyState.competency_id == competency_id,
            )
            .first()
        )
        if state:
            has_evidence = (state.evidence_count or 0) >= settings.TASK_READINESS_MIN_EVIDENCE_COUNT
            return state.current_level, has_evidence

        # Fallback: count StructuredEvidence records
        count = (
            db.query(StructuredEvidence)
            .filter(
                StructuredEvidence.officer_profile_id == officer_profile_id,
                StructuredEvidence.competency_id == competency_id,
                StructuredEvidence.validity_status == "VALID",
            )
            .count()
        )
        if count == 0:
            return None, False

        # Minimal calculation from evidence
        records = (
            db.query(StructuredEvidence)
            .filter(
                StructuredEvidence.officer_profile_id == officer_profile_id,
                StructuredEvidence.competency_id == competency_id,
                StructuredEvidence.validity_status == "VALID",
            )
            .all()
        )
        scores = [
            CompetencyEvaluationService.normalize_score(r.normalized_score or r.raw_score)
            for r in records
        ]
        avg = sum(scores) / len(scores) if scores else 0.0
        return round(avg, 4), count >= settings.TASK_READINESS_MIN_EVIDENCE_COUNT

    @classmethod
    def _evaluate_single_requirement(
        cls,
        db: Session,
        officer_profile_id: int,
        req: TaskRequirement,
    ) -> Dict[str, Any]:
        """Evaluates a single task requirement against the officer's current state.

        Returns a requirement detail dict suitable for the evaluation_detail JSON.
        """
        current_level, has_evidence = cls._get_officer_competency_level(
            db, officer_profile_id, req.competency_id
        )

        if not has_evidence or current_level is None:
            return {
                "competency_id": req.competency_id,
                "competency_name": req.competency.name if req.competency else req.competency_id,
                "required_level": req.required_level,
                "current_level": None,
                "gap": None,
                "is_critical": req.is_critical,
                "status": "INSUFFICIENT_EVIDENCE",
                "satisfied": False,
                "notes": req.notes,
            }

        gap = req.required_level - current_level
        # A requirement is satisfied when the gap is within the tolerance
        satisfied = gap <= settings.TASK_READINESS_GAP_TOLERANCE

        status = "SATISFIED" if satisfied else "GAP"

        return {
            "competency_id": req.competency_id,
            "competency_name": req.competency.name if req.competency else req.competency_id,
            "required_level": req.required_level,
            "current_level": round(current_level, 4),
            "gap": round(max(0.0, gap), 4),
            "is_critical": req.is_critical,
            "status": status,
            "satisfied": satisfied,
            "notes": req.notes,
        }

    @classmethod
    def evaluate_task_readiness(
        cls,
        db: Session,
        officer_profile_id: int,
        task_id: str,
        persist: bool = True,
    ) -> Dict[str, Any]:
        """Evaluates task readiness for an officer against all task requirements.

        Readiness logic (all configurable):
          READY:                All requirements satisfied, sufficient evidence.
          PARTIALLY_READY:      Some requirements satisfied; unsatisfied are non-critical only.
          NOT_READY:            One or more CRITICAL requirements unmet.
          INSUFFICIENT_EVIDENCE: Evidence insufficient for >= 1 requirement.

        Args:
            db:                  Database session.
            officer_profile_id:  Officer profile ID.
            task_id:             Task definition ID.
            persist:             If True, saves evaluation to task_readiness_evaluations table.

        Returns:
            Dict with readiness_status, requirement details, bottleneck, etc.

        IMPORTANT: This method does NOT mutate officer competency data.
        """
        task = db.query(TaskDefinition).filter(TaskDefinition.id == task_id).first()
        if not task:
            raise ValueError(f"Task '{task_id}' not found")

        requirements = (
            db.query(TaskRequirement)
            .filter(TaskRequirement.task_id == task_id)
            .all()
        )

        if not requirements:
            return {
                "taskId": task_id,
                "taskName": task.name,
                "readiness_status": INSUFFICIENT_EVIDENCE,
                "readinessStatus": INSUFFICIENT_EVIDENCE,
                "requirements_met": 0,
                "requirements_total": 0,
                "bottleneckCompetencyId": None,
                "bottleneckCompetencyName": None,
                "requirementDetails": [],
                "disclaimer": (
                    "No competency requirements defined for this task. "
                    "Readiness cannot be determined."
                ),
                "isSimulation": False,
            }

        # Evaluate all requirements
        req_details: List[Dict[str, Any]] = []
        for req in requirements:
            detail = cls._evaluate_single_requirement(db, officer_profile_id, req)
            req_details.append(detail)

        # Classify overall status
        has_insufficient = any(d["status"] == "INSUFFICIENT_EVIDENCE" for d in req_details)
        critical_unmet = [
            d for d in req_details
            if d["is_critical"] and not d["satisfied"] and d["status"] != "INSUFFICIENT_EVIDENCE"
        ]
        any_unmet = [d for d in req_details if not d["satisfied"]]
        met_count = sum(1 for d in req_details if d["satisfied"])

        if has_insufficient:
            status = INSUFFICIENT_EVIDENCE
        elif critical_unmet:
            status = NOT_READY
        elif any_unmet:
            status = PARTIALLY_READY
        else:
            status = READY

        # Identify primary bottleneck (largest gap among unmet critical, else largest unmet)
        bottleneck_detail = None
        unsatisfied_with_data = [
            d for d in req_details
            if not d["satisfied"] and d["gap"] is not None
        ]
        if unsatisfied_with_data:
            # Prioritize critical bottlenecks
            critical_unsat = [d for d in unsatisfied_with_data if d["is_critical"]]
            pool = critical_unsat if critical_unsat else unsatisfied_with_data
            bottleneck_detail = max(pool, key=lambda d: d["gap"])

        bottleneck_competency_id = bottleneck_detail["competency_id"] if bottleneck_detail else None
        bottleneck_competency_name = bottleneck_detail["competency_name"] if bottleneck_detail else None

        evaluation_detail = {
            "requirements": req_details,
            "summary": {
                "met": met_count,
                "total": len(requirements),
                "insufficient_evidence_count": sum(1 for d in req_details if d["status"] == "INSUFFICIENT_EVIDENCE"),
                "critical_unmet_count": len(critical_unmet),
            },
        }

        if persist:
            eval_record = TaskReadinessEvaluation(
                officer_profile_id=officer_profile_id,
                task_id=task_id,
                readiness_status=status,
                requirements_met=met_count,
                requirements_total=len(requirements),
                bottleneck_competency_id=bottleneck_competency_id,
                evaluation_detail=evaluation_detail,
                evaluated_at=datetime.now(timezone.utc),
            )
            db.add(eval_record)

            audit_event = CompetencyAuditEvent(
                officer_id=officer_profile_id,
                event_type="task_readiness_evaluated",
                actor="system",
                event_data={
                    "task_id": task_id,
                    "task_name": task.name,
                    "readiness_status": status,
                    "requirements_met": met_count,
                    "requirements_total": len(requirements),
                },
                timestamp=datetime.now(timezone.utc),
            )
            db.add(audit_event)
            db.commit()

        return {
            "taskId": task_id,
            "taskName": task.name,
            "taskDescription": task.description,
            "taskCategory": task.category,
            "readiness_status": status,
            "readinessStatus": status,
            "requirements_met": met_count,
            "requirements_total": len(requirements),
            "bottleneckCompetencyId": bottleneck_competency_id,
            "bottleneckCompetencyName": bottleneck_competency_name,
            "requirementDetails": req_details,
            "evaluationSummary": evaluation_detail["summary"],
            "disclaimer": (
                "PROTOTYPE INDICATOR: Task readiness reflects modelled competency estimates only. "
                "It is NOT an authoritative operational clearance or HR decision."
            ),
            "isSimulation": False,
        }

    @classmethod
    def simulate_what_if_readiness(
        cls,
        db: Session,
        officer_profile_id: int,
        task_id: str,
        hypothetical_changes: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        """Simulates task readiness if the officer's competency levels were hypothetically changed.

        Args:
            db:                    Database session.
            officer_profile_id:    Officer profile ID.
            task_id:               Task definition ID.
            hypothetical_changes:  List of {competency_id: str, hypothetical_level: float}.

        CRITICAL SAFETY RULE:
            This method operates entirely on in-memory copies.
            It NEVER modifies the database or any authoritative officer state.

        Returns:
            Dict with baseline readiness, simulated readiness, and change comparison.
        """
        task = db.query(TaskDefinition).filter(TaskDefinition.id == task_id).first()
        if not task:
            raise ValueError(f"Task '{task_id}' not found")

        requirements = (
            db.query(TaskRequirement)
            .filter(TaskRequirement.task_id == task_id)
            .all()
        )

        # Build hypothesis map
        hyp_map: Dict[str, float] = {
            ch["competency_id"]: max(0.0, min(1.0, float(ch["hypothetical_level"])))
            for ch in hypothetical_changes
            if "competency_id" in ch and "hypothetical_level" in ch
        }

        def _eval_req_with_override(req: TaskRequirement, override_level: Optional[float]) -> Dict[str, Any]:
            if override_level is not None:
                current_level = override_level
                has_evidence = True
            else:
                current_level, has_evidence = cls._get_officer_competency_level(
                    db, officer_profile_id, req.competency_id
                )

            if not has_evidence or current_level is None:
                return {
                    "competency_id": req.competency_id,
                    "competency_name": req.competency.name if req.competency else req.competency_id,
                    "required_level": req.required_level,
                    "current_level": None,
                    "gap": None,
                    "is_critical": req.is_critical,
                    "status": "INSUFFICIENT_EVIDENCE",
                    "satisfied": False,
                }

            gap = req.required_level - current_level
            satisfied = gap <= settings.TASK_READINESS_GAP_TOLERANCE
            return {
                "competency_id": req.competency_id,
                "competency_name": req.competency.name if req.competency else req.competency_id,
                "required_level": req.required_level,
                "current_level": round(current_level, 4),
                "gap": round(max(0.0, gap), 4),
                "is_critical": req.is_critical,
                "status": "SATISFIED" if satisfied else "GAP",
                "satisfied": satisfied,
            }

        # Baseline (no overrides)
        baseline_details = [_eval_req_with_override(req, None) for req in requirements]
        # Simulated (with overrides)
        simulated_details = [
            _eval_req_with_override(req, hyp_map.get(req.competency_id))
            for req in requirements
        ]

        def _classify(details: List[Dict]) -> str:
            if any(d["status"] == "INSUFFICIENT_EVIDENCE" for d in details):
                return INSUFFICIENT_EVIDENCE
            critical_unmet = [d for d in details if d["is_critical"] and not d["satisfied"]]
            if critical_unmet:
                return NOT_READY
            any_unmet = [d for d in details if not d["satisfied"]]
            if any_unmet:
                return PARTIALLY_READY
            return READY

        baseline_status = _classify(baseline_details)
        simulated_status = _classify(simulated_details)

        # Audit the simulation (no DB mutation)
        audit_event = CompetencyAuditEvent(
            officer_id=officer_profile_id,
            event_type="task_readiness_simulation_executed",
            actor="officer",
            event_data={
                "task_id": task_id,
                "hypothetical_changes": hypothetical_changes,
                "baseline_status": baseline_status,
                "simulated_status": simulated_status,
            },
            timestamp=datetime.now(timezone.utc),
        )
        db.add(audit_event)
        db.commit()

        return {
            "simulationId": f"sim-readiness-{task_id}-{officer_profile_id}",
            "taskId": task_id,
            "taskName": task.name,
            "hypotheticalChanges": hypothetical_changes,
            "baseline": {
                "readinessStatus": baseline_status,
                "requirementDetails": baseline_details,
                "requirementsMet": sum(1 for d in baseline_details if d["satisfied"]),
            },
            "simulated": {
                "readinessStatus": simulated_status,
                "requirementDetails": simulated_details,
                "requirementsMet": sum(1 for d in simulated_details if d["satisfied"]),
            },
            "readinessChanged": baseline_status != simulated_status,
            "disclaimer": (
                "SIMULATION — DOES NOT MODIFY REAL DATA. "
                "Values are hypothetical and based on prototype mathematical models only."
            ),
            "isSimulation": True,
        }

    @classmethod
    def list_tasks(cls, db: Session, active_only: bool = True) -> List[Dict[str, Any]]:
        """Returns all task definitions with their requirement counts."""
        query = db.query(TaskDefinition)
        if active_only:
            query = query.filter(TaskDefinition.is_active == True)
        tasks = query.order_by(TaskDefinition.name).all()
        return [
            {
                "taskId": t.id,
                "taskName": t.name,
                "taskDescription": t.description,
                "taskCategory": t.category,
                "cadreApplicable": t.cadre_applicable,
                "requirementCount": len(t.requirements),
                "isActive": t.is_active,
            }
            for t in tasks
        ]
