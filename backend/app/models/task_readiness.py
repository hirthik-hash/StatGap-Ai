"""SQLAlchemy models for Task Definitions and Task Readiness Requirements — Phase 6.

A Task is a defined work role or operational activity that requires specific competencies.
Task Readiness evaluates whether an officer's current competency state satisfies
all requirements for performing the task.

Design principles:
  - Tasks define REQUIRED competency levels (not observed levels).
  - The readiness evaluation reads live officer competency data (OfficerCompetencyState).
  - Historical readiness evaluations are stored for audit and progress tracking.
  - Task data is NOT officer-specific; it belongs to role/post definitions.
"""
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
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base


class TaskDefinition(Base):
    """A defined operational task or work role in India's Official Statistical System.

    Examples:
      - Survey Design & Coordination (CPI/NSS/PLFS)
      - National Account Compilation
      - State-Level Data Quality Audit
      - Statistical Report Authoring
    """
    __tablename__ = "task_definitions"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: str(uuid.uuid4())[:16]
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(128), nullable=False, default="operational")
    cadre_applicable: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    requirements: Mapped[list["TaskRequirement"]] = relationship(
        "TaskRequirement", back_populates="task", cascade="all, delete-orphan"
    )


class TaskRequirement(Base):
    """A single required competency for a TaskDefinition.

    Each TaskRequirement specifies:
      - Which competency is required
      - The minimum competency level the officer must have
      - Whether it is critical (blocking) for task readiness

    The `required_level` is a normalized value in [0.0, 1.0] matching
    the Digital Twin's `current_level` for direct comparison.
    """
    __tablename__ = "task_requirements"
    __table_args__ = (
        UniqueConstraint("task_id", "competency_id", name="uq_task_competency"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("task_definitions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    competency_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    required_level: Mapped[float] = mapped_column(Float, nullable=False, default=0.75)
    is_critical: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    task: Mapped["TaskDefinition"] = relationship("TaskDefinition", back_populates="requirements")
    competency: Mapped["Competency"] = relationship("Competency")  # type: ignore[name-defined]


class TaskReadinessEvaluation(Base):
    """Stores a point-in-time task readiness evaluation result for an officer.

    readiness_status values:
      READY             — All required competencies satisfy requirements and evidence is sufficient.
      PARTIALLY_READY   — Some requirements satisfied, some unmet (non-critical gaps allowed).
      NOT_READY         — One or more CRITICAL competency requirements are clearly unmet.
      INSUFFICIENT_EVIDENCE — Insufficient evidence to determine readiness for >= 1 requirement.

    NOTE: readiness_status is NOT an authoritative operational clearance.
    It is a competency intelligence indicator derived from the Digital Twin model.
    """
    __tablename__ = "task_readiness_evaluations"
    __table_args__ = (
        CheckConstraint(
            "readiness_status IN ('READY', 'PARTIALLY_READY', 'NOT_READY', 'INSUFFICIENT_EVIDENCE')",
            name="ck_readiness_status",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    officer_profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officer_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("task_definitions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    readiness_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="NOT_READY", index=True
    )
    requirements_met: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requirements_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bottleneck_competency_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="SET NULL"), nullable=True
    )
    evaluation_detail: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    officer = relationship("OfficerProfile", foreign_keys=[officer_profile_id])
    task = relationship("TaskDefinition", foreign_keys=[task_id])
    bottleneck_competency = relationship("Competency", foreign_keys=[bottleneck_competency_id])
