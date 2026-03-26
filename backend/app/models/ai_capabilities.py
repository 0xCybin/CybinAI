import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AICapabilities(Base):
    __tablename__ = "ai_capabilities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    tier: Mapped[int] = mapped_column(Integer, default=1)
    can_book_appointments: Mapped[bool] = mapped_column(Boolean, default=False)
    can_send_reminders: Mapped[bool] = mapped_column(Boolean, default=False)
    can_handle_cancellations: Mapped[bool] = mapped_column(Boolean, default=False)
    can_follow_up_leads: Mapped[bool] = mapped_column(Boolean, default=False)
    can_request_reviews: Mapped[bool] = mapped_column(Boolean, default=False)
    can_handle_complaints: Mapped[bool] = mapped_column(Boolean, default=False)
    custom_instructions: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
