"""SQLAlchemy models for Adaptive Assessment Sessions and Responses."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, func, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

if TYPE_CHECKING:
    from backend.app.models.officer_profile import OfficerProfile
    from backend.app.models.competency import Competency
    from backend.app.models.gap_diagnosis import GapDiagnosis
    from backend.app.models.assessment_item import AssessmentItem

VALID_SESSION_STATUSES = (
    "active",
    "completed",
    "abandoned",
)

VALID_ASSESSMENT_PURPOSES = (
    "initial",
    "verification",
    "refresh_reassessment",
)


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"
    __table_args__ = (
        CheckConstraint(
            f"status IN {VALID_SESSION_STATUSES}",
            name="valid_session_status_check",
        ),
        CheckConstraint(
            f"assessment_purpose IN {VALID_ASSESSMENT_PURPOSES}",
            name="valid_assessment_purpose_check",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    officer_profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officer_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_competency_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competencies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    diagnosis_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("gap_diagnoses.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    assessment_purpose: Mapped[str] = mapped_column(String(32), default="initial", nullable=False)

    # IRT Latent Ability Tracking
    initial_theta: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_theta: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    standard_error: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    items_answered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Delivery Security (Prevents arbitrary item submission)
    current_assigned_item_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("assessment_items.id", ondelete="SET NULL"), nullable=True
    )

    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stopping_reason: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    officer_profile: Mapped["OfficerProfile"] = relationship("OfficerProfile")
    target_competency: Mapped["Competency"] = relationship("Competency")
    diagnosis: Mapped[Optional["GapDiagnosis"]] = relationship("GapDiagnosis")
    current_assigned_item: Mapped[Optional["AssessmentItem"]] = relationship("AssessmentItem", foreign_keys=[current_assigned_item_id])

    responses: Mapped[List["AssessmentResponse"]] = relationship(
        "AssessmentResponse", back_populates="session", cascade="all, delete-orphan", order_by="AssessmentResponse.created_at"
    )


class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"
    __table_args__ = (
        UniqueConstraint("session_id", "item_id", name="uq_session_item_response"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    item_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assessment_items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    selected_answer: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    confidence: Mapped[str] = mapped_column(String(32), default="Medium", nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # IRT Trajectory Provenance
    theta_before: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    theta_after: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    information: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    session: Mapped["AssessmentSession"] = relationship("AssessmentSession", back_populates="responses")
    item: Mapped["AssessmentItem"] = relationship("AssessmentItem")
