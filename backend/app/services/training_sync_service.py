"""Training Catalogue Synchronization Service — Phase 7.

Handles idempotent synchronization of training resources from all configured adapters
(iGOT, NSSTA, TPAC) into the local database, ensuring stable IDs and auditability.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.integrations.training.base import NormalizedTrainingResource
from backend.app.integrations.training.factory import get_training_adapters
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.training_resource import TrainingResource


class TrainingSyncService:
    """Service for synchronizing training resources from provider adapters."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def generate_stable_id(self, provider: str, external_ref: str) -> str:
        """Generates deterministic, stable ID for a given provider and reference."""
        h = hashlib.sha256(f"{provider}:{external_ref}".encode("utf-8")).hexdigest()[:10].upper()
        return f"TR-{provider.upper()}-{h}"

    def sync_all_catalogues(self, actor: str = "system", correlation_id: Optional[str] = None) -> Dict[str, Any]:
        """Synchronizes catalogues across all registered providers idempotently."""
        adapters = get_training_adapters()
        total_synced = 0
        created_count = 0
        updated_count = 0
        provider_counts: Dict[str, int] = {}

        for p_code, adapter in adapters.items():
            resources = adapter.fetch_catalogue()
            p_synced, p_created, p_updated = self.sync_provider_resources(p_code, resources)
            provider_counts[p_code] = p_synced
            total_synced += p_synced
            created_count += p_created
            updated_count += p_updated

        # Record audit event
        audit_event = CompetencyAuditEvent(
            officer_id=None,
            event_type="training_catalogue_synced",
            actor=actor,
            event_data={
                "total_synced": total_synced,
                "created_count": created_count,
                "updated_count": updated_count,
                "provider_counts": provider_counts,
                "correlation_id": correlation_id,
            },
            timestamp=datetime.now(timezone.utc),
        )
        self.db.add(audit_event)
        self.db.commit()

        return {
            "status": "success",
            "total_synced": total_synced,
            "created_count": created_count,
            "updated_count": updated_count,
            "providers": provider_counts,
            "correlation_id": correlation_id,
            "timestamp": datetime.now(timezone.utc),
        }

    def sync_provider_resources(
        self, provider_code: str, resources: List[NormalizedTrainingResource]
    ) -> tuple[int, int, int]:
        """Synchronizes a list of normalized resources for a single provider."""
        synced = 0
        created = 0
        updated = 0

        for item in resources:
            stable_id = self.generate_stable_id(item.provider, item.external_reference_id)
            existing = (
                self.db.query(TrainingResource)
                .filter(
                    TrainingResource.provider == item.provider,
                    TrainingResource.external_reference_id == item.external_reference_id,
                )
                .first()
            )

            if existing:
                # Update fields if changed
                existing.title = item.title
                existing.description = item.description
                existing.competency_id = item.competency_id
                existing.subskills = item.subskills
                existing.prerequisites = item.prerequisites
                existing.duration_hours = item.duration_hours
                existing.delivery_mode = item.delivery_mode
                existing.difficulty_level = item.difficulty_level
                existing.programme_priority = item.programme_priority
                existing.target_cadre = item.target_cadre
                existing.syllabus_highlights = item.syllabus_highlights
                existing.status = item.status
                existing.is_mock = item.is_mock
                existing.metadata_json = item.metadata
                updated += 1
            else:
                new_resource = TrainingResource(
                    id=stable_id,
                    provider=item.provider,
                    external_reference_id=item.external_reference_id,
                    title=item.title,
                    description=item.description,
                    competency_id=item.competency_id,
                    subskills=item.subskills,
                    prerequisites=item.prerequisites,
                    duration_hours=item.duration_hours,
                    delivery_mode=item.delivery_mode,
                    difficulty_level=item.difficulty_level,
                    programme_priority=item.programme_priority,
                    target_cadre=item.target_cadre,
                    syllabus_highlights=item.syllabus_highlights,
                    status=item.status,
                    is_mock=item.is_mock,
                    metadata_json=item.metadata,
                )
                self.db.add(new_resource)
                created += 1

            synced += 1

        self.db.flush()
        return synced, created, updated
