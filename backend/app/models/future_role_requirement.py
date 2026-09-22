"""SQLAlchemy model for Future Role Requirements and Emerging Skills — Phase 8.

Enables MoSPI administrators to configure and evaluate target role requirements,
career progression benchmarks (e.g. JSO -> SSO -> Director), and strategic emerging skills
(such as Reproducible Reporting in Quarto/R, CAPI Telemetry Auditing, and Small Area Estimation).

NOTE ON SCIENTIFIC & ADMINISTRATIVE HONESTY:
Future role requirements and emerging skill benchmarks are configured institutional standards
(Assumption-based), not ungrounded ML predictive forecasts.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class FutureRoleRequirement(Base):
    """A configured future work role or cadre benchmark with target competencies."""

    __tablename__ = "future_role_requirements"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"FRR-{uuid.uuid4().hex[:10].upper()}",
    )
    role_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    cadre: Mapped[str] = mapped_column(String(64), nullable=False, default="SSO")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Required competencies dictionary: {competency_id: required_level (0.0 to 1.0)}
    required_competencies: Mapped[Dict[str, float]] = mapped_column(
        JSON, default=dict, nullable=False
    )

    # Strategic emerging statistical topics
    emerging_skills: Mapped[List[str]] = mapped_column(
        JSON, default=list, nullable=False
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "role_name": self.role_name,
            "cadre": self.cadre,
            "description": self.description,
            "required_competencies": self.required_competencies,
            "emerging_skills": self.emerging_skills,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
