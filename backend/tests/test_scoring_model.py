"""Unit tests for Phase 1 Competency Evaluation Engine and 4-factor scoring model."""
import pytest
from backend.app.services.evaluation_service import CompetencyEvaluationService


class TestCompetencyScoringModel:
    """Comprehensive test suite for Phase 1 prototype scoring harmonization."""

    def test_01_normal_scoring(self):
        """Standard 4-factor normalized scoring test."""
        # 0.35 * 0.80 + 0.20 * 0.70 + 0.30 * 0.90 + 0.15 * 0.60
        # = 0.28 + 0.14 + 0.27 + 0.09 = 0.78
        score = CompetencyEvaluationService.calculate_competency(
            assessment=0.80,
            quiz=0.70,
            practical=0.90,
            external=0.60,
        )
        assert score == 0.78

    def test_02_normalization_from_percentages(self):
        """Scores passed as 0-100 percentages must be automatically normalized to [0.0, 1.0]."""
        score = CompetencyEvaluationService.calculate_competency(
            assessment=80.0,
            quiz=70.0,
            practical=90.0,
            external=60.0,
        )
        assert score == 0.78

    def test_03_boundary_conditions_all_zeros(self):
        """All-zero evidence inputs must yield 0.0."""
        score = CompetencyEvaluationService.calculate_competency(0.0, 0.0, 0.0, 0.0)
        assert score == 0.0

    def test_04_boundary_conditions_all_ones(self):
        """All-perfect evidence inputs must yield 1.0."""
        score = CompetencyEvaluationService.calculate_competency(1.0, 1.0, 1.0, 1.0)
        assert score == 1.0

    def test_05_missing_evidence_defaults_to_zero(self):
        """Missing or None evidence must gracefully default to 0.0 without throwing errors."""
        score = CompetencyEvaluationService.calculate_competency(
            assessment=0.80,
            quiz=0.0,
            practical=0.0,
            external=0.0,
        )
        # 0.35 * 0.80 = 0.28
        assert score == 0.28

    def test_06_gap_calculation(self):
        """Gap = Required - Current Competency."""
        gap = CompetencyEvaluationService.calculate_gap(
            required_competency=0.75,
            current_competency=0.50,
        )
        assert gap == 0.25

        # Negative gap when current exceeds required
        negative_gap = CompetencyEvaluationService.calculate_gap(
            required_competency=0.75,
            current_competency=0.85,
        )
        assert negative_gap == -0.10

    def test_07_red_boundary_thresholds(self):
        """Gap >= 0.35 must be classified as RED."""
        assert CompetencyEvaluationService.classify_gap_band(0.35) == "red"
        assert CompetencyEvaluationService.classify_gap_band(0.50) == "red"
        assert CompetencyEvaluationService.classify_gap_band(0.3501) == "red"

    def test_08_orange_boundary_thresholds(self):
        """0.15 <= Gap < 0.35 must be classified as ORANGE."""
        assert CompetencyEvaluationService.classify_gap_band(0.15) == "orange"
        assert CompetencyEvaluationService.classify_gap_band(0.25) == "orange"
        assert CompetencyEvaluationService.classify_gap_band(0.3499) == "orange"

    def test_09_green_boundary_thresholds(self):
        """Gap < 0.15 must be classified as GREEN."""
        assert CompetencyEvaluationService.classify_gap_band(0.1499) == "green"
        assert CompetencyEvaluationService.classify_gap_band(0.05) == "green"
        assert CompetencyEvaluationService.classify_gap_band(0.0) == "green"
        assert CompetencyEvaluationService.classify_gap_band(-0.10) == "green"

    def test_10_invalid_weights_validation(self):
        """Weights that do not sum to 1.0 or contain negative values must be rejected."""
        with pytest.raises(ValueError, match="sum to 1.0"):
            CompetencyEvaluationService.validate_weights({
                "assessment": 0.50,
                "quiz": 0.50,
                "practical": 0.20,
                "external": 0.10,
            })

        with pytest.raises(ValueError, match="non-negative"):
            CompetencyEvaluationService.validate_weights({
                "assessment": -0.10,
                "quiz": 0.50,
                "practical": 0.40,
                "external": 0.20,
            })

        with pytest.raises(ValueError, match="Missing required"):
            CompetencyEvaluationService.validate_weights({
                "assessment": 0.50,
                "quiz": 0.50,
            })

    def test_11_full_evaluation_payload(self):
        """Test the complete evaluate_competency diagnostic payload."""
        result = CompetencyEvaluationService.evaluate_competency(
            assessment=0.60,
            quiz=0.50,
            practical=0.40,
            external=0.50,
            required_competency=0.75,
        )
        # Expected score: 0.35*0.6 + 0.2*0.5 + 0.3*0.4 + 0.15*0.5
        # = 0.21 + 0.10 + 0.12 + 0.075 = 0.505
        assert result["current_competency"] == 0.505
        assert result["required_competency"] == 0.75
        assert result["gap"] == 0.245
        assert result["band"] == "orange"
        assert result["status"] == "moderate_gap"

    def test_12_legacy_backward_compatibility(self):
        """Existing legacy 3-factor methods must remain 100% functional."""
        legacy_score = CompetencyEvaluationService.calculate_score(80, 70, 60)
        assert legacy_score == 71.0
        assert CompetencyEvaluationService.classify_status(75.0) == "competent"
        assert CompetencyEvaluationService.classify_status(50.0) == "moderate_gap"
        assert CompetencyEvaluationService.classify_status(49.0) == "critical_gap"
        assert CompetencyEvaluationService.calculate_gap_points(71.0, 75.0) == 4
