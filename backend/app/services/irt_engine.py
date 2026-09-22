"""Item Response Theory (IRT) Rasch / 1-Parameter Logistic (1PL) Mathematical Engine.

NOTE ON PSYCHOMETRIC STATUS:
This implementation serves as a genuine Rasch/1PL-based adaptive assessment prototype.
Seeded item difficulty parameters (b) represent expert/prototype calibration values.
They are NOT nationally calibrated or psychometrically validated officer ability estimates.
Empirical calibration on civil service response data is required before operational deployment.
"""
import math
from typing import List, Tuple
from backend.app.core.config import settings


def rasch_probability(theta: float, b: float) -> float:
    """
    Computes P(correct | theta, b) under the Rasch / 1PL model:
    P = 1 / (1 + exp(-(theta - b)))

    Includes numerical bounds clamping to prevent floating-point overflow/underflow.
    """
    diff = theta - b
    if diff > 35.0:
        return 1.0
    if diff < -35.0:
        return 0.0
    return 1.0 / (1.0 + math.exp(-diff))


def item_information(theta: float, b: float) -> float:
    """
    Computes Fisher item information for Rasch/1PL item:
    I(theta) = P(theta, b) * (1 - P(theta, b))
    Maximum information (0.25) occurs at theta = b.
    """
    p = rasch_probability(theta, b)
    return p * (1.0 - p)


def test_information(theta: float, item_difficulties: List[float]) -> float:
    """Computes total test information across an item set at theta."""
    return sum(item_information(theta, b) for b in item_difficulties)


def estimate_ability_map(
    responses: List[Tuple[float, bool]],
    prior_theta: float = 0.0,
    prior_sd: float = 1.0,
    max_iter: int = 30,
    tol: float = 1e-4,
) -> Tuple[float, float]:
    """
    Maximum A Posteriori (MAP) estimation for latent ability theta under a normal prior N(prior_theta, prior_sd^2).
    
    Arguments:
        responses: List of (item_difficulty_b, is_correct) tuples.
        prior_theta: Prior mean (from baseline competency evidence or 0.0).
        prior_sd: Prior standard deviation (default 1.0).
        max_iter: Maximum Newton-Raphson iterations.
        tol: Convergence tolerance for step size.

    Returns:
        (estimated_theta, standard_error)
        - Strictly bounded to [IRT_THETA_MIN, IRT_THETA_MAX].
        - Completely avoids divergence on all-correct or all-incorrect response vectors.
    """
    if not responses:
        se = prior_sd
        return round(prior_theta, 4), round(se, 4)

    prior_var = prior_sd * prior_sd
    theta = prior_theta

    for _ in range(max_iter):
        score_func = 0.0
        info_sum = 0.0

        for b, is_correct in responses:
            p = rasch_probability(theta, b)
            u = 1.0 if is_correct else 0.0
            score_func += (u - p)
            info_sum += p * (1.0 - p)

        # Prior contributions
        grad = score_func - (theta - prior_theta) / prior_var
        hessian = -info_sum - (1.0 / prior_var)

        # Newton-Raphson step (hessian is strictly negative everywhere)
        step = grad / hessian
        # Dampen step to prevent wild oscillation
        step = max(-1.2, min(1.2, step))
        theta_new = theta - step

        # Clamp to configured operational range
        theta_new = max(settings.IRT_THETA_MIN, min(settings.IRT_THETA_MAX, theta_new))

        if abs(theta_new - theta) < tol:
            theta = theta_new
            break
        theta = theta_new

    # Compute final standard error from observed posterior information
    final_info = sum(item_information(theta, b) for b, _ in responses) + (1.0 / prior_var)
    se = 1.0 / math.sqrt(max(1e-6, final_info))

    return round(theta, 4), round(se, 4)


def calculate_standard_error(theta: float, item_difficulties: List[float], prior_sd: float = 1.0) -> float:
    """Computes posterior standard error of measurement at theta."""
    prior_var = prior_sd * prior_sd
    info = test_information(theta, item_difficulties) + (1.0 / prior_var)
    return round(1.0 / math.sqrt(max(1e-6, info)), 4)


def map_difficulty_to_label(b: float) -> str:
    """
    Cosmetic presentation mapping for existing UI components only.
    Selection is driven by numerical IRT b and item information, NEVER by this label.
    """
    if b < -0.75:
        return "easy"
    elif b <= 0.75:
        return "medium"
    else:
        return "hard"


get_difficulty_label = map_difficulty_to_label


def determine_ability_band(theta: float) -> str:
    """
    Maps latent ability theta to human-interpretable prototype capability bands.
    These are prototype interpretation categories, not national statutory designations.
    """
    if theta < -1.0:
        return "developing"
    elif theta < 0.2:
        return "foundational"
    elif theta < 1.5:
        return "proficient"
    else:
        return "advanced"


get_ability_band = determine_ability_band


def theta_to_score_percent(theta: float) -> int:
    """Logistic normalization of latent ability theta into a 0-100 competency score."""
    p = 1.0 / (1.0 + math.exp(-theta))
    return int(round(p * 100))
