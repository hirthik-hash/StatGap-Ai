from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

if TYPE_CHECKING:
    from backend.app.models.officer_profile import OfficerProfile
    from backend.app.models.competency import Competency


class StructuredEvidence(Base):
    """
    Append-only multi-source evidence ledger capturing performance data
    and provenance across all authorized assessment channels.
    """
    __tablename__ = "structured_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    officer_profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officer_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    competency_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sub_skill_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    source_reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    raw_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    normalized_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    validity_status: Mapped[str] = mapped_column(String(32), default="VALID", nullable=False)
    evidence_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON metadata
    recorded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    officer_profile: Mapped["OfficerProfile"] = relationship("OfficerProfile")
    competency: Mapped["Competency"] = relationship("Competency")
