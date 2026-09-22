"""Abstract Base Class (Contract) for iGOT Karmayogi Adapters.

The integration layer depends exclusively on this contract.
Future authorized deployment will allow replacing MockIGOTAdapter with RealIGOTAdapter
without modifying the STAT-GAP AI intelligence core.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional

from backend.app.integrations.igot.models import (
    IGOTCompetencyExport,
    IGOTCourseCompletion,
    IGOTLearningRecord,
    IGOTSyncResult,
)


class IGOTAdapter(ABC):
    """Abstract interface defining the iGOT integration contract."""

    @abstractmethod
    def fetch_learning_records(self, officer_igot_id: str) -> List[IGOTLearningRecord]:
        """Fetches completed learning records for a specific officer from iGOT."""
        pass

    @abstractmethod
    def fetch_course_completion(
        self, external_reference_id: str, officer_igot_id: str
    ) -> Optional[IGOTCourseCompletion]:
        """Fetches detailed completion evidence for a specific course reference."""
        pass

    @abstractmethod
    def publish_competency_verification(
        self, export_payload: IGOTCompetencyExport
    ) -> IGOTSyncResult:
        """Publishes verified competency status to the iGOT platform."""
        pass

    @abstractmethod
    def publish_learning_status(
        self, officer_igot_id: str, competency_id: str, status: str
    ) -> IGOTSyncResult:
        """Publishes learning progress status to the iGOT platform."""
        pass
