from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

if TYPE_CHECKING:
    from backend.app.models.officer_profile import OfficerProfile
    from backend.app.models.competency import Competency


class CompetencyEvidence(Base):
    __tablename__ = "competency_evidences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    officer_profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officer_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    competency_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    assessment_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    quiz_accuracy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    practical_performance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    assessment_ratio: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    repeated_errors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confidence_pattern: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_system: Mapped[str] = mapped_column(String(50), default="manual", nullable=False)
    external_reference_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    officer_profile: Mapped["OfficerProfile"] = relationship("OfficerProfile", back_populates="evidences")
    competency: Mapped["Competency"] = relationship("Competency", back_populates="evidences")
