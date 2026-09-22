from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

if TYPE_CHECKING:
    from backend.app.models.officer_profile import OfficerProfile
    from backend.app.models.competency import Competency


class OfficerCompetencyState(Base):
    """
    Persisted, deterministic evaluation state of an officer's competency.
    Represents the active state vector consumed by the Competency Digital Twin.
    """
    __tablename__ = "officer_competency_states"
    __table_args__ = (
        UniqueConstraint("officer_profile_id", "competency_id", name="uq_officer_competency_state"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    officer_profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officer_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    competency_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    current_level: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    required_level: Mapped[float] = mapped_column(Float, default=0.75, nullable=False)
    gap: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    raw_gap: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="competent", nullable=False)
    gap_band: Mapped[str] = mapped_column(String(16), default="green", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    confidence_category: Mapped[str] = mapped_column(String(32), default="MODERATE_CONFIDENCE", nullable=False)
    confidence_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_evidence_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    evidence_sources: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of source types
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    officer_profile: Mapped["OfficerProfile"] = relationship("OfficerProfile")
    competency: Mapped["Competency"] = relationship("Competency")
