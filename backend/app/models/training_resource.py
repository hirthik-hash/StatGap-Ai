"""SQLAlchemy model for Normalized Training Resources — Phase 7.

Represents normalized learning resources across multiple national providers:
- iGOT Karmayogi (LMS modules / courses)
- NSSTA (National Statistical Systems Training Academy - workshops, residential programmes)
- TPAC (Training Programme Advisory Committee - approved syllabus & national priority programmes)

StatGap AI operates on this normalized representation rather than provider-specific raw formats.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Index,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class TrainingResource(Base):
    """Normalized training resource from iGOT, NSSTA, or TPAC."""

    __tablename__ = "training_resources"

    id: Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
        default=lambda: f"TR-{uuid.uuid4().hex[:12].upper()}",
    )
    # Provider: 'igot', 'nssta', 'tpac'
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # External system ID (e.g. MOCK-COURSE-SAMPLING-001, NSSTA-2026-SAMPLING, TPAC-SYLL-SAMPLING)
    external_reference_id: Mapped[str] = mapped_column(String(150), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Primary aligned competency (e.g. comp_survey_audit, comp_stat_theory, comp_national_accounts)
    competency_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # Specific subskills or topics covered
    subskills: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    # Prerequisite competency IDs required before taking this resource
    prerequisites: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # Duration in hours
    duration_hours: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    # Delivery mode: 'online_self_paced', 'classroom_residential', 'blended', 'virtual_instructor_led'
    delivery_mode: Mapped[str] = mapped_column(String(50), default="online_self_paced", nullable=False)
    # Difficulty level: 'foundational', 'intermediate', 'advanced'
    difficulty_level: Mapped[str] = mapped_column(String(50), default="intermediate", nullable=False)
    # Programme priority: 'mandatory', 'high', 'standard', 'recommended'
    programme_priority: Mapped[str] = mapped_column(String(50), default="standard", nullable=False)

    # Target Cadres (e.g. ["JSO", "SSO", "ISS", "Director", "All Statistical Cadres"])
    target_cadre: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    # Syllabus highlights / key modules
    syllabus_highlights: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # Status: 'active', 'upcoming', 'scheduled', 'archived', 'not_configured'
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    # Flag to clearly identify mock/demo synthetic data vs production data
    is_mock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Provider-specific metadata (e.g. institution location, accreditation, circular ref)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("provider", "external_reference_id", name="uq_training_resource_provider_ref"),
        Index("ix_training_resource_comp_provider", "competency_id", "provider"),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "provider": self.provider,
            "external_reference_id": self.external_reference_id,
            "title": self.title,
            "description": self.description,
            "competency_id": self.competency_id,
            "subskills": self.subskills,
            "prerequisites": self.prerequisites,
            "duration_hours": self.duration_hours,
            "delivery_mode": self.delivery_mode,
            "difficulty_level": self.difficulty_level,
            "programme_priority": self.programme_priority,
            "target_cadre": self.target_cadre,
            "syllabus_highlights": self.syllabus_highlights,
            "status": self.status,
            "is_mock": self.is_mock,
            "metadata": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
