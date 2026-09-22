"""Deterministic Evidence Confidence estimation service."""
import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any


class ConfidenceCategory:
    HIGH_CONFIDENCE = "HIGH_CONFIDENCE"
    MODERATE_CONFIDENCE = "MODERATE_CONFIDENCE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class ConfidenceService:
    """
    Deterministic 3-factor Evidence Confidence Engine.
    Evaluates:
    1. Evidence Volume (sample size / count)
    2. Source Agreement (consistency between modalities)
    3. Evidence Recency (temporal freshness)

    Explicitly separates Low Competency from Insufficient Evidence.
    """
    WEIGHT_VOLUME: float = 0.40
    WEIGHT_AGREEMENT: float = 0.35
    WEIGHT_RECENCY: float = 0.25

    THRESHOLD_HIGH: float = 0.75
    THRESHOLD_MODERATE: float = 0.45

    @classmethod
    def calculate_volume_factor(cls, count: int) -> float:
        if count <= 0:
            return 0.05
        elif count == 1:
            return 0.35
        elif count == 2:
            return 0.65
        elif count == 3:
            return 0.85
        return 1.0

    @classmethod
    def calculate_agreement_factor(cls, scores: List[float]) -> float:
        if len(scores) <= 1:
            return 0.5  # Neutral when single source available
        spread = max(scores) - min(scores)
        return max(0.0, min(1.0, round(1.0 - spread, 4)))

    @classmethod
    def calculate_recency_factor(
        cls,
        last_evidence_at: Optional[datetime],
        now: Optional[datetime] = None,
    ) -> float:
        if not last_evidence_at:
            return 0.3  # Untimed evidence fallback

        ref_now = now or datetime.now(timezone.utc)
        # Normalize timezones
        if last_evidence_at.tzinfo is None:
            last_dt = last_evidence_at.replace(tzinfo=timezone.utc)
        else:
            last_dt = last_evidence_at

        if ref_now.tzinfo is None:
            ref_now = ref_now.replace(tzinfo=timezone.utc)

        elapsed_days = max(0, (ref_now - last_dt).days)

        if elapsed_days <= 30:
            return 1.0
        elif elapsed_days <= 90:
            return round(1.0 - 0.25 * ((elapsed_days - 30) / 60.0), 4)
        elif elapsed_days <= 365:
            return round(0.75 - 0.45 * ((elapsed_days - 90) / 275.0), 4)
        return 0.25

    @classmethod
    def evaluate_confidence(
        cls,
        scores: List[float],
        last_evidence_at: Optional[datetime] = None,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Calculates deterministic evidence confidence and provides diagnostic reasons.
        """
        count = len(scores)
        v_factor = cls.calculate_volume_factor(count)
        a_factor = cls.calculate_agreement_factor(scores)
        r_factor = cls.calculate_recency_factor(last_evidence_at, now)

        composite = (
            cls.WEIGHT_VOLUME * v_factor
            + cls.WEIGHT_AGREEMENT * a_factor
            + cls.WEIGHT_RECENCY * r_factor
        )
        score = max(0.0, min(1.0, round(composite, 4)))

        # Categorize
        if score >= cls.THRESHOLD_HIGH:
            category = ConfidenceCategory.HIGH_CONFIDENCE
        elif score >= cls.THRESHOLD_MODERATE:
            category = ConfidenceCategory.MODERATE_CONFIDENCE
        else:
            category = ConfidenceCategory.INSUFFICIENT_EVIDENCE

        # Diagnostic reasons
        reasons = []
        if v_factor < 0.5:
            reasons.append(f"Sparse evidence base: only {count} source(s) recorded")
        if a_factor < 0.5:
            reasons.append("High divergence between assessment modalities")
        if r_factor < 0.5:
            reasons.append("Evidence is stale (> 90 days elapsed)")
        if not reasons:
            reasons.append("Calibrated multi-source observations")

        primary_reason = "; ".join(reasons)

        return {
            "confidence": score,
            "category": category,
            "reason": primary_reason,
            "volume_factor": v_factor,
            "agreement_factor": a_factor,
            "recency_factor": r_factor,
            "is_insufficient_evidence": category == ConfidenceCategory.INSUFFICIENT_EVIDENCE,
        }
