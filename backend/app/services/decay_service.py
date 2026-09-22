"""Knowledge Decay Service based on deterministic Ebbinghaus exponential decay.

Formula:
    R(t) = R_0 * exp(-t / S)

where:
    t: Elapsed days since last verified interaction or assessment
    S: Stability (half-life scaling factor in days), deterministically calculated from
       independent and practical verification scores.
    R_0: Baseline retention at t=0 (default 1.0)

Stability Formula:
    Composite score C:
        If competency requires practical verification:
            C = 0.70 * independent_score + 0.30 * practical_score
        Else:
            C = independent_score

    score_factor = (C - 75.0) / 25.0
    stability_days = S_0 * (1.0 + 0.40 * score_factor)
    where S_0 = 65.0 days.

    Boundary Behavior:
        Clamped strictly to [30.0, 95.0] days.
        - C = 75.0 -> S = 65.0 days
        - C = 100.0 -> S = 91.0 days
        - C = 50.0 -> S = 39.0 days
        - C <= 0.0 -> S = 30.0 days (clamped minimum)
        - C >= 105.0 -> S = 95.0 days (clamped maximum)
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.retention import KnowledgeRetention


class KnowledgeDecayService:
    @staticmethod
    def calculate_stability_days(
        independent_score: float,
        practical_score: Optional[float] = None,
        requires_practical: bool = False,
    ) -> float:
        """Deterministic prototype stability formula for knowledge retention.
        
        Guarantees:
        - Output in range [RETENTION_MIN_STABILITY_DAYS, RETENTION_MAX_STABILITY_DAYS] ([30.0, 95.0])
        - Explicitly bounded, reproducible, and tested.
        """
        if requires_practical and practical_score is not None:
            composite = 0.70 * independent_score + 0.30 * practical_score
        else:
            composite = independent_score

        base_stability = settings.RETENTION_BASE_STABILITY_DAYS  # 65.0
        score_factor = (composite - settings.VERIFICATION_PASS_SCORE) / 25.0
        raw_stability = base_stability * (1.0 + 0.40 * score_factor)

        # Enforce minimum and maximum boundaries
        stability = max(
            settings.RETENTION_MIN_STABILITY_DAYS,
            min(settings.RETENTION_MAX_STABILITY_DAYS, raw_stability),
        )
        return round(stability, 2)

    @staticmethod
    def calculate_retention(
        days_elapsed: int | float,
        stability_days: float,
        baseline_retention: float = 1.0,
    ) -> float:
        """Computes current retention probability R(t) = R_0 * exp(-t / S).
        
        Never negative, capped at baseline_retention.
        """
        if days_elapsed <= 0:
            return float(baseline_retention)
        if stability_days <= 0:
            return 0.0

        r_t = baseline_retention * math.exp(-float(days_elapsed) / float(stability_days))
        return round(max(0.0, min(1.0, r_t)), 4)

    @staticmethod
    def determine_risk_level(retention_score: float) -> str:
        """Categorizes retention into low, moderate, at_risk, or critical."""
        if retention_score >= settings.RETENTION_STABLE_THRESHOLD:  # 0.75
            return "low"
        elif retention_score >= settings.RETENTION_MONITORING_THRESHOLD:  # 0.60
            return "moderate"
        elif retention_score >= settings.RETENTION_AT_RISK_THRESHOLD:  # 0.45
            return "at_risk"
        else:
            return "critical"

    @classmethod
    def evaluate_officer_retention(
        cls,
        db: Session,
        officer_id: int,
        competency_id: str,
        days_elapsed: Optional[int] = None,
        stability_days: Optional[float] = None,
    ) -> KnowledgeRetention:
        """Evaluates or updates the retention record for an officer competency."""
        retention = (
            db.query(KnowledgeRetention)
            .filter(
                KnowledgeRetention.officer_id == officer_id,
                KnowledgeRetention.competency_id == competency_id,
            )
            .first()
        )

        now = datetime.now(timezone.utc)

        if retention is None:
            s_days = stability_days if stability_days is not None else settings.RETENTION_BASE_STABILITY_DAYS
            d_elapsed = days_elapsed if days_elapsed is not None else 0
            retention_score = cls.calculate_retention(d_elapsed, s_days)
            risk = cls.determine_risk_level(retention_score)

            retention = KnowledgeRetention(
                officer_id=officer_id,
                competency_id=competency_id,
                baseline_retention=1.0,
                stability_days=s_days,
                calculated_retention=retention_score,
                risk_level=risk,
                days_since_last_interaction=d_elapsed,
                last_evaluated_at=now,
                decay_parameters={
                    "base_stability": settings.RETENTION_BASE_STABILITY_DAYS,
                    "model": "ebbinghaus_exponential",
                },
            )
            db.add(retention)
        else:
            if stability_days is not None:
                retention.stability_days = stability_days
            if days_elapsed is not None:
                retention.days_since_last_interaction = days_elapsed

            retention_score = cls.calculate_retention(
                retention.days_since_last_interaction,
                retention.stability_days,
                retention.baseline_retention,
            )
            retention.calculated_retention = retention_score
            retention.risk_level = cls.determine_risk_level(retention_score)
            retention.last_evaluated_at = now

        # Record audit event
        audit_event = CompetencyAuditEvent(
            officer_id=officer_id,
            competency_id=competency_id,
            event_type="retention_calculated",
            actor="system",
            event_data={
                "stability_days": retention.stability_days,
                "days_since_last_interaction": retention.days_since_last_interaction,
                "calculated_retention": retention.calculated_retention,
                "risk_level": retention.risk_level,
            },
            timestamp=now,
        )
        db.add(audit_event)
        db.commit()
        db.refresh(retention)
        return retention
