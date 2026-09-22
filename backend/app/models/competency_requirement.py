from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base


class CompetencyRequirement(Base):
    """
    Deterministic requirement vector defining required competency proficiency
    based on Cadre, Function, Current Assignment, Designation, and Role.
    """
    __tablename__ = "competency_requirements"
    __table_args__ = (
        UniqueConstraint(
            "competency_id", "cadre", "function_name", "current_assignment", "designation", "role",
            name="uq_competency_requirement_scope"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    competency_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    cadre: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    function_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    current_assignment: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    designation: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    role: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    required_level: Mapped[float] = mapped_column(Float, default=0.75, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
