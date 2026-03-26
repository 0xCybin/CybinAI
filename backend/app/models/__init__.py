"""SQLAlchemy models for MykoDesk."""

from app.models.models import (
    UserRole,
    ConversationStatus,
    ConversationPriority,
    ChannelType,
    SenderType,
    Tenant,
    User,
    Customer,
    Conversation,
    Message,
    KBArticle,
    KBEmbedding,
    Integration,
    CannedResponse,
    InternalNote,
    AuditLog,
)

from app.models.tags import (
    Tag,
    ConversationTag,
)

from app.models.notifications import NotificationPreferences

__all__ = [
    # Enums
    "UserRole",
    "ConversationStatus",
    "ConversationPriority",
    "ChannelType",
    "SenderType",
    # Core models
    "Tenant",
    "User",
    "Customer",
    "Conversation",
    "Message",
    "KBArticle",
    "KBEmbedding",
    "Integration",
    "CannedResponse",
    "InternalNote",
    "AuditLog",
    # Tags
    "Tag",
    "ConversationTag",
    # Notifications
    "NotificationPreferences",
]