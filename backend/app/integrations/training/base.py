"""Abstract Base Class and normalized contracts for Training Providers — Phase 7."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class NormalizedTrainingResource:
    """Normalized training resource object produced by provider adapters."""
    external_reference_id: str
    provider: str  # 'igot', 'nssta', 'tpac'
    title: str
    description: str
    competency_id: str
    subskills: List[str] = field(default_factory=list)
    prerequisites: List[str] = field(default_factory=list)
    duration_hours: float = 10.0
    delivery_mode: str = "online_self_paced"  # 'online_self_paced', 'classroom_residential', 'blended', 'virtual_instructor_led'
    difficulty_level: str = "intermediate"  # 'foundational', 'intermediate', 'advanced'
    programme_priority: str = "standard"  # 'mandatory', 'high', 'standard', 'recommended'
    target_cadre: List[str] = field(default_factory=list)
    syllabus_highlights: List[str] = field(default_factory=list)
    status: str = "active"
    is_mock: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProviderStatus:
    provider: str
    name: str
    mode: str  # 'mock', 'real', 'catalogue'
    is_configured: bool
    description: str


@dataclass
class ProviderActionResult:
    status: str  # 'enrolled', 'not_configured', 'failed', 'mock_success'
    provider: str
    resource_id: str
    officer_id: str
    message: str
    is_mock: bool = True
    timestamp: datetime = field(default_factory=datetime.utcnow)


class TrainingProviderAdapter(ABC):
    """Abstract interface for all training provider adapters (iGOT, NSSTA, TPAC)."""

    @abstractmethod
    def get_provider_code(self) -> str:
        """Returns the unique provider identifier code (e.g. 'igot', 'nssta', 'tpac')."""
        pass

    @abstractmethod
    def get_display_name(self) -> str:
        """Returns human-readable name of provider."""
        pass

    @abstractmethod
    def get_status(self) -> ProviderStatus:
        """Returns current integration and configuration status."""
        pass

    @abstractmethod
    def fetch_catalogue(self) -> List[NormalizedTrainingResource]:
        """Fetches and normalizes all available training programmes/resources from this provider."""
        pass

    @abstractmethod
    def enroll_officer(self, officer_id: str, officer_igot_id: str, resource_ref_id: str) -> ProviderActionResult:
        """Handles officer enrollment in the provider programme."""
        pass
