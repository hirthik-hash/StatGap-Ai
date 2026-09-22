from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base


class KnowledgeRetention(Base):
    __tablename__ = "knowledge_retention"
    __table_args__ = (
        CheckConstraint(
            "risk_level IN ('low', 'moderate', 'at_risk', 'critical')",
            name="ck_retention_risk_level",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    officer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("officer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    baseline_retention: Mapped[float] = mapped_column(
        Float, nullable=False, default=1.0
    )
    stability_days: Mapped[float] = mapped_column(Float, nullable=False)
    calculated_retention: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(
        String(20), nullable=False, default="low", index=True
    )
    last_evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    days_since_last_interaction: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    decay_parameters: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    officer = relationship("OfficerProfile", foreign_keys=[officer_id])
    competency = relationship("Competency", foreign_keys=[competency_id])


class RefreshRecommendation(Base):
    __tablename__ = "refresh_recommendations"
    __table_args__ = (
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_refresh_recommendation_priority",
        ),
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'dismissed')",
            name="ck_refresh_recommendation_status",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    officer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("officer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trigger_reason: Mapped[str] = mapped_column(
        String(50), nullable=False, default="retention_decay"
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medium", index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True
    )
    recommended_modules: Mapped[list] = mapped_column(
        JSON, nullable=False, default=list
    )
    reassessment_session_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("assessment_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    officer = relationship("OfficerProfile", foreign_keys=[officer_id])
    competency = relationship("Competency", foreign_keys=[competency_id])
    reassessment_session = relationship(
        "AssessmentSession", foreign_keys=[reassessment_session_id]
    )
