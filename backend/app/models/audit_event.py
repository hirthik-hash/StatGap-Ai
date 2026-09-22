from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base


class CompetencyAuditEvent(Base):
    __tablename__ = "competency_audit_events"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    officer_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("officer_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    competency_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(60), nullable=False, index=True
    )
    actor: Mapped[str] = mapped_column(
        String(50), nullable=False, default="system"
    )
    event_data: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    officer = relationship("OfficerProfile", foreign_keys=[officer_id])
    user = relationship("User", foreign_keys=[user_id])
    competency = relationship("Competency", foreign_keys=[competency_id])
