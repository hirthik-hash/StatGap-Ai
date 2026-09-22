"""Adapter Factory for iGOT Karmayogi Integration.

Instantiates the designated adapter based on environment configuration.
"""
from __future__ import annotations

from backend.app.core.config import settings
from backend.app.integrations.igot.igot_adapter import IGOTAdapter
from backend.app.integrations.igot.mock_igot_adapter import MockIGOTAdapter
from backend.app.integrations.igot.real_igot_adapter import RealIGOTAdapter


def get_igot_adapter(mode: str | None = None) -> IGOTAdapter:
    """Returns an instance of IGOTAdapter based on configuration.
    
    CRITICAL RULE:
    If IGOT_MODE is 'authorized', it MUST return RealIGOTAdapter.
    It must NEVER silently fall back to MockIGOTAdapter.
    """
    selected_mode = (mode or settings.IGOT_MODE).lower().strip()

    if selected_mode == "mock":
        return MockIGOTAdapter()
    elif selected_mode == "authorized":
        return RealIGOTAdapter()
    else:
        raise ValueError(
            f"Unsupported IGOT_MODE: '{selected_mode}'. Supported modes are 'mock' or 'authorized'."
        )
