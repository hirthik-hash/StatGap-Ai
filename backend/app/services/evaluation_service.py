"""Competency Evaluation Engine: Deterministic Prototype Weighted Gap Model and Status Classification.

IMPORTANT NOTE ON SCIENTIFIC HONESTY:
The scoring weights (0.35 Assessment, 0.20 Quiz, 0.30 Practical, 0.15 External) and
gap visualization thresholds (Red >= 0.35, Orange 0.15-0.35, Green < 0.15) represent
configurable prototype parameters for architectural validation.
They are NOT empirically validated government competency weights.
They must be calibrated against civil service field performance data in future deployments.
The LLM is strictly prohibited from modifying or determining authoritative competency scores.
"""
from typing import Dict, Any, Optional
from backend.app.core.config import settings


class CompetencyEvaluationService:
    # ---------------------------------------------------------------------------
    # Prototype Configurable Weights & Thresholds
    # ---------------------------------------------------------------------------
    DEFAULT_WEIGHTS: Dict[str, float] = {
        "assessment": settings.SCORING_WEIGHT_ASSESSMENT,  # 0.35
        "quiz": settings.SCORING_WEIGHT_QUIZ,              # 0.20
        "practical": settings.SCORING_WEIGHT_PRACTICAL,    # 0.30
        "external": settings.SCORING_WEIGHT_EXTERNAL,      # 0.15
    }

    GAP_BAND_RED: float = settings.GAP_THRESHOLD_RED        # 0.35
    GAP_BAND_ORANGE: float = settings.GAP_THRESHOLD_ORANGE  # 0.15

    # Legacy Backward-Compatibility Thresholds (0-100 scale)
    WEIGHT_ASSESSMENT: float = 0.40
    WEIGHT_QUIZ: float = 0.30
    WEIGHT_PRACTICAL: float = 0.30
    THRESHOLD_CRITICAL_GAP: float = 50.0
    THRESHOLD_COMPETENT: float = 75.0

    # ---------------------------------------------------------------------------
    # Validation & Normalization Helpers
    # ---------------------------------------------------------------------------
    @classmethod
    def validate_weights(cls, weights: Dict[str, float]) -> None:
        """
        Validates that:
        1. Required weight keys ('assessment', 'quiz', 'practical', 'external') are present.
        2. Every weight is non-negative.
        3. Weights sum to 1.0 within floating point precision (1e-5).
        """
        required_keys = {"assessment", "quiz", "practical", "external"}
        missing = required_keys - set(weights.keys())
        if missing:
            raise ValueError(f"Missing required scoring weight keys: {missing}")

        for key, w in weights.items():
            if w < 0.0:
                raise ValueError(f"Weight for '{key}' must be non-negative. Found: {w}")

        weight_sum = sum(weights[k] for k in required_keys)
        if abs(weight_sum - 1.0) > 1e-5:
            raise ValueError(f"Scoring weights must sum to 1.0. Current sum: {weight_sum}")

    @classmethod
    def normalize_score(cls, value: float) -> float:
        """
        Ensures any input score is normalized to the closed interval [0.0, 1.0].
        If a score is passed as a percentage > 1.0 (e.g. 75.0), it is divided by 100.
        Clamped strictly to [0.0, 1.0].
        """
        if value is None:
            return 0.0
        val = float(value)
        if val > 1.0:
            val = val / 100.0
        return max(0.0, min(1.0, round(val, 4)))

    # ---------------------------------------------------------------------------
    # Target Phase 1 Prototype Model: 4-Factor Normalized Scoring
    # ---------------------------------------------------------------------------
    @classmethod
    def calculate_competency(
        cls,
        assessment: float,
        quiz: float,
        practical: float,
        external: float = 0.0,
        weights: Optional[Dict[str, float]] = None,
    ) -> float:
        """
        Prototype 4-Factor Weighted Competency Model:
        Current Competency = 0.35 * Assessment + 0.20 * Quiz + 0.30 * Practical + 0.15 * External
        All inputs and output normalized to [0.0, 1.0].
        """
        active_weights = weights if weights is not None else cls.DEFAULT_WEIGHTS
        cls.validate_weights(active_weights)

        norm_assessment = cls.normalize_score(assessment)
        norm_quiz = cls.normalize_score(quiz)
        norm_practical = cls.normalize_score(practical)
        norm_external = cls.normalize_score(external)

        competency = (
            norm_assessment * active_weights["assessment"]
            + norm_quiz * active_weights["quiz"]
            + norm_practical * active_weights["practical"]
            + norm_external * active_weights["external"]
        )
        return max(0.0, min(1.0, round(competency, 4)))

    @classmethod
    def calculate_gap(cls, required_competency: float, current_competency: float) -> float:
        """
        Deterministic Gap Formula:
        Gap = Required Competency - Current Competency
        Inputs normalized to [0.0, 1.0]. Output bounded to [-1.0, 1.0].
        """
        norm_required = cls.normalize_score(required_competency)
        norm_current = cls.normalize_score(current_competency)
        gap = norm_required - norm_current
        return round(gap, 4)

    @classmethod
    def classify_gap_band(
        cls,
        gap: float,
        red_threshold: Optional[float] = None,
        orange_threshold: Optional[float] = None,
    ) -> str:
        """
        Standardized Visual Traffic-Light Bands:
        - RED: Gap >= 0.35 (Critical Gap)
        - ORANGE: 0.15 <= Gap < 0.35 (Moderate Gap)
        - GREEN: Gap < 0.15 (Competent / Negligible Gap)
        """
        r_thresh = red_threshold if red_threshold is not None else cls.GAP_BAND_RED
        o_thresh = orange_threshold if orange_threshold is not None else cls.GAP_BAND_ORANGE

        if gap >= r_thresh:
            return "red"
        elif gap >= o_thresh:
            return "orange"
        return "green"

    @classmethod
    def evaluate_competency(
        cls,
        assessment: float,
        quiz: float,
        practical: float,
        external: float = 0.0,
        required_competency: float = 0.75,
        weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Full Phase 1 diagnostic evaluation returning normalized proficiency, gap, and band.
        """
        active_weights = weights if weights is not None else cls.DEFAULT_WEIGHTS
        competency = cls.calculate_competency(assessment, quiz, practical, external, active_weights)
        gap = cls.calculate_gap(required_competency, competency)
        display_gap = max(0.0, gap)
        band = cls.classify_gap_band(gap)

        status_mapping = {
            "red": "critical_gap",
            "orange": "moderate_gap",
            "green": "competent",
        }

        return {
            "current_competency": competency,
            "required_competency": cls.normalize_score(required_competency),
            "gap": gap,
            "display_gap": display_gap,
            "band": band,
            "status": status_mapping[band],
            "weights_used": active_weights,
        }

    # ---------------------------------------------------------------------------
    # Legacy Backward-Compatibility Interface (Preserved for existing tests/services)
    # ---------------------------------------------------------------------------
    @classmethod
    def calculate_score(cls, assessment: float, quiz: float, practical: float) -> float:
        """
        Legacy STAT-GAP 3-Factor Scoring Formula (0-100 scale):
        Score = Assessment * 0.40 + Quiz * 0.30 + Practical * 0.30
        Preserved for full backward-compatibility with existing services and tests.
        """
        score = (
            assessment * cls.WEIGHT_ASSESSMENT
            + quiz * cls.WEIGHT_QUIZ
            + practical * cls.WEIGHT_PRACTICAL
        )
        return round(score, 2)

    @classmethod
    def calculate_gap_points(cls, score: float, required_score: float = 75.0) -> int:
        """Legacy gap points calculation: max(0, required_score - score)."""
        gap = required_score - score
        return max(0, int(round(gap)))

    @classmethod
    def classify_status(cls, score: float) -> str:
        """
        Legacy status classification:
        - Critical Gap: score < 50
        - Moderate Gap: 50 <= score < 75
        - Competent: score >= 75
        """
        if score < cls.THRESHOLD_CRITICAL_GAP:
            return "critical_gap"
        elif score < cls.THRESHOLD_COMPETENT:
            return "moderate_gap"
        return "competent"

    @classmethod
    def evaluate(
        cls,
        assessment: float,
        quiz: float,
        practical: float,
        required_score: float = 75.0,
    ) -> Dict[str, Any]:
        """Legacy evaluate method returning 0-100 scale metrics with normalized additions."""
        score = cls.calculate_score(assessment, quiz, practical)
        gap_points = cls.calculate_gap_points(score, required_score)
        status = cls.classify_status(score)

        # Include normalized prototype metrics
        norm_comp = cls.calculate_competency(assessment, quiz, practical, external=0.0)
        norm_req = cls.normalize_score(required_score)
        norm_gap = cls.calculate_gap(norm_req, norm_comp)

        return {
            "score": int(round(score)),
            "score_float": score,
            "gap_points": gap_points,
            "status": status,
            "required_score": int(required_score),
            "normalized_competency": norm_comp,
            "normalized_gap": norm_gap,
            "gap_band": cls.classify_gap_band(norm_gap),
        }
