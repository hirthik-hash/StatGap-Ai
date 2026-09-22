from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

VALID_DIAGNOSIS_TYPES = (
    "basic_concept",
    "statistical_misconception",
    "integrated_concept",
    "application_gap",
    "insufficient_evidence",
)


class GapDiagnosis(Base):
    __tablename__ = "gap_diagnoses"
    __table_args__ = (
        CheckConstraint(
            f"diagnosis_type IN {VALID_DIAGNOSIS_TYPES}",
            name="valid_diagnosis_type_check",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    officer_profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officer_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    competency_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    diagnosis_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), default="moderate", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_references: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reasoning_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    root_cause_competency_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    misconception_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("misconceptions.id", ondelete="SET NULL"), nullable=True
    )
    # AI & RAG Provenance Fields (Prompt 4)
    ai_analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grounding_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # grounded, weak_grounding, insufficient_grounding
    retrieved_sources: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list of cited chunks
    llm_model: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    prompt_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    officer_profile = relationship("OfficerProfile")
    competency = relationship("Competency")
    misconception = relationship("Misconception")
