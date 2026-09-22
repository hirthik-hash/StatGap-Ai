"""Factory and registry for Training Provider Adapters — Phase 7."""
from __future__ import annotations

from typing import Dict

from backend.app.integrations.training.base import TrainingProviderAdapter
from backend.app.integrations.training.igot_adapter import IgotTrainingAdapter
from backend.app.integrations.training.nssta_adapter import NSSTAAdapter
from backend.app.integrations.training.tpac_adapter import TPACProgrammeAdapter

_adapters: Dict[str, TrainingProviderAdapter] = {}


def get_training_adapters() -> Dict[str, TrainingProviderAdapter]:
    """Returns singleton dictionary of all registered training provider adapters."""
    global _adapters
    if not _adapters:
        _adapters = {
            "igot": IgotTrainingAdapter(),
            "nssta": NSSTAAdapter(),
            "tpac": TPACProgrammeAdapter(),
        }
    return _adapters


def get_training_adapter(provider_code: str) -> TrainingProviderAdapter:
    """Returns adapter for a specific provider, or raises ValueError."""
    adapters = get_training_adapters()
    code = provider_code.lower().strip()
    if code not in adapters:
        raise ValueError(f"Unknown training provider code: '{provider_code}'. Registered: {list(adapters.keys())}")
    return adapters[code]
