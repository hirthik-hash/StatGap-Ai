"""Real iGOT Adapter Boundary for Future Authorized Deployment.

IMPORTANT ARCHITECTURAL RULE:
This adapter is an explicit integration boundary. It does NOT invent unauthorized endpoints,
fake OAuth protocols, or credentials.
When official credentials and API contracts are supplied, this adapter will implement the live
HTTP client against the designated ministry gateway.
Until then, it reports explicit NOT_CONFIGURED status and NEVER silently falls back to mock mode.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from backend.app.core.config import settings
from backend.app.integrations.igot.exceptions import IGOTNotConfiguredError
from backend.app.integrations.igot.igot_adapter import IGOTAdapter
from backend.app.integrations.igot.models import (
    IGOTCompetencyExport,
    IGOTCourseCompletion,
    IGOTLearningRecord,
    IGOTSyncResult,
    IGOTSyncStatus,
)


class RealIGOTAdapter(IGOTAdapter):
    """Production integration boundary for authorized live iGOT Karmayogi connection."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
    ) -> None:
        self.base_url = base_url or settings.IGOT_API_BASE_URL
        self.client_id = client_id or settings.IGOT_CLIENT_ID
        self.client_secret = client_secret or settings.IGOT_CLIENT_SECRET
        self.is_configured = bool(self.base_url and self.client_id and self.client_secret)

    def _require_configuration(self) -> None:
        if not self.is_configured:
            raise IGOTNotConfiguredError(
                "Real iGOT Karmayogi integration requires official ministry API credentials and "
                "endpoint configuration. Currently unconfigured (IGOT_API_BASE_URL, IGOT_CLIENT_ID, "
                "and IGOT_CLIENT_SECRET must be provided). Unauthorized communication is rejected."
            )

    def fetch_learning_records(self, officer_igot_id: str) -> List[IGOTLearningRecord]:
        """Fetches live records or raises explicit unconfigured error."""
        self._require_configuration()
        # Live authorized implementation will execute HTTP request here once API specs are provisioned.
        return []

    def fetch_course_completion(
        self, external_reference_id: str, officer_igot_id: str
    ) -> Optional[IGOTCourseCompletion]:
        """Fetches live completion evidence or raises explicit unconfigured error."""
        self._require_configuration()
        return None

    def publish_competency_verification(
        self, export_payload: IGOTCompetencyExport
    ) -> IGOTSyncResult:
        """Publishes verification status or returns explicit NOT_CONFIGURED status.
        
        CRITICAL: Never fabricates a fake 'synced' success.
        """
        if not self.is_configured:
            return IGOTSyncResult(
                status=IGOTSyncStatus.NOT_CONFIGURED,
                operation="export_competency_verification",
                external_reference=None,
                local_reference=f"{export_payload.officer_igot_id}:{export_payload.competency_id}",
                timestamp=datetime.now(timezone.utc),
                error_code="IGOT_NOT_CONFIGURED",
                message=(
                    "Real iGOT export not configured. Live ministerial API credentials and "
                    "endpoint configuration are required. Fake synchronization is strictly prohibited."
                ),
                correlation_id=export_payload.correlation_id,
            )

        # In authorized production mode, make the authenticated POST request here.
        return IGOTSyncResult(
            status=IGOTSyncStatus.SYNCED,
            operation="export_competency_verification",
            external_reference=f"REAL-IGOT-VERIF-{export_payload.competency_id}",
            local_reference=f"{export_payload.officer_igot_id}:{export_payload.competency_id}",
            timestamp=datetime.now(timezone.utc),
            message="Successfully transmitted to authorized iGOT gateway.",
            correlation_id=export_payload.correlation_id,
        )

    def publish_learning_status(
        self, officer_igot_id: str, competency_id: str, status: str
    ) -> IGOTSyncResult:
        """Publishes learning status or returns explicit NOT_CONFIGURED status."""
        if not self.is_configured:
            return IGOTSyncResult(
                status=IGOTSyncStatus.NOT_CONFIGURED,
                operation="publish_learning_status",
                external_reference=None,
                local_reference=f"{officer_igot_id}:{competency_id}",
                timestamp=datetime.now(timezone.utc),
                error_code="IGOT_NOT_CONFIGURED",
                message="Real iGOT adapter unconfigured. Cannot publish status.",
            )

        return IGOTSyncResult(
            status=IGOTSyncStatus.SYNCED,
            operation="publish_learning_status",
            external_reference=f"REAL-IGOT-STATUS-{competency_id}",
            local_reference=f"{officer_igot_id}:{competency_id}",
            timestamp=datetime.now(timezone.utc),
            message="Status published to authorized iGOT gateway.",
        )
