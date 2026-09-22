"""Training Provider Integration Layer — Phase 7."""
from backend.app.integrations.training.base import (
    NormalizedTrainingResource,
    ProviderActionResult,
    ProviderStatus,
    TrainingProviderAdapter,
)
from backend.app.integrations.training.factory import (
    get_training_adapter,
    get_training_adapters,
)
from backend.app.integrations.training.igot_adapter import IgotTrainingAdapter
from backend.app.integrations.training.nssta_adapter import NSSTAAdapter
from backend.app.integrations.training.tpac_adapter import TPACProgrammeAdapter

__all__ = [
    "NormalizedTrainingResource",
    "ProviderStatus",
    "ProviderActionResult",
    "TrainingProviderAdapter",
    "IgotTrainingAdapter",
    "NSSTAAdapter",
    "TPACProgrammeAdapter",
    "get_training_adapters",
    "get_training_adapter",
]
