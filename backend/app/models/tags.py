"""
Tag models for conversation categorization.
"""

import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.models import Tenant, User, Conversation


class Tag(Base):
    """
    Tag model for categorizing conversations.
    
    Tags are tenant-scoped and can be assigned to multiple conversations.
    Each tag has a name and optional color for UI display.
    """
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("tenants.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6B7280")  # Hex color
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="tags")
    conversation_tags: Mapped[List["ConversationTag"]] = relationship(
        "ConversationTag", 
        back_populates="tag",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_tags_tenant_name", "tenant_id", "name", unique=True),
    )

    def __repr__(self) -> str:
        return f"<Tag {self.name} ({self.id})>"


class ConversationTag(Base):
    """
    Association table linking conversations to tags.
    
    Tracks who assigned the tag and when.
    """
    __tablename__ = "conversation_tags"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        primary_key=True
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True
    )
    assigned_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", 
        back_populates="conversation_tags"
    )
    tag: Mapped["Tag"] = relationship(
        "Tag", 
        back_populates="conversation_tags"
    )
    assigned_by_user: Mapped[Optional["User"]] = relationship("User")

    __table_args__ = (
        Index("ix_conversation_tags_tag", "tag_id"),
    )

    def __repr__(self) -> str:
        return f"<ConversationTag conversation={self.conversation_id} tag={self.tag_id}>"