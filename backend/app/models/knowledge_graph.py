from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, func, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

VALID_RELATIONSHIP_TYPES = (
    "prerequisite",
    "depends_on",
    "related_to",
    "applied_in",
    "part_of",
    "commonly_confused_with",
    "parent_of",
    "requires",
    "PREREQUISITE",
    "DEPENDS_ON",
    "RELATED_TO",
    "PARENT_OF",
    "REQUIRES",
    "PART_OF",
)


class CompetencyNode(Base):
    __tablename__ = "competency_nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[str] = mapped_column(String(64), default="intermediate", nullable=False)
    ontology_level: Mapped[str] = mapped_column(String(32), default="competency", nullable=False)
    domain: Mapped[str] = mapped_column(String(64), default="statistical", nullable=False)
    required_proficiency: Mapped[float] = mapped_column(Float, default=0.75, nullable=False)
    version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("competency_nodes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    competency_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Self-referencing parent/children for 4-level ontology hierarchy
    parent: Mapped[Optional["CompetencyNode"]] = relationship(
        "CompetencyNode", remote_side="CompetencyNode.id", back_populates="children"
    )
    children: Mapped[List["CompetencyNode"]] = relationship(
        "CompetencyNode", back_populates="parent", cascade="all, delete-orphan"
    )

    # Relationships
    outgoing_relationships: Mapped[List["CompetencyRelationship"]] = relationship(
        "CompetencyRelationship",
        foreign_keys="CompetencyRelationship.source_node_id",
        back_populates="source_node",
        cascade="all, delete-orphan",
    )
    incoming_relationships: Mapped[List["CompetencyRelationship"]] = relationship(
        "CompetencyRelationship",
        foreign_keys="CompetencyRelationship.target_node_id",
        back_populates="target_node",
        cascade="all, delete-orphan",
    )


class CompetencyRelationship(Base):
    __tablename__ = "competency_relationships"
    __table_args__ = (
        CheckConstraint(
            f"relationship_type IN {VALID_RELATIONSHIP_TYPES}",
            name="valid_relationship_type_check",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    source_node_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competency_nodes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_node_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competency_nodes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(String(64), nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    source_node: Mapped["CompetencyNode"] = relationship(
        "CompetencyNode", foreign_keys=[source_node_id], back_populates="outgoing_relationships"
    )
    target_node: Mapped["CompetencyNode"] = relationship(
        "CompetencyNode", foreign_keys=[target_node_id], back_populates="incoming_relationships"
    )

