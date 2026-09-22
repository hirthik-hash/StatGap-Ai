"""Core configuration module for STAT-GAP AI Backend"""

import os
from typing import List, Union, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "STAT-GAP AI Platform Backend"
    VERSION: str = "0.2.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"

    # Database Configuration (Strictly PostgreSQL)
    DATABASE_URL: str = (
        "postgresql+psycopg://postgres:password@localhost:5432/statgapai"
    )

    # JWT Authentication Configuration
    # Must be supplied via environment; unsafe placeholders are rejected
    # in non-test modes.
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Gemini & RAG Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_PROVIDER: str = "gemini"  # "gemini" or "mock"
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSION: int = 768
    RAG_TOP_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.50
    # RAG Grounding Thresholds — Single Authoritative Source of Truth
    # Specification (Phase 4): Grounded >= 0.65, Weak [0.48, 0.65), Insufficient < 0.48
    # NOTE ON SCIENTIFIC HONESTY: These thresholds are prototype heuristic gates to defend
    # against hallucination, not empirically validated absolute values.
    # rag_service.py reads from these settings; no hardcoded values are permitted there.
    RAG_GROUNDED_THRESHOLD: float = 0.65
    RAG_WEAK_GROUNDING_THRESHOLD: float = 0.48

    # Configurable Prototype Scoring Weights (Phase 1 Target Specification)
    # NOTE ON SCIENTIFIC HONESTY:
    # These weights (0.35 Assessment, 0.20 Quiz, 0.30 Practical, 0.15 External)
    # represent configurable prototype parameters designed for architectural validation.
    # They are NOT empirically validated government competency weights.
    SCORING_WEIGHT_ASSESSMENT: float = 0.35
    SCORING_WEIGHT_QUIZ: float = 0.20
    SCORING_WEIGHT_PRACTICAL: float = 0.30
    SCORING_WEIGHT_EXTERNAL: float = 0.15

    # Configurable Prototype Gap Thresholds (Phase 1 Target Specification)
    GAP_THRESHOLD_RED: float = 0.35      # Gap >= 0.35 -> Red (Critical Gap)
    GAP_THRESHOLD_ORANGE: float = 0.15   # 0.15 <= Gap < 0.35 -> Orange (Moderate Gap)

    # IRT & Adaptive Assessment Prototype Configuration
    # NOTE ON SCIENTIFIC HONESTY: Prior distributions and stopping standard errors
    # are prototype configurations for Rasch 1PL demonstration, requiring national calibration.
    IRT_THETA_MIN: float = -4.0
    IRT_THETA_MAX: float = 4.0
    ADAPTIVE_MIN_ITEMS: int = 3
    ADAPTIVE_MAX_ITEMS: int = 10
    ADAPTIVE_TARGET_SE: float = 0.38

    # Independent Verification & Knowledge Decay Configuration
    # NOTE ON SCIENTIFIC HONESTY: Ebbinghaus base stability (65 days) and pass criteria
    # are prototype assumptions subject to civil service empirical calibration.
    VERIFICATION_PASS_SCORE: float = 75.0
    VERIFICATION_MIN_INDEPENDENT_SCORE: float = 70.0
    VERIFICATION_MIN_PRACTICAL_SCORE: float = 60.0
    VERIFICATION_VALIDITY_DAYS: int = 90

    RETENTION_BASE_STABILITY_DAYS: float = 65.0
    RETENTION_MIN_STABILITY_DAYS: float = 30.0
    RETENTION_MAX_STABILITY_DAYS: float = 95.0

    RETENTION_STABLE_THRESHOLD: float = 0.75
    RETENTION_MONITORING_THRESHOLD: float = 0.60
    RETENTION_AT_RISK_THRESHOLD: float = 0.45

    # BKT (Bayesian Knowledge Tracing) Prototype Configuration — Phase 5
    # NOTE ON SCIENTIFIC HONESTY:
    # All BKT parameters (L0, T, G, S) are prototype heuristics for architectural demonstration.
    # They are NOT empirically calibrated from civil service performance data.
    BKT_PRIOR_MASTERY: float = 0.25         # P(L0): prior probability of mastery
    BKT_LEARNING_RATE: float = 0.20         # P(T): probability of transitioning to mastery
    BKT_GUESS_PROB: float = 0.20            # P(G): probability of correct response despite non-mastery
    BKT_SLIP_PROB: float = 0.10             # P(S): probability of incorrect response despite mastery
    BKT_MASTERY_THRESHOLD: float = 0.85     # Threshold above which mastery is flagged

    # Task Readiness Prototype Thresholds — Phase 6
    # NOTE ON SCIENTIFIC HONESTY:
    # Task readiness states are policy-configurable parameters, NOT validated occupational thresholds.
    TASK_READINESS_GAP_TOLERANCE: float = 0.05   # Max gap below required level that still counts as READY
    TASK_READINESS_MIN_EVIDENCE_COUNT: int = 1    # Minimum evidence records needed to determine readiness

    # iGOT Integration & Security Hardening
    IGOT_MODE: str = "mock"
    IGOT_API_BASE_URL: Optional[str] = None
    IGOT_CLIENT_ID: Optional[str] = None
    IGOT_CLIENT_SECRET: Optional[str] = None

    # NSSTA & TPAC Training Provider Integration — Phase 7
    NSSTA_MODE: str = "mock"
    NSSTA_API_BASE_URL: Optional[str] = None
    NSSTA_API_KEY: Optional[str] = None
    TPAC_MODE: str = "catalogue"

    # Training Intervention Optimizer Configurable Weights — Phase 7
    # Sum must equal 1.0 (0.30 + 0.20 + 0.20 + 0.15 + 0.05 + 0.05 + 0.05 = 1.0)
    # NOTE ON SCIENTIFIC HONESTY:
    # These weights are prototype architectural parameters for ranking and explanation,
    # not empirical predictors of workplace productivity gains.
    OPTIMIZER_WEIGHT_COMPETENCY: float = 0.30
    OPTIMIZER_WEIGHT_SUBSKILL: float = 0.20
    OPTIMIZER_WEIGHT_GAP: float = 0.20
    OPTIMIZER_WEIGHT_BOTTLENECK: float = 0.15
    OPTIMIZER_WEIGHT_PREREQUISITE: float = 0.05
    OPTIMIZER_WEIGHT_CONSTRAINT: float = 0.05
    OPTIMIZER_WEIGHT_PRIORITY: float = 0.05

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 120

    # Configurable CORS origins supporting:
    # - Vite default port 5173
    # - Existing custom port 3000
    # - Current frontend port 3001
    # - localhost and 127.0.0.1 variants
    # - environment variable overrides
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(
        cls,
        v: Union[str, List[str]],
    ) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return []

    @model_validator(mode="after")
    def validate_jwt_secret(self) -> "Settings":
        placeholder_values = {
            "",
            "CHANGE_ME",
            "CHANGE_ME_TO_A_RANDOM_SECRET",
            "secret",
            "changeme",
        }

        # In automated test mode (pytest) or explicitly configured
        # test environment, provide a safe fallback key if none is provided.
        if (
            os.environ.get("PYTEST_CURRENT_TEST")
            or self.ENVIRONMENT.lower() == "test"
        ):
            if (
                not self.JWT_SECRET_KEY
                or self.JWT_SECRET_KEY.strip() in placeholder_values
            ):
                self.JWT_SECRET_KEY = (
                    "test-only-jwt-secret-key-minimum-32-chars-"
                    "for-testing-purposes-only"
                )
            return self

        # In runtime development/production, reject missing or
        # placeholder keys.
        if (
            not self.JWT_SECRET_KEY
            or self.JWT_SECRET_KEY.strip() in placeholder_values
        ):
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: "
                "JWT_SECRET_KEY is not set or contains an unsafe placeholder. "
                "Please set a cryptographically secure random JWT_SECRET_KEY "
                "in your environment or .env file."
            )

        if len(self.JWT_SECRET_KEY.strip()) < 32:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: "
                "JWT_SECRET_KEY must be at least 32 characters long."
            )

        return self

    @model_validator(mode="after")
    def validate_prototype_parameters(self) -> "Settings":
        weights = [
            self.SCORING_WEIGHT_ASSESSMENT,
            self.SCORING_WEIGHT_QUIZ,
            self.SCORING_WEIGHT_PRACTICAL,
            self.SCORING_WEIGHT_EXTERNAL,
        ]
        for w in weights:
            if w < 0.0:
                raise ValueError(f"Scoring weights must be non-negative. Found: {w}")
        weight_sum = sum(weights)
        if abs(weight_sum - 1.0) > 1e-5:
            raise ValueError(f"Scoring weights must sum to 1.0. Current sum: {weight_sum}")

        optimizer_weights = [
            self.OPTIMIZER_WEIGHT_COMPETENCY,
            self.OPTIMIZER_WEIGHT_SUBSKILL,
            self.OPTIMIZER_WEIGHT_GAP,
            self.OPTIMIZER_WEIGHT_BOTTLENECK,
            self.OPTIMIZER_WEIGHT_PREREQUISITE,
            self.OPTIMIZER_WEIGHT_CONSTRAINT,
            self.OPTIMIZER_WEIGHT_PRIORITY,
        ]
        for ow in optimizer_weights:
            if ow < 0.0:
                raise ValueError(f"Optimizer weights must be non-negative. Found: {ow}")
        ow_sum = sum(optimizer_weights)
        if abs(ow_sum - 1.0) > 1e-5:
            raise ValueError(f"Optimizer weights must sum to 1.0. Current sum: {ow_sum}")

        if not (0.0 < self.GAP_THRESHOLD_ORANGE < self.GAP_THRESHOLD_RED < 1.0):
            raise ValueError(
                f"Invalid gap thresholds: Must satisfy 0.0 < Orange ({self.GAP_THRESHOLD_ORANGE}) "
                f"< Red ({self.GAP_THRESHOLD_RED}) < 1.0"
            )
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()