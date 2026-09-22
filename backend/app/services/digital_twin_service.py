"""Competency Digital Twin service: Computational representation, snapshots, and what-if foundation."""
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session, joinedload

from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.structured_evidence import StructuredEvidence
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.digital_twin_snapshot import DigitalTwinSnapshot
from backend.app.models.knowledge_graph import CompetencyNode
from backend.app.repositories.competency_graph_repository import CompetencyGraphRepository
from backend.app.services.evaluation_service import CompetencyEvaluationService
from backend.app.services.requirement_resolution_service import RequirementResolutionService
from backend.app.services.confidence_service import ConfidenceService
from backend.app.services.audit_service import AuditService, SecurityEventType


class DigitalTwinService:
    def __init__(self, db: Session):
        self.db = db
        self.graph_repo = CompetencyGraphRepository(db)
        self.req_service = RequirementResolutionService(db)
        self.audit_service = AuditService(db)

    def evaluate_officer_competency(
        self,
        profile: OfficerProfile,
        competency: Competency,
        persist: bool = True,
    ) -> Dict[str, Any]:
        """
        Deterministically evaluates current competency, required level, gap, and confidence
        using the preserved Phase 1 4-factor scoring model.
        """
        # 1. Fetch structured evidence records
        structured_records = (
            self.db.query(StructuredEvidence)
            .filter(
                StructuredEvidence.officer_profile_id == profile.id,
                StructuredEvidence.competency_id == competency.id,
                StructuredEvidence.validity_status == "VALID",
            )
            .all()
        )

        # 2. Fetch legacy CompetencyEvidence record if present
        legacy_ev = (
            self.db.query(CompetencyEvidence)
            .filter(
                CompetencyEvidence.officer_profile_id == profile.id,
                CompetencyEvidence.competency_id == competency.id,
            )
            .first()
        )

        # Map components
        assessment_scores: List[float] = []
        quiz_scores: List[float] = []
        practical_scores: List[float] = []
        timestamps: List[datetime] = []
        sources_recorded: List[str] = []

        # Ingest from structured records
        for r in structured_records:
            norm = CompetencyEvaluationService.normalize_score(r.normalized_score or r.raw_score)
            if r.source_type.upper() == "ASSESSMENT":
                assessment_scores.append(norm)
            elif r.source_type.upper() == "QUIZ":
                quiz_scores.append(norm)
            elif r.source_type.upper() in ("PRACTICAL", "VERIFICATION"):
                practical_scores.append(norm)
            if r.recorded_at:
                timestamps.append(r.recorded_at)
            sources_recorded.append(r.source_type.upper())

        # Ingest from legacy evidence if structured not present
        if legacy_ev:
            if not assessment_scores and legacy_ev.assessment_score > 0:
                assessment_scores.append(CompetencyEvaluationService.normalize_score(legacy_ev.assessment_score))
                sources_recorded.append("ASSESSMENT")
            if not quiz_scores and legacy_ev.quiz_accuracy > 0:
                quiz_scores.append(CompetencyEvaluationService.normalize_score(legacy_ev.quiz_accuracy))
                sources_recorded.append("QUIZ")
            if not practical_scores and legacy_ev.practical_performance > 0:
                practical_scores.append(CompetencyEvaluationService.normalize_score(legacy_ev.practical_performance))
                sources_recorded.append("PRACTICAL")
            if legacy_ev.updated_at:
                timestamps.append(legacy_ev.updated_at)

        # Experience factor: Normalized from officer's years of experience (capped at 20 years for 1.0)
        exp_years = profile.years_of_experience or 0
        norm_experience = min(1.0, round(exp_years / 20.0, 4))
        sources_recorded.append("EXPERIENCE")

        # Resolve primary factor scores (mean if multiple, or explicit missing evidence handling)
        ass_val = sum(assessment_scores) / len(assessment_scores) if assessment_scores else 0.0
        quiz_val = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0.0
        prac_val = sum(practical_scores) / len(practical_scores) if practical_scores else 0.0

        # Calculate current competency using Phase 1 4-factor scoring
        current_comp = CompetencyEvaluationService.calculate_competency(
            assessment=ass_val,
            quiz=quiz_val,
            practical=prac_val,
            external=norm_experience,
        )

        # Resolve required level
        user_role = getattr(profile.user, "role", "OFFICER") if profile.user else "OFFICER"
        required_level = self.req_service.resolve_required_level(profile, competency.id, user_role)

        # Compute deterministic gap
        gap = round(required_level - current_comp, 4)
        display_gap = max(0.0, gap)
        band = CompetencyEvaluationService.classify_gap_band(gap)

        status_mapping = {
            "red": "critical_gap",
            "orange": "moderate_gap",
            "green": "competent",
        }
        status = status_mapping[band]

        # Calculate evidence confidence
        all_eval_scores = assessment_scores + quiz_scores + practical_scores
        last_dt = max(timestamps) if timestamps else None
        conf_eval = ConfidenceService.evaluate_confidence(all_eval_scores, last_evidence_at=last_dt)

        # Prerequisite & dependency context
        prereqs = self.graph_repo.get_prerequisites(competency.id)
        dependencies = self.graph_repo.get_dependencies(competency.id)
        children = self.graph_repo.get_children(competency.id)

        evidence_sources_unique = list(set(sources_recorded))
        evidence_count = len(all_eval_scores)

        # Optional: Persist state into officer_competency_states
        if persist:
            state = (
                self.db.query(OfficerCompetencyState)
                .filter(
                    OfficerCompetencyState.officer_profile_id == profile.id,
                    OfficerCompetencyState.competency_id == competency.id,
                )
                .first()
            )
            if not state:
                state = OfficerCompetencyState(
                    officer_profile_id=profile.id,
                    competency_id=competency.id,
                )
                self.db.add(state)

            state.current_level = current_comp
            state.required_level = required_level
            state.gap = display_gap
            state.raw_gap = gap
            state.status = status
            state.gap_band = band
            state.confidence = conf_eval["confidence"]
            state.confidence_category = conf_eval["category"]
            state.confidence_reason = conf_eval["reason"]
            state.evidence_count = evidence_count
            state.last_evidence_at = last_dt
            state.evidence_sources = json.dumps(evidence_sources_unique)
            self.db.commit()

        return {
            "competencyId": competency.id,
            "competencyName": competency.name,
            "category": competency.category,
            "description": competency.description,
            "currentLevel": current_comp,
            "requiredLevel": required_level,
            "gap": display_gap,
            "rawGap": gap,
            "status": status,
            "gapBand": band,
            "confidence": conf_eval["confidence"],
            "confidenceCategory": conf_eval["category"],
            "confidenceReason": conf_eval["reason"],
            "isInsufficientEvidence": conf_eval["is_insufficient_evidence"],
            "evidenceCount": evidence_count,
            "lastEvidenceAt": last_dt.isoformat() if last_dt else None,
            "evidenceSources": evidence_sources_unique,
            "factors": {
                "assessment": ass_val,
                "quiz": quiz_val,
                "practical": prac_val,
                "experience": norm_experience,
            },
            "prerequisites": prereqs,
            "dependencies": dependencies,
            "subSkills": [
                {
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "ontologyLevel": c.ontology_level,
                    "requiredProficiency": c.required_proficiency,
                }
                for c in children
            ],
        }

    def build_digital_twin(self, officer_profile_id: int) -> Dict[str, Any]:
        """
        Constructs the complete computational Competency Digital Twin for an officer.
        """
        profile = (
            self.db.query(OfficerProfile)
            .options(joinedload(OfficerProfile.user))
            .filter(OfficerProfile.id == officer_profile_id)
            .first()
        )
        if not profile:
            raise ValueError(f"Officer profile {officer_profile_id} not found")

        all_comps = self.db.query(Competency).order_by(Competency.name.asc()).all()
        competency_states = [
            self.evaluate_officer_competency(profile, c, persist=True)
            for c in all_comps
        ]

        # Summary KPIs
        critical_count = sum(1 for s in competency_states if s["gapBand"] == "red")
        moderate_count = sum(1 for s in competency_states if s["gapBand"] == "orange")
        competent_count = sum(1 for s in competency_states if s["gapBand"] == "green")
        avg_confidence = (
            sum(s["confidence"] for s in competency_states) / len(competency_states)
            if competency_states else 0.0
        )

        identity_context = {
            "officerId": profile.id,
            "iGotId": profile.user.igot_id if profile.user else "",
            "name": profile.name,
            "cadre": profile.cadre or "ISS",
            "department": profile.department,
            "designation": profile.designation,
            "currentAssignment": profile.current_assignment or "General Operations",
            "qualifications": profile.qualifications or "",
            "yearsOfExperience": profile.years_of_experience,
            "role": getattr(profile.user, "role", "OFFICER") if profile.user else "OFFICER",
        }

        return {
            "digitalTwinId": f"twin-{profile.id}-{profile.user.igot_id if profile.user else 'anon'}",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "identityContext": identity_context,
            "kpiSummary": {
                "totalCompetencies": len(competency_states),
                "criticalGaps": critical_count,
                "moderateGaps": moderate_count,
                "competentDomains": competent_count,
                "averageConfidence": round(avg_confidence, 4),
            },
            "competencyStates": competency_states,
            "ontologyHierarchy": self.graph_repo.get_full_ontology_hierarchy(),
        }

    def create_snapshot(
        self,
        officer_profile_id: int,
        trigger_event: str = "MANUAL_SNAPSHOT",
    ) -> DigitalTwinSnapshot:
        """
        Creates an immutable, point-in-time snapshot of the Competency Digital Twin.
        """
        twin = self.build_digital_twin(officer_profile_id)
        snapshot_uuid = str(uuid.uuid4())

        snapshot = DigitalTwinSnapshot(
            officer_profile_id=officer_profile_id,
            snapshot_id=snapshot_uuid,
            trigger_event=trigger_event,
            identity_context=json.dumps(twin["identityContext"]),
            competency_state_json=json.dumps(twin["competencyStates"]),
            graph_context_json=json.dumps(twin["ontologyHierarchy"]),
            learning_context_json=json.dumps({"snapshot_type": "point_in_time"}),
            ontology_version="1.0.0",
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)

        # Audit event
        actor = twin["identityContext"]["iGotId"] or "system"
        self.audit_service.log_event(
            event_type="DIGITAL_TWIN_SNAPSHOT_CREATED",
            actor=actor,
            officer_id=officer_profile_id,
            details={
                "snapshot_id": snapshot_uuid,
                "trigger_event": trigger_event,
                "critical_gaps": twin["kpiSummary"]["criticalGaps"],
            },
        )
        return snapshot

    def list_snapshots(self, officer_profile_id: int) -> List[Dict[str, Any]]:
        """Lists historical snapshots for an officer."""
        snapshots = (
            self.db.query(DigitalTwinSnapshot)
            .filter(DigitalTwinSnapshot.officer_profile_id == officer_profile_id)
            .order_by(DigitalTwinSnapshot.created_at.desc())
            .all()
        )
        return [
            {
                "snapshotId": s.snapshot_id,
                "triggerEvent": s.trigger_event,
                "ontologyVersion": s.ontology_version,
                "createdAt": s.created_at.isoformat(),
                "identityContext": json.loads(s.identity_context),
            }
            for s in snapshots
        ]

    def simulate_what_if(
        self,
        officer_profile_id: int,
        target_competency_id: str,
        intervention_type: str,
        hypothetical_score: float = 0.85,
    ) -> Dict[str, Any]:
        """
        Data contract and foundation interface for future What-If scenario modeling.
        Evaluates hypothetical post-intervention state WITHOUT mutating the database.
        Explicitly stamped as a prototype simulation assumption.
        """
        profile = self.db.query(OfficerProfile).filter(OfficerProfile.id == officer_profile_id).first()
        if not profile:
            raise ValueError(f"Officer profile {officer_profile_id} not found")

        comp = self.db.query(Competency).filter(Competency.id == target_competency_id).first()
        if not comp:
            raise ValueError(f"Competency {target_competency_id} not found")

        # Baseline evaluation
        baseline = self.evaluate_officer_competency(profile, comp, persist=False)

        # Simulated post-intervention: Assessment / Practical elevated to hypothetical_score
        sim_assessment = max(baseline["factors"]["assessment"], hypothetical_score)
        sim_current = CompetencyEvaluationService.calculate_competency(
            assessment=sim_assessment,
            quiz=max(baseline["factors"]["quiz"], hypothetical_score * 0.9),
            practical=max(baseline["factors"]["practical"], hypothetical_score * 0.95),
            external=baseline["factors"]["experience"],
        )
        sim_gap = round(baseline["requiredLevel"] - sim_current, 4)
        sim_band = CompetencyEvaluationService.classify_gap_band(sim_gap)

        return {
            "simulationId": f"sim-{uuid.uuid4()}",
            "targetCompetencyId": target_competency_id,
            "targetCompetencyName": comp.name,
            "interventionType": intervention_type,
            "baseline": {
                "currentLevel": baseline["currentLevel"],
                "gap": baseline["gap"],
                "gapBand": baseline["gapBand"],
                "status": baseline["status"],
            },
            "simulated": {
                "currentLevel": sim_current,
                "gap": max(0.0, sim_gap),
                "gapBand": sim_band,
                "projectedImprovement": round(sim_current - baseline["currentLevel"], 4),
            },
            "disclaimer": (
                "SYNTHETIC TEST ASSUMPTION: Simulation values represent prototype mathematical "
                "models and are NOT empirically validated productivity or competency guarantees."
            ),
            "isSimulation": True,
        }
