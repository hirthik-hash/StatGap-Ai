"""Diagnostic Gap Engine: Deterministic, explainable classification of competency gaps."""
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.misconception import Misconception
from backend.app.repositories.knowledge_graph_repository import KnowledgeGraphRepository
from backend.app.repositories.competency_repository import CompetencyRepository
from backend.app.services.evaluation_service import CompetencyEvaluationService


class GapDiagnosisService:
    def __init__(self, db: Session):
        self.db = db
        self.kg_repo = KnowledgeGraphRepository(db)
        self.comp_repo = CompetencyRepository(db)

    def diagnose_competency(
        self,
        user: User,
        competency: Competency,
        evidence: Optional[CompetencyEvidence] = None,
        persist: bool = True,
    ) -> GapDiagnosis:
        """
        Executes deterministic multi-source diagnostic evaluation for an officer on a competency.
        Evaluates assessment score, quiz accuracy, practical performance, repeated errors,
        confidence patterns, and knowledge graph concept prerequisites.
        """
        profile = user.profile
        if not profile:
            raise ValueError(f"Officer profile not found for user {user.igot_id}")

        if not evidence:
            evidence = self.comp_repo.get_evidence_for_officer(profile.id, competency.id)

        if not evidence and (competency.score is None or competency.score == 0):
            diagnosis = GapDiagnosis(
                officer_profile_id=profile.id,
                competency_id=competency.id,
                diagnosis_type="insufficient_evidence",
                severity="inconclusive",
                confidence=0.50,
                explanation=(
                    f"Diagnostic evaluation inconclusive: No multi-source evaluation records (assessments, quizzes, "
                    f"or practical data tasks) have been recorded for officer on '{competency.name}'. "
                    f"Diagnostic gap classification cannot be reliably performed without empirical performance data."
                ),
                evidence_references=json.dumps({
                    "assessment_score": 0,
                    "quiz_accuracy": 0,
                    "practical_performance": 0,
                    "repeated_errors": 0,
                    "confidence_pattern": "N/A",
                    "assessment_ratio": "N/A",
                }),
                reasoning_trace=json.dumps({
                    "diagnosis_type": "insufficient_evidence",
                    "overall_score": 0,
                    "gap_points": competency.required_score,
                    "severity": "inconclusive",
                    "signals": [
                        {
                            "signal": "multi_source_evidence",
                            "value": "None",
                            "interpretation": "No empirical evaluation records found",
                        }
                    ],
                    "conclusion": "Inconclusive: Insufficient diagnostic evidence recorded for this competency.",
                    "has_prerequisites": False,
                }),
                root_cause_competency_id=None,
                misconception_id=None,
            )
            if persist:
                return self.kg_repo.save_diagnosis(diagnosis)
            return diagnosis

        # Base evaluation metrics
        assessment = evidence.assessment_score if evidence else float(competency.score)
        quiz = evidence.quiz_accuracy if evidence else float(competency.score)
        practical = evidence.practical_performance if evidence else float(competency.score)
        repeated_errors = evidence.repeated_errors if evidence else 0
        confidence_pattern = (evidence.confidence_pattern or "").lower() if evidence else ""

        overall_score = CompetencyEvaluationService.calculate_score(assessment, quiz, practical)
        gap_points = CompetencyEvaluationService.calculate_gap_points(overall_score, competency.required_score)
        status = CompetencyEvaluationService.classify_status(overall_score)

        signals: List[Dict[str, Any]] = [
            {
                "signal": "formal_assessment",
                "value": f"{assessment}%",
                "interpretation": "Below requirement (75%)" if assessment < 75 else "Competent",
            },
            {
                "signal": "quiz_accuracy",
                "value": f"{quiz}%",
                "interpretation": "Sub-threshold conceptual performance" if quiz < 70 else "Sound conceptual performance",
            },
            {
                "signal": "practical_performance",
                "value": f"{practical}%",
                "interpretation": "Weak data operations execution" if practical < 60 else "Adequate practical performance",
            },
            {
                "signal": "repeated_error_count",
                "value": repeated_errors,
                "interpretation": "Systematic recurring pattern" if repeated_errors >= 2 else "Sporadic / isolated errors",
            },
            {
                "signal": "confidence_calibration",
                "value": evidence.confidence_pattern if evidence else "Uncalibrated",
                "interpretation": "High certainty on erroneous response (entrenched fallacy marker)"
                if "high" in confidence_pattern and ("incorrect" in confidence_pattern or repeated_errors >= 2)
                else "Normal / hesitant confidence calibration",
            },
        ]

        # -------------------------------------------------------------------
        # Rule 1: Application / Practical Gap
        # Concept theory/quizzes are strong, but practical performance drops significantly (< 55%)
        # -------------------------------------------------------------------
        is_application_gap = (
            (quiz >= 70.0 or assessment >= 68.0)
            and practical < 55.0
            and (quiz - practical >= 18.0 or assessment - practical >= 18.0)
        )

        # -------------------------------------------------------------------
        # Rule 2: Statistical Misconception
        # Repeated errors >= 2 coupled with High confidence wrong answers
        # -------------------------------------------------------------------
        is_high_confidence_error = "high" in confidence_pattern and (
            "incorrect" in confidence_pattern or "misconception" in confidence_pattern or repeated_errors >= 2
        )
        is_misconception = (
            repeated_errors >= 2
            and (is_high_confidence_error or "misconception" in confidence_pattern)
            and quiz < 72.0
        )

        # -------------------------------------------------------------------
        # Rule 3: Integrated Concept / Relationship Gap
        # Traversing knowledge graph prerequisites
        # -------------------------------------------------------------------
        integrated_check = self._check_integrated_gap(profile.id, competency.id, overall_score)

        # -------------------------------------------------------------------
        # Determine Diagnosis Type & Explanation
        # -------------------------------------------------------------------
        diagnosis_type = "basic_concept"
        confidence = 0.75
        explanation = ""
        matched_misc: Optional[Misconception] = None
        root_cause_node: Optional[str] = None

        if status == "competent" and not is_misconception and not is_application_gap:
            diagnosis_type = "basic_concept"
            confidence = 0.95
            explanation = (
                f"Officer has achieved statutory competency standard ({overall_score}% >= 75%). "
                f"No structural knowledge deficits or misconceptions detected across multi-source evaluation."
            )
            conclusion = "Officer is fully competent in this statutory domain."

        elif is_application_gap:
            diagnosis_type = "application_gap"
            confidence = min(0.92, 0.80 + (quiz - practical) / 100.0)
            explanation = (
                f"Officer demonstrates sound theoretical knowledge on conceptual quizzes ({quiz}%), "
                f"but exhibits a significant execution drop during practical data processing tasks ({practical}% < 55%). "
                f"This indicates an application/practical gap: the officer understands statistical definitions "
                f"but struggles with practical implementation within survey datasets."
            )
            conclusion = "Application gap detected: strong theoretical grasp with weak practical translation."
            root_cause_node = "practical_execution"

        elif is_misconception:
            diagnosis_type = "statistical_misconception"
            # Confidence increases with repeated errors
            confidence = min(0.96, 0.82 + (repeated_errors * 0.04))
            matched_misc = self._match_misconception_for_competency(competency.id)
            misc_title = matched_misc.title if matched_misc else "Statistical Concept Distortion"

            explanation = (
                f"Systematic cognitive misconception detected: Officer exhibits {repeated_errors} repeated errors "
                f"accompanied by a high-confidence incorrect response pattern. This confirms errors are not random slips, "
                f"but are driven by an entrenched cognitive distortion mapped to '{misc_title}'."
            )
            conclusion = f"Evidence supports an entrenched statistical misconception: '{misc_title}'."
            root_cause_node = matched_misc.concept if matched_misc else competency.id

        elif integrated_check["is_integrated"]:
            diagnosis_type = "integrated_concept"
            confidence = integrated_check["confidence"]
            explanation = integrated_check["explanation"]
            conclusion = integrated_check["conclusion"]
            root_cause_node = integrated_check["root_cause"]
            signals.append({
                "signal": "knowledge_graph_prerequisites",
                "value": integrated_check["prereq_summary"],
                "interpretation": "Prerequisite isolated scores are competent (>= 75%), but integrated synthesis drops (< 60%)",
            })

        elif integrated_check.get("insufficient_evidence"):
            diagnosis_type = "insufficient_evidence"
            status = "inconclusive"
            confidence = 0.50
            explanation = (
                f"Diagnostic evaluation inconclusive: Competency '{competency.name}' requires mastery of prerequisite "
                f"concepts in the knowledge graph, but prerequisite performance evidence is missing or incomplete for this officer. "
                f"Under diagnostic safety protocols, missing evidence is safely classified as 'insufficient_evidence' "
                f"rather than assuming a foundational concept gap or an integrated gap."
            )
            conclusion = "Inconclusive: Missing prerequisite performance evidence; cannot determine if gap is integrated or isolated."
            root_cause_node = None
            signals.append({
                "signal": "knowledge_graph_prerequisites",
                "value": "Missing prerequisite records",
                "interpretation": "Prerequisite evidence unavailable to substantiate integrated gap",
            })

        else:
            # Rule 4: Basic Concept Gap
            diagnosis_type = "basic_concept"
            confidence = 0.84 if (assessment < 60 and quiz < 60) else 0.72
            explanation = (
                f"Foundational knowledge deficit detected: Overall competency score ({overall_score}%) is below statutory "
                f"threshold (75%), with low performance across both formal assessment ({assessment}%) and micro-quizzes ({quiz}%). "
                f"Absence of high-confidence response errors indicates an unformed conceptual baseline rather than an active misconception."
            )
            conclusion = "Basic conceptual gap: foundational methodology study recommended."

        # Compile Reasoning Trace
        reasoning_trace = {
            "diagnosis_type": diagnosis_type,
            "overall_score": overall_score,
            "gap_points": gap_points,
            "severity": status,
            "signals": signals,
            "conclusion": conclusion,
            "has_prerequisites": integrated_check.get("has_prereqs", False),
        }

        # Snapshot of evidence used
        evidence_snapshot = {
            "assessment_score": assessment,
            "quiz_accuracy": quiz,
            "practical_performance": practical,
            "repeated_errors": repeated_errors,
            "confidence_pattern": evidence.confidence_pattern if evidence else "N/A",
            "assessment_ratio": evidence.assessment_ratio if evidence else "N/A",
        }

        diagnosis = GapDiagnosis(
            officer_profile_id=profile.id,
            competency_id=competency.id,
            diagnosis_type=diagnosis_type,
            severity=status,
            confidence=round(confidence, 2),
            explanation=explanation,
            evidence_references=json.dumps(evidence_snapshot),
            reasoning_trace=json.dumps(reasoning_trace),
            root_cause_competency_id=root_cause_node,
            misconception_id=matched_misc.id if matched_misc else None,
        )

        if persist:
            return self.kg_repo.save_diagnosis(diagnosis)
        return diagnosis

    def _check_integrated_gap(
        self, profile_id: int, competency_id: str, current_score: float
    ) -> Dict[str, Any]:
        """
        Traverses knowledge graph to verify if individual prerequisite concepts are strong
        while the combined target competency drops significantly.
        If prerequisite evidence is missing, explicitly reports insufficient evidence.
        """
        # Find nodes belonging to this competency
        nodes = self.kg_repo.get_nodes_by_competency_id(competency_id)
        if not nodes:
            return {
                "is_integrated": False,
                "has_prereqs": False,
                "insufficient_evidence": True,
                "reason": "No knowledge graph nodes mapped to competency",
            }

        prereq_relationships = []
        for n in nodes:
            prereqs = self.kg_repo.get_prerequisites_for_node(n.id)
            prereq_relationships.extend(prereqs)

        if not prereq_relationships:
            return {
                "is_integrated": False,
                "has_prereqs": False,
                "insufficient_evidence": False,
                "reason": "Competency is foundational; has no prerequisites",
            }

        # Check evidence for prerequisite source nodes
        prereq_evidences: List[Dict[str, Any]] = []
        for rel in prereq_relationships:
            source_node = rel.source_node
            # Check if source node maps to a distinct competency with evidence
            if source_node.competency_id and source_node.competency_id != competency_id:
                ev = self.comp_repo.get_evidence_for_officer(profile_id, source_node.competency_id)
                if ev:
                    sc = CompetencyEvaluationService.calculate_score(
                        ev.assessment_score, ev.quiz_accuracy, ev.practical_performance
                    )
                    prereq_evidences.append({
                        "node_id": source_node.id,
                        "name": source_node.name,
                        "competency_id": source_node.competency_id,
                        "score": sc,
                    })

        if not prereq_evidences:
            # Cannot falsely classify integrated gap when evidence is missing
            return {
                "is_integrated": False,
                "has_prereqs": True,
                "insufficient_evidence": True,
                "reason": "Insufficient prerequisite performance evidence to substantiate an integrated gap",
            }

        # Check if prerequisites are sound (average score >= 75.0) while target drops (< 60)
        avg_prereq_score = sum(p["score"] for p in prereq_evidences) / len(prereq_evidences)
        is_prereqs_strong = avg_prereq_score >= 75.0
        is_target_weak = current_score < 60.0

        if is_prereqs_strong and is_target_weak:
            prereq_names = ", ".join(p["name"] for p in prereq_evidences)
            return {
                "is_integrated": True,
                "has_prereqs": True,
                "insufficient_evidence": False,
                "confidence": min(0.93, 0.80 + (avg_prereq_score - current_score) / 100.0),
                "explanation": (
                    f"Individual prerequisite concepts ({prereq_names}) are at or above competency standard "
                    f"(average {avg_prereq_score:.1f}% >= 75%), but combined performance drops to {current_score}% (< 60%) when "
                    f"these concepts must be synthesized together. This indicates an integrated concept / relationship "
                    f"gap rather than a basic foundational deficit."
                ),
                "conclusion": "Integrated concept gap: prerequisite fundamentals are solid, but inter-concept synthesis fails.",
                "root_cause": prereq_relationships[0].source_node_id,
                "prereq_summary": f"Prerequisites average: {avg_prereq_score:.1f}% (>= 75%) vs Integrated task: {current_score}% (< 60%)",
            }

        return {
            "is_integrated": False,
            "has_prereqs": True,
            "insufficient_evidence": False,
            "reason": "Prerequisite scores do not show a divergence from target score",
        }

    def _match_misconception_for_competency(self, competency_id: str) -> Optional[Misconception]:
        """Matches a known misconception from the repository based on domain mapping."""
        mapping = {
            "comp_stat_analysis": "misc_reg_slope_elasticity",
            "comp_prob_sampling": "misc_conf_interval_param_prob",
            "comp_macro_acc": "misc_gdp_deflator_cpi",
            "comp_survey_method": "misc_stratified_vs_cluster",
            "comp_data_cleaning": "misc_mean_imputation_variance",
        }
        misc_id = mapping.get(competency_id)
        if misc_id:
            return self.kg_repo.get_misconception_by_id(misc_id)
        # Default fallback
        miscs = self.kg_repo.list_misconceptions()
        return miscs[0] if miscs else None
