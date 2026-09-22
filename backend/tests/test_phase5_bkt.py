"""Test suite for Phase 5 — Bayesian Knowledge Tracing (BKT) Service.

Tests cover:
  - BKT prior initialization
  - Correct response update
  - Incorrect response update
  - Mastery bounds [0.0, 1.0]
  - Learning rate effect
  - Guess/slip behavior
  - Repeated observation convergence
  - Mastery threshold flagging
  - Mastery band classification
  - Trajectory tracking
  - Full response sequence
  - Configurable param overrides
"""
import os
import math
import pytest

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"
os.environ["EMBEDDING_PROVIDER"] = "mock"

from backend.app.core.config import settings
from backend.app.services.bkt_service import BKTService


# ===========================================================================
# BKT MATHEMATICAL CORRECTNESS
# ===========================================================================

def test_01_bkt_prior_mastery_default():
    """BKT starts with configured prior mastery probability."""
    # Default prior: 0.25
    assert settings.BKT_PRIOR_MASTERY == 0.25
    assert settings.BKT_LEARNING_RATE == 0.20
    assert settings.BKT_GUESS_PROB == 0.20
    assert settings.BKT_SLIP_PROB == 0.10


def test_02_bkt_correct_response_increases_mastery():
    """A correct response must increase mastery probability."""
    prior = 0.25
    updated = BKTService.update_mastery(prior_mastery=prior, is_correct=True)
    assert updated > prior
    assert 0.0 <= updated <= 1.0


def test_03_bkt_incorrect_response_decreases_mastery():
    """An incorrect response must decrease mastery probability."""
    prior = 0.60
    updated = BKTService.update_mastery(prior_mastery=prior, is_correct=False)
    assert updated < prior
    assert 0.0 <= updated <= 1.0


def test_04_bkt_mastery_always_bounded():
    """BKT mastery must never exceed [0.0, 1.0] for any prior or response."""
    for prior in [0.0, 0.01, 0.25, 0.5, 0.75, 0.99, 1.0]:
        for correct in [True, False]:
            result = BKTService.update_mastery(prior_mastery=prior, is_correct=correct)
            assert 0.0 <= result <= 1.0, (
                f"BKT result {result} out of bounds for prior={prior}, correct={correct}"
            )


def test_05_bkt_learning_rate_effect():
    """Higher learning rate (P_T) must produce faster mastery growth."""
    prior = 0.30
    low_t = BKTService.update_mastery(prior, True, p_transit=0.05)
    high_t = BKTService.update_mastery(prior, True, p_transit=0.50)
    assert high_t > low_t


def test_06_bkt_guess_prob_effect():
    """Higher guess probability (P_G) reduces the diagnostic signal of a correct response."""
    prior = 0.30
    low_g = BKTService.update_mastery(prior, True, p_guess=0.05)
    high_g = BKTService.update_mastery(prior, True, p_guess=0.45)
    # With high guess, a correct response is less informative about mastery
    assert high_g < low_g


def test_07_bkt_slip_prob_effect():
    """Higher slip probability (P_S) reduces the diagnostic signal of an incorrect response."""
    prior = 0.70
    low_s = BKTService.update_mastery(prior, False, p_slip=0.05)
    high_s = BKTService.update_mastery(prior, False, p_slip=0.35)
    # With high slip, an incorrect response is less informative (mastery not as decreased)
    assert high_s > low_s


def test_08_bkt_repeated_correct_responses_approach_mastery():
    """Repeated correct responses must monotonically increase mastery toward 1.0."""
    current = settings.BKT_PRIOR_MASTERY
    prev = current
    for _ in range(20):
        current = BKTService.update_mastery(current, True)
        assert current >= prev - 1e-9  # should not decrease
        prev = current
    # After 20 correct, mastery should be high
    assert current > 0.80


def test_09_bkt_repeated_incorrect_depresses_mastery():
    """Repeated incorrect responses should keep mastery relatively low."""
    current = 0.50
    for _ in range(10):
        current = BKTService.update_mastery(current, False)
    # After 10 incorrect, mastery should be well below 0.5
    # (learning rate will prevent zero, but mastery stays low)
    assert current < 0.50


def test_10_bkt_mastery_flag_threshold():
    """is_mastered returns True only above configured threshold."""
    threshold = settings.BKT_MASTERY_THRESHOLD  # 0.85
    assert BKTService.is_mastered(0.90) is True
    assert BKTService.is_mastered(threshold) is True
    assert BKTService.is_mastered(threshold - 0.01) is False
    assert BKTService.is_mastered(0.50) is False


def test_11_bkt_mastery_flag_custom_threshold():
    """is_mastered respects custom threshold override."""
    assert BKTService.is_mastered(0.60, threshold=0.55) is True
    assert BKTService.is_mastered(0.60, threshold=0.70) is False


def test_12_bkt_mastery_bands_classification():
    """mastery_band returns correct band labels for all ranges."""
    threshold = settings.BKT_MASTERY_THRESHOLD
    assert BKTService.mastery_band(0.05) == "not_started"
    assert BKTService.mastery_band(0.20) == "developing"
    assert BKTService.mastery_band(0.30) == "developing"
    assert BKTService.mastery_band(0.50) == "approaching"
    assert BKTService.mastery_band(0.70) == "approaching"
    assert BKTService.mastery_band(0.75) == "likely_mastered"
    assert BKTService.mastery_band(0.80) == "likely_mastered"
    assert BKTService.mastery_band(threshold) == "mastered"
    assert BKTService.mastery_band(0.95) == "mastered"


def test_13_bkt_trajectory_tracking():
    """compute_mastery_from_responses returns correct trajectory length."""
    responses = [True, False, True, True, False]
    final, trajectory = BKTService.compute_mastery_from_responses(responses)
    assert len(trajectory) == len(responses)
    assert 0.0 <= final <= 1.0
    for m in trajectory:
        assert 0.0 <= m <= 1.0


def test_14_bkt_empty_response_sequence():
    """Empty response sequence returns prior mastery with empty trajectory."""
    final, trajectory = BKTService.compute_mastery_from_responses(
        [], prior_mastery=0.30
    )
    assert final == 0.30
    assert trajectory == []


def test_15_bkt_all_correct_sequence():
    """All-correct sequence monotonically increases mastery."""
    _, trajectory = BKTService.compute_mastery_from_responses(
        [True] * 8, prior_mastery=0.25
    )
    for i in range(1, len(trajectory)):
        assert trajectory[i] >= trajectory[i - 1] - 1e-9


def test_16_bkt_param_override_in_sequence():
    """Custom BKT params in sequence computation are respected."""
    # High learning rate: all-correct should converge faster
    _, traj_fast = BKTService.compute_mastery_from_responses(
        [True] * 5, prior_mastery=0.25, p_transit=0.50
    )
    _, traj_slow = BKTService.compute_mastery_from_responses(
        [True] * 5, prior_mastery=0.25, p_transit=0.05
    )
    assert traj_fast[-1] > traj_slow[-1]


def test_17_bkt_mastery_not_equivalent_to_verification():
    """Mastery probability should be clearly distinct from Phase 6 verified competency.

    This test enforces the scientific integrity constraint:
    BKT mastery probability >= threshold does NOT mean the officer is VERIFIED.
    It only means the model estimates high probability of knowledge acquisition.
    The test asserts the BKT output is a probability in [0,1], not a boolean clearance.
    """
    result = BKTService.update_mastery(0.90, True)
    assert isinstance(result, float)
    assert 0.0 <= result <= 1.0
    # The result is a probability estimate, not a verification status
    assert result != "verified"
    assert result != "VERIFIED"
