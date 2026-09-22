"""SQLAlchemy models for Assessment Item Bank, Concepts, and Relationship mappings."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

if TYPE_CHECKING:
    from backend.app.models.competency import Competency
    from backend.app.models.knowledge_document import KnowledgeDocument
    from backend.app.models.knowledge_chunk import KnowledgeChunk
    from backend.app.models.misconception import Misconception
    from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship

VALID_QUESTION_TYPES = (
    "single_concept",
    "misconception_probe",
    "application",
    "integrated_concept",
)

VALID_ITEM_STATUSES = (
    "draft",
    "validated",
    "review_required",
    "retired",
)


class AssessmentItem(Base):
    __tablename__ = "assessment_items"
    __table_args__ = (
        CheckConstraint(
            f"question_type IN {VALID_QUESTION_TYPES}",
            name="valid_question_type_check",
        ),
        CheckConstraint(
            f"status IN {VALID_ITEM_STATUSES}",
            name="valid_item_status_check",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    competency_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_type: Mapped[str] = mapped_column(String(32), nullable=False, default="single_concept")
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array of strings
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-indexed
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # IRT Rasch/1PL Difficulty Parameter b (expert/prototype calibration values, e.g. -3.0 to +3.0)
    difficulty_b: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    discrimination_a: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=1.0)
    guessing_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    cognitive_level: Mapped[str] = mapped_column(String(32), nullable=False, default="application")

    # Provenance Tracking
    source_document_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("knowledge_documents.id", ondelete="SET NULL"), nullable=True
    )
    source_chunk_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("knowledge_chunks.id", ondelete="SET NULL"), nullable=True
    )
    misconception_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("misconceptions.id", ondelete="SET NULL"), nullable=True
    )

    # Quality & Human Review Foundation
    status: Mapped[str] = mapped_column(String(32), default="validated", nullable=False)
    review_status: Mapped[str] = mapped_column(String(32), default="unreviewed", nullable=False)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    competency: Mapped["Competency"] = relationship("Competency")
    source_document: Mapped[Optional["KnowledgeDocument"]] = relationship("KnowledgeDocument")
    source_chunk: Mapped[Optional["KnowledgeChunk"]] = relationship("KnowledgeChunk")
    misconception: Mapped[Optional["Misconception"]] = relationship("Misconception")

    concept_mappings: Mapped[List["AssessmentItemConcept"]] = relationship(
        "AssessmentItemConcept", back_populates="item", cascade="all, delete-orphan"
    )
    relationship_mappings: Mapped[List["AssessmentItemRelationship"]] = relationship(
        "AssessmentItemRelationship", back_populates="item", cascade="all, delete-orphan"
    )


class AssessmentItemConcept(Base):
    __tablename__ = "assessment_item_concepts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assessment_items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    concept_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competency_nodes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="primary")  # primary, prerequisite, integrated_component

    item: Mapped["AssessmentItem"] = relationship("AssessmentItem", back_populates="concept_mappings")
    concept: Mapped["CompetencyNode"] = relationship("CompetencyNode")


class AssessmentItemRelationship(Base):
    __tablename__ = "assessment_item_relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assessment_items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    relationship_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competency_relationships.id", ondelete="CASCADE"), index=True, nullable=False
    )

    item: Mapped["AssessmentItem"] = relationship("AssessmentItem", back_populates="relationship_mappings")
    relationship: Mapped["CompetencyRelationship"] = relationship("CompetencyRelationship")
