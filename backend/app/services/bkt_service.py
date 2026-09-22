"""Bayesian Knowledge Tracing (BKT) Service — Phase 5 Prototype Implementation.

BKT Models the probability that an officer has mastered a skill/concept
given a sequence of observed correct/incorrect responses.

Standard 4-parameter BKT model:
    P(L0): Prior mastery probability.
    P(T):  Transition (learning) probability — chance of moving from unmastered to mastered per response.
    P(G):  Guess probability — chance of correct response despite non-mastery.
    P(S):  Slip probability — chance of incorrect response despite mastery.

Update formula (derived from Corbett & Anderson 1994):
    After a correct response:
        P(Ln+1 | correct) = P(Ln | correct) / (P(Ln | correct) + P(~Ln | correct))

    After an incorrect response:
        P(Ln+1 | incorrect) = P(Ln | incorrect) / (P(Ln | incorrect) + P(~Ln | incorrect))

    Followed by the transition update:
        P(Ln+1) = P(Ln) + (1 - P(Ln)) * P(T)

NOTE ON SCIENTIFIC HONESTY:
    All default BKT parameters in this implementation are prototype heuristics
    set for architectural demonstration only. They are NOT empirically calibrated
    from civil service assessment data. National calibration is required before
    use in authoritative competency measurement contexts.

    BKT mastery probability is NOT equivalent to certified competency.
    Independent verification (Phase 6) remains the authoritative gating mechanism.
"""
from __future__ import annotations

import math
from typing import List, Optional, Tuple

from backend.app.core.config import settings


class BKTService:
    """Bayesian Knowledge Tracing Service.

    All computations are deterministic given the same parameters and
    response sequence. No database operations — purely a mathematical layer.
    """

    @staticmethod
    def update_mastery(
        prior_mastery: float,
        is_correct: bool,
        p_guess: Optional[float] = None,
        p_slip: Optional[float] = None,
        p_transit: Optional[float] = None,
    ) -> float:
        """Performs a single BKT update step.

        Returns updated P(mastery) after observing one response (correct or incorrect),
        guaranteed to remain within [0.0, 1.0].

        Args:
            prior_mastery: P(Ln) — current mastery probability (0.0 – 1.0).
            is_correct:    Whether the observed response was correct.
            p_guess:       P(G) — guess probability (default from settings).
            p_slip:        P(S) — slip probability (default from settings).
            p_transit:     P(T) — learning/transition probability (default from settings).

        Returns:
            Updated mastery probability P(Ln+1) in [0.0, 1.0].
        """
        g = p_guess if p_guess is not None else settings.BKT_GUESS_PROB
        s = p_slip if p_slip is not None else settings.BKT_SLIP_PROB
        t = p_transit if p_transit is not None else settings.BKT_LEARNING_RATE

        # Clamp prior to (0, 1) exclusive to avoid degenerate states
        ln = max(1e-9, min(1.0 - 1e-9, float(prior_mastery)))

        if is_correct:
            # P(correct | mastery) = 1 - P(S); P(correct | ~mastery) = P(G)
            p_correct_given_mastery = 1.0 - s
            p_correct_given_non_mastery = g
            numerator = p_correct_given_mastery * ln
            denominator = numerator + p_correct_given_non_mastery * (1.0 - ln)
        else:
            # P(incorrect | mastery) = P(S); P(incorrect | ~mastery) = 1 - P(G)
            p_incorrect_given_mastery = s
            p_incorrect_given_non_mastery = 1.0 - g
            numerator = p_incorrect_given_mastery * ln
            denominator = numerator + p_incorrect_given_non_mastery * (1.0 - ln)

        # Numerical safety: denominator should never be 0 with valid params
        if denominator < 1e-12:
            p_post = ln
        else:
            p_post = numerator / denominator

        # Apply transition: learner may transition from non-mastered to mastered
        p_next = p_post + (1.0 - p_post) * t

        return round(max(0.0, min(1.0, p_next)), 6)

    @classmethod
    def compute_mastery_from_responses(
        cls,
        responses: List[bool],
        prior_mastery: Optional[float] = None,
        p_guess: Optional[float] = None,
        p_slip: Optional[float] = None,
        p_transit: Optional[float] = None,
    ) -> Tuple[float, List[float]]:
        """Applies BKT updates for a full sequence of responses.

        Args:
            responses:     Ordered list of boolean response correctness values.
            prior_mastery: Initial P(L0) (default from settings).
            p_guess:       P(G) override (default from settings).
            p_slip:        P(S) override (default from settings).
            p_transit:     P(T) override (default from settings).

        Returns:
            Tuple of (final_mastery_probability, trajectory_list)
            where trajectory_list contains mastery probability after each response.
        """
        current = prior_mastery if prior_mastery is not None else settings.BKT_PRIOR_MASTERY
        trajectory: List[float] = []

        for is_correct in responses:
            current = cls.update_mastery(
                prior_mastery=current,
                is_correct=is_correct,
                p_guess=p_guess,
                p_slip=p_slip,
                p_transit=p_transit,
            )
            trajectory.append(current)

        return current, trajectory

    @classmethod
    def is_mastered(
        cls,
        mastery_probability: float,
        threshold: Optional[float] = None,
    ) -> bool:
        """Returns True if mastery probability exceeds the configured mastery threshold.

        IMPORTANT: mastery flag is NOT equivalent to verified competency.
        Independent verification (Phase 6) is the authoritative gating mechanism.
        """
        t = threshold if threshold is not None else settings.BKT_MASTERY_THRESHOLD
        return mastery_probability >= t

    @classmethod
    def mastery_band(cls, mastery_probability: float) -> str:
        """Returns interpretable mastery band label for display purposes.

        Returns:
            'not_started'    — below 0.20
            'developing'     — 0.20 to < 0.50
            'approaching'    — 0.50 to < 0.75
            'likely_mastered' — 0.75 to < BKT_MASTERY_THRESHOLD
            'mastered'       — >= BKT_MASTERY_THRESHOLD
        """
        threshold = settings.BKT_MASTERY_THRESHOLD
        if mastery_probability < 0.20:
            return "not_started"
        elif mastery_probability < 0.50:
            return "developing"
        elif mastery_probability < 0.75:
            return "approaching"
        elif mastery_probability < threshold:
            return "likely_mastered"
        return "mastered"
