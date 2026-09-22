from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base


class CompetencyVerification(Base):
    __tablename__ = "competency_verifications"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('unverified', 'in_progress', 'verified', 'failed', 'expired', 'revoked')",
            name="ck_competency_verification_status",
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
    verification_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="unverified", index=True
    )
    independent_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    practical_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    composite_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    assessment_session_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("assessment_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    valid_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    criteria_details: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    assessment_session = relationship(
        "AssessmentSession", foreign_keys=[assessment_session_id]
    )


class PracticalVerification(Base):
    __tablename__ = "practical_verifications"
    __table_args__ = (
        CheckConstraint(
            "practical_type IN ('dataset_audit', 'field_survey_audit', 'code_review', 'practical_exercise')",
            name="ck_practical_type",
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
    practical_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="practical_exercise"
    )
    practical_score: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    evaluator_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_data: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict
    )
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    officer = relationship("OfficerProfile", foreign_keys=[officer_id])
    competency = relationship("Competency", foreign_keys=[competency_id])
