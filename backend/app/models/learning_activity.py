"""SQLAlchemy model for Interactive Learning Activities & Virtual Lab Interfaces — Phase 9.

Supports structured interactive learning modules:
  - READING: Text/document walkthroughs with RAG citations
  - QUIZ: Targeted diagnostic questions
  - SIMULATION: What-if competency & parameter simulations
  - PRACTICAL_EXERCISE: Hands-on statistical calculations/coding exercises
  - VIRTUAL_LAB: Statistical simulation environment / data laboratory interface

DESIGN & INTEGRITY RULE:
Labeled as "Virtual Lab Activity Interface" to accurately describe the interactive simulation architecture.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
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


class LearningActivity(Base):
    """An interactive learning or virtual-lab activity aligned to competencies and tasks."""

    __tablename__ = "learning_activities"
    __table_args__ = (
        CheckConstraint(
            "activity_type IN ('READING', 'QUIZ', 'SIMULATION', 'PRACTICAL_EXERCISE', 'VIRTUAL_LAB')",
            name="ck_learning_activity_type",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"ACT-{uuid.uuid4().hex[:10].upper()}",
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activity_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PRACTICAL_EXERCISE"
    )
    competency_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("task_definitions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    difficulty_level: Mapped[str] = mapped_column(String(32), default="intermediate", nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    interactive_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    competency = relationship("Competency", foreign_keys=[competency_id])
    task = relationship("TaskDefinition", foreign_keys=[task_id])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "activity_type": self.activity_type,
            "competency_id": self.competency_id,
            "task_id": self.task_id,
            "estimated_duration_minutes": self.estimated_duration_minutes,
            "difficulty_level": self.difficulty_level,
            "instructions": self.instructions,
            "interactive_payload": self.interactive_payload,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
