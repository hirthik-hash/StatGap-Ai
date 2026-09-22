"""Adaptive Assessment Service: Real Rasch/1PL Adaptive Item Selection, Response Scoring, and Diagnosis Feedback."""
import json
import uuid
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from backend.app.core.config import settings
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.assessment_item import (
    AssessmentItem,
    AssessmentItemConcept,
    AssessmentItemRelationship,
)
from backend.app.models.assessment_session import (
    AssessmentSession,
    AssessmentResponse,
)
from backend.app.services.irt_engine import (
    rasch_probability,
    item_information,
    estimate_ability_map,
    map_difficulty_to_label,
    determine_ability_band,
)
from backend.app.services.evaluation_service import CompetencyEvaluationService
from backend.app.services.diagnosis_service import GapDiagnosisService


class AssessmentResultPayload:
    def __init__(
        self,
        session_id: str,
        target_competency_id: str,
        target_competency_name: str,
        items_answered: int,
        correct_count: int,
        accuracy_percentage: float,
        initial_theta: float,
        final_theta: float,
        standard_error: float,
        ability_band: str,
        stopping_reason: str,
        integrated_performance: Optional[float] = None,
        misconception_signals_detected: int = 0,
        evaluated_competency_score: Optional[int] = None,
        new_diagnosis_type: Optional[str] = None,
    ):
        self.session_id = session_id
        self.target_competency_id = target_competency_id
        self.target_competency_name = target_competency_name
        self.items_answered = items_answered
        self.correct_count = correct_count
        self.accuracy_percentage = round(accuracy_percentage, 1)
        self.initial_theta = round(initial_theta, 3)
        self.final_theta = round(final_theta, 3)
        self.standard_error = round(standard_error, 3)
        self.ability_band = ability_band
        self.stopping_reason = stopping_reason
        self.integrated_performance = round(integrated_performance, 1) if integrated_performance is not None else None
        self.misconception_signals_detected = misconception_signals_detected
        self.evaluated_competency_score = evaluated_competency_score
        self.new_diagnosis_type = new_diagnosis_type

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sessionId": self.session_id,
            "targetCompetencyId": self.target_competency_id,
            "targetCompetencyName": self.target_competency_name,
            "itemsAnswered": self.items_answered,
            "correctCount": self.correct_count,
            "accuracyPercentage": self.accuracy_percentage,
            "initialTheta": self.initial_theta,
            "finalTheta": self.final_theta,
            "standardError": self.standard_error,
            "abilityBand": self.ability_band,
            "stoppingReason": self.stopping_reason,
            "integratedPerformance": self.integrated_performance,
            "misconceptionSignalsDetected": self.misconception_signals_detected,
            "evaluatedCompetencyScore": self.evaluated_competency_score,
            "newDiagnosisType": self.new_diagnosis_type,
        }


