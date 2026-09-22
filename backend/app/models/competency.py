from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

if TYPE_CHECKING:
    from backend.app.models.competency_evidence import CompetencyEvidence


class Competency(Base):
    __tablename__ = "competencies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    required_score: Mapped[int] = mapped_column(Integer, default=75, nullable=False)
    gap_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="competent", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requires_practical_verification: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    evidences: Mapped[List["CompetencyEvidence"]] = relationship(
        "CompetencyEvidence", back_populates="competency", cascade="all, delete-orphan"
    )
