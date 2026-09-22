from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

if TYPE_CHECKING:
    from backend.app.models.officer_profile import OfficerProfile


class DigitalTwinSnapshot(Base):
    """
    Append-only snapshot preservation capturing an immutable, point-in-time
    computational representation of an officer's Competency Digital Twin.
    """
    __tablename__ = "digital_twin_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    officer_profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officer_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    snapshot_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    trigger_event: Mapped[str] = mapped_column(String(64), default="MANUAL_SNAPSHOT", nullable=False)
    identity_context: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    competency_state_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    graph_context_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    learning_context_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    ontology_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    officer_profile: Mapped["OfficerProfile"] = relationship("OfficerProfile")