class AdaptiveAssessmentService:
    def __init__(self, db: Session):
        self.db = db

    def start_session(
        self,
        officer_profile_id: int,
        target_competency_id: str,
    ) -> Tuple[AssessmentSession, AssessmentItem]:
        """
        Initializes an adaptive assessment session with a conservative prior theta
        mapped from baseline competency evidence.
        """
        profile = self.db.query(OfficerProfile).filter(OfficerProfile.id == officer_profile_id).first()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

        comp = self.db.query(Competency).filter(Competency.id == target_competency_id).first()
        if not comp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target competency not found")

        # Prior theta mapping from Prompt 3 evidence
        evidence = (
            self.db.query(CompetencyEvidence)
            .filter(
                CompetencyEvidence.officer_profile_id == officer_profile_id,
                CompetencyEvidence.competency_id == target_competency_id,
            )
            .first()
        )

        initial_theta = 0.0
        if evidence:
            if evidence.assessment_score >= 75:
                initial_theta = 0.8
            elif evidence.assessment_score < 50:
                initial_theta = -0.8
            else:
                initial_theta = 0.0

        # Retrieve active gap diagnosis if available
        active_diagnosis = (
            self.db.query(GapDiagnosis)
            .filter(
                GapDiagnosis.officer_profile_id == officer_profile_id,
                GapDiagnosis.competency_id == target_competency_id,
            )
            .order_by(GapDiagnosis.created_at.desc())
            .first()
        )

        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        session = AssessmentSession(
            id=session_id,
            officer_profile_id=officer_profile_id,
            target_competency_id=target_competency_id,
            diagnosis_id=active_diagnosis.id if active_diagnosis else None,
            status="active",
            initial_theta=initial_theta,
            current_theta=initial_theta,
            standard_error=1.0,
            items_answered=0,
            started_at=datetime.now(),
        )
        self.db.add(session)
        self.db.flush()

        # Select first item
        first_item = self.select_next_item(session)
        if not first_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No validated assessment items available for competency '{target_competency_id}'",
            )

        session.current_assigned_item_id = first_item.id
        self.db.commit()
        self.db.refresh(session)

        return session, first_item

    def select_next_item(self, session: AssessmentSession) -> Optional[AssessmentItem]:
        """
        Selects the next most informative item at current theta subject to:
        1. Item availability (status == 'validated', not already answered in this session)
        2. Diagnosis-aware weighting (prioritizes probes, application, or integrated items)
        3. Content balancing (penalizes repeatedly tested concept nodes)
        """
        session_responses = (
            self.db.query(AssessmentResponse)
            .options(joinedload(AssessmentResponse.item).joinedload(AssessmentItem.concept_mappings))
            .filter(AssessmentResponse.session_id == session.id)
            .all()
        )
        answered_item_ids = [r.item_id for r in session_responses]

        query = (
            self.db.query(AssessmentItem)
            .options(
                joinedload(AssessmentItem.concept_mappings),
                joinedload(AssessmentItem.relationship_mappings),
                joinedload(AssessmentItem.misconception),
            )
            .filter(
                AssessmentItem.competency_id == session.target_competency_id,
                AssessmentItem.status == "validated",
            )
        )
        if answered_item_ids:
            query = query.filter(~AssessmentItem.id.in_(answered_item_ids))

        candidates: List[AssessmentItem] = query.all()
        if not candidates:
            return None

        # Build concept usage frequency in current session
        concept_counts: Dict[str, int] = {}
        for resp in session_responses:
            if resp.item:
                for cm in resp.item.concept_mappings:
                    concept_counts[cm.concept_id] = concept_counts.get(cm.concept_id, 0) + 1

        diagnosis = session.diagnosis
        diag_type = diagnosis.diagnosis_type if diagnosis else None
        target_misc_id = diagnosis.misconception_id if diagnosis else None

        scored_candidates: List[Tuple[float, AssessmentItem]] = []

        for item in candidates:
            # 1. Base IRT Information at current theta: I(theta) = P * (1 - P)
            info = item_information(session.current_theta, item.difficulty_b)

            # 2. Diagnosis-Aware Multiplier
            diag_weight = 1.0
            if diag_type == "statistical_misconception":
                if item.question_type == "misconception_probe":
                    diag_weight = 2.5 if (target_misc_id and item.misconception_id == target_misc_id) else 2.0
            elif diag_type == "application_gap":
                if item.question_type == "application":
                    diag_weight = 2.4
            elif diag_type == "integrated_concept":
                if item.question_type == "integrated_concept":
                    diag_weight = 2.4
            elif diag_type == "basic_concept":
                if item.question_type == "single_concept":
                    diag_weight = 1.8
            elif diag_type == "insufficient_evidence":
                # Encourage broad coverage across diverse types
                diag_weight = 1.4

            # 3. Content Balancing & Concept Coverage
            balance_mult = 1.0
            item_concept_ids = [cm.concept_id for cm in item.concept_mappings]
            if item_concept_ids:
                max_repeated = max(concept_counts.get(cid, 0) for cid in item_concept_ids)
                if max_repeated == 0:
                    balance_mult = 1.4  # Bonus for novel concept
                elif max_repeated >= 2:
                    balance_mult = 0.4  # Penalty for over-tested concept
                elif max_repeated == 1:
                    balance_mult = 0.9

            final_priority = info * diag_weight * balance_mult
            scored_candidates.append((final_priority, item))

        # Sort descending by priority score; break ties by closeness |b - theta| then item ID
        scored_candidates.sort(
            key=lambda x: (x[0], -abs(x[1].difficulty_b - session.current_theta), x[1].id),
            reverse=True,
        )

        return scored_candidates[0][1]

    def submit_response(
        self,
        session_id: str,
        officer_profile_id: int,
        item_id: str,
        selected_answer: int,
        confidence: str,
        response_time_ms: int,
    ) -> Tuple[AssessmentResponse, Optional[AssessmentItem], Optional[AssessmentResultPayload]]:
        """
        Validates submission, grades response on backend, updates ability estimate,
        evaluates adaptive stopping rules, and triggers evidence feedback when stopping.
        """
        session = (
            self.db.query(AssessmentSession)
            .options(joinedload(AssessmentSession.responses).joinedload(AssessmentResponse.item))
            .filter(AssessmentSession.id == session_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment session not found")

        # Security check: Session ownership
        if session.officer_profile_id != officer_profile_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Session belongs to another officer profile",
            )

        if session.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session is already {session.status}",
            )

        # Delivery security check: Out-of-sequence item submission rejected
        if session.current_assigned_item_id != item_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item '{item_id}' is not currently assigned to this active session",
            )

        # Duplicate response check
        existing_resp = (
            self.db.query(AssessmentResponse)
            .filter(
                AssessmentResponse.session_id == session_id,
                AssessmentResponse.item_id == item_id,
            )
            .first()
        )
        if existing_resp:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Response already submitted for item '{item_id}' in session '{session_id}'",
            )

        item = self.db.query(AssessmentItem).filter(AssessmentItem.id == item_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment item not found")

        # Backend determines correctness
        is_correct = bool(selected_answer == item.correct_answer)

        # Prepare response history for MAP estimation
        past_tuples: List[Tuple[float, bool]] = [
            (r.item.difficulty_b, r.is_correct) for r in session.responses if r.item
        ]
        past_tuples.append((item.difficulty_b, is_correct))

        new_theta, new_se = estimate_ability_map(
            responses=past_tuples,
            prior_theta=session.initial_theta,
            prior_sd=1.0,
        )

        item_info = item_information(session.current_theta, item.difficulty_b)

        response_record = AssessmentResponse(
            session_id=session.id,
            item_id=item.id,
            selected_answer=selected_answer,
            is_correct=is_correct,
            confidence=confidence,
            response_time_ms=response_time_ms,
            theta_before=session.current_theta,
            theta_after=new_theta,
            information=item_info,
            created_at=datetime.now(),
        )
        self.db.add(response_record)

        # Update session trajectory
        session.current_theta = new_theta
        session.standard_error = new_se
        session.items_answered += 1
        self.db.flush()

        # Check stopping conditions
        next_item = self.select_next_item(session)
        should_stop = False
        stopping_reason = None

        if session.items_answered >= settings.ADAPTIVE_MAX_ITEMS:
            should_stop = True
            stopping_reason = "max_items_reached"
        elif session.items_answered >= settings.ADAPTIVE_MIN_ITEMS and session.standard_error <= settings.ADAPTIVE_TARGET_SE:
            should_stop = True
            stopping_reason = "precision_target_met"
        elif next_item is None:
            should_stop = True
            stopping_reason = "item_bank_exhausted"

        if should_stop:
            session.status = "completed"
            session.completed_at = datetime.now()
            session.stopping_reason = stopping_reason
            session.current_assigned_item_id = None
            self.db.commit()

            # Trigger evidence update and re-diagnosis feedback loop
            result = self._finalize_and_update_evidence(session)
            return response_record, None, result
        else:
            session.current_assigned_item_id = next_item.id
            self.db.commit()
            return response_record, next_item, None

    def _finalize_and_update_evidence(self, session: AssessmentSession) -> AssessmentResultPayload:
        """
        Updates persistent CompetencyEvidence, re-evaluates scoring,
        and re-runs GapDiagnosisService based on the completed adaptive assessment.
        """
        responses = (
            self.db.query(AssessmentResponse)
            .options(joinedload(AssessmentResponse.item))
            .filter(AssessmentResponse.session_id == session.id)
            .all()
        )
        total_items = len(responses)
        correct_count = sum(1 for r in responses if r.is_correct)
        accuracy = (correct_count / total_items * 100.0) if total_items > 0 else 0.0

        # Performance on integrated items
        integrated_responses = [r for r in responses if r.item and r.item.question_type == "integrated_concept"]
        integrated_perf: Optional[float] = None
        if integrated_responses:
            int_correct = sum(1 for r in integrated_responses if r.is_correct)
            integrated_perf = (int_correct / len(integrated_responses)) * 100.0

        # Misconception triggers: wrong answer + high confidence on probe
        misconception_signals = [
            r for r in responses
            if r.item and r.item.question_type == "misconception_probe"
            and not r.is_correct
            and r.confidence in ("High", "Very High")
        ]

        # Update or create CompetencyEvidence
        evidence = (
            self.db.query(CompetencyEvidence)
            .filter(
                CompetencyEvidence.officer_profile_id == session.officer_profile_id,
                CompetencyEvidence.competency_id == session.target_competency_id,
            )
            .first()
        )

        if not evidence:
            evidence = CompetencyEvidence(
                officer_profile_id=session.officer_profile_id,
                competency_id=session.target_competency_id,
                assessment_score=accuracy,
                quiz_accuracy=accuracy,
                practical_performance=integrated_perf or accuracy,
                repeated_errors=len(misconception_signals),
                confidence_pattern="overconfident" if misconception_signals else "calibrated",
            )
            self.db.add(evidence)
        else:
            evidence.quiz_accuracy = accuracy
            if integrated_perf is not None:
                # Update practical/integrated performance signal
                evidence.practical_performance = integrated_perf
            if misconception_signals:
                evidence.repeated_errors += len(misconception_signals)
                evidence.confidence_pattern = "overconfident"

        self.db.flush()

        # Re-run competency evaluation and gap diagnosis
        eval_dict = CompetencyEvaluationService.evaluate(
            assessment=evidence.assessment_score,
            quiz=evidence.quiz_accuracy,
            practical=evidence.practical_performance,
        )
        evaluated_comp_score = eval_dict["score"]

        # Get authenticated user for diagnosis service
        officer_profile = self.db.query(OfficerProfile).filter(OfficerProfile.id == session.officer_profile_id).first()
        user = officer_profile.user if officer_profile else None

        new_diag_type = None
        if user:
            comp = self.db.query(Competency).filter(Competency.id == session.target_competency_id).first()
            if comp:
                comp.score = eval_dict["score"]
                comp.gap_points = eval_dict["gap_points"]
                comp.status = eval_dict["status"]
                diag_service = GapDiagnosisService(self.db)
                new_diag = diag_service.diagnose_competency(user, comp, evidence=evidence, persist=True)
                new_diag_type = new_diag.diagnosis_type

        self.db.commit()

        ability_band = determine_ability_band(session.current_theta)
        comp_name = session.target_competency.name if session.target_competency else session.target_competency_id

        return AssessmentResultPayload(
            session_id=session.id,
            target_competency_id=session.target_competency_id,
            target_competency_name=comp_name,
            items_answered=session.items_answered,
            correct_count=correct_count,
            accuracy_percentage=accuracy,
            initial_theta=session.initial_theta,
            final_theta=session.current_theta,
            standard_error=session.standard_error,
            ability_band=ability_band,
            stopping_reason=session.stopping_reason or "completed",
            integrated_performance=integrated_perf,
            misconception_signals_detected=len(misconception_signals),
            evaluated_competency_score=evaluated_comp_score,
            new_diagnosis_type=new_diag_type,
        )

    def get_session_result(self, session_id: str, officer_profile_id: int) -> AssessmentResultPayload:
        """Retrieves result payload for a completed assessment session with security verification."""
        session = (
            self.db.query(AssessmentSession)
            .options(
                joinedload(AssessmentSession.responses).joinedload(AssessmentResponse.item),
                joinedload(AssessmentSession.target_competency),
            )
            .filter(AssessmentSession.id == session_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment session not found")

        if session.officer_profile_id != officer_profile_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Session belongs to another officer profile",
            )

        responses = session.responses
        total_items = len(responses)
        correct_count = sum(1 for r in responses if r.is_correct)
        accuracy = (correct_count / total_items * 100.0) if total_items > 0 else 0.0

        integrated_responses = [r for r in responses if r.item and r.item.question_type == "integrated_concept"]
        integrated_perf: Optional[float] = None
        if integrated_responses:
            int_correct = sum(1 for r in integrated_responses if r.is_correct)
            integrated_perf = (int_correct / len(integrated_responses)) * 100.0

        misconception_signals = [
            r for r in responses
            if r.item and r.item.question_type == "misconception_probe"
            and not r.is_correct
            and r.confidence in ("High", "Very High")
        ]

        ability_band = determine_ability_band(session.current_theta)
        comp_name = session.target_competency.name if session.target_competency else session.target_competency_id

        # Get evaluated competency score if available
        comp = self.db.query(Competency).filter(Competency.id == session.target_competency_id).first()
        comp_score = comp.score if comp else None

        active_diagnosis = (
            self.db.query(GapDiagnosis)
            .filter(
                GapDiagnosis.officer_profile_id == officer_profile_id,
                GapDiagnosis.competency_id == session.target_competency_id,
            )
            .order_by(GapDiagnosis.created_at.desc())
            .first()
        )

        return AssessmentResultPayload(
            session_id=session.id,
            target_competency_id=session.target_competency_id,
            target_competency_name=comp_name,
            items_answered=session.items_answered,
            correct_count=correct_count,
            accuracy_percentage=accuracy,
            initial_theta=session.initial_theta,
            final_theta=session.current_theta,
            standard_error=session.standard_error,
            ability_band=ability_band,
            stopping_reason=session.stopping_reason or "completed",
            integrated_performance=integrated_perf,
            misconception_signals_detected=len(misconception_signals),
            evaluated_competency_score=comp_score,
            new_diagnosis_type=active_diagnosis.diagnosis_type if active_diagnosis else None,
        )
