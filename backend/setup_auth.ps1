# CybinAI Auth System Setup Script
# Run this from: C:\Users\0xCyb\CybinAI\backend
# Usage: .\setup_auth.ps1

Write-Host "🚀 Setting up CybinAI Authentication System..." -ForegroundColor Cyan

# ============================================================================
# 1. CORE/DATABASE.PY
# ============================================================================
$databasePy = @'
"""
Database connection and session management.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from app.core.config import settings


# Convert postgresql:// to postgresql+asyncpg:// for async support
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create async engine
engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
'@

Set-Content -Path "app\core\database.py" -Value $databasePy -Encoding UTF8
Write-Host "✅ Created app\core\database.py" -ForegroundColor Green

# ============================================================================
# 2. CORE/SECURITY.PY
# ============================================================================
$securityPy = @'
"""
Security utilities: password hashing and JWT tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from uuid import UUID

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    user_id: UUID,
    tenant_id: UUID,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_EXPIRATION_MINUTES
        )
    
    to_encode = {
        "sub": str(user_id),
        "tid": str(tenant_id),
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(
    user_id: UUID,
    tenant_id: UUID,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT refresh token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.JWT_REFRESH_EXPIRATION_DAYS
        )
    
    to_encode = {
        "sub": str(user_id),
        "tid": str(tenant_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def create_token_pair(user_id: UUID, tenant_id: UUID, role: str) -> dict:
    """Create both access and refresh tokens."""
    access_token = create_access_token(user_id, tenant_id, role)
    refresh_token = create_refresh_token(user_id, tenant_id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60,
    }


class TokenPayload:
    """Parsed token payload for easier access."""
    
    def __init__(self, payload: dict):
        self.user_id = UUID(payload.get("sub", ""))
        self.tenant_id = UUID(payload.get("tid", ""))
        self.role = payload.get("role", "")
        self.token_type = payload.get("type", "")
        self.exp = payload.get("exp")
        self.iat = payload.get("iat")
    
    @classmethod
    def from_token(cls, token: str) -> Optional["TokenPayload"]:
        """Create TokenPayload from a JWT token string."""
        payload = decode_token(token)
        if payload is None:
            return None
        try:
            return cls(payload)
        except (ValueError, KeyError):
            return None
'@

Set-Content -Path "app\core\security.py" -Value $securityPy -Encoding UTF8
Write-Host "✅ Created app\core\security.py" -ForegroundColor Green

# ============================================================================
# 3. CORE/DEPS.PY
# ============================================================================
$depsPy = @'
"""
FastAPI dependencies for authentication and authorization.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TokenPayload
from app.models.models import User, Tenant, UserRole


security = HTTPBearer(auto_error=False)


class CurrentUser:
    """Container for the authenticated user and their tenant."""
    
    def __init__(self, user: User, tenant: Tenant):
        self.user = user
        self.tenant = tenant
        self.user_id = user.id
        self.tenant_id = tenant.id
        self.role = user.role
    
    def is_owner(self) -> bool:
        return self.role == UserRole.OWNER
    
    def is_admin(self) -> bool:
        return self.role in (UserRole.OWNER, UserRole.ADMIN)
    
    def is_agent(self) -> bool:
        return self.role in (UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    """Dependency that extracts and validates the JWT token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_payload = TokenPayload.from_token(credentials.credentials)
    
    if token_payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if token_payload.token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(
        select(User).where(
            User.id == token_payload.user_id,
            User.tenant_id == token_payload.tenant_id,
            User.is_active == True
        )
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(
        select(Tenant).where(
            Tenant.id == token_payload.tenant_id,
            Tenant.active == True
        )
    )
    tenant = result.scalar_one_or_none()
    
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return CurrentUser(user=user, tenant=tenant)


async def get_current_user_optional(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Optional[CurrentUser]:
    """Like get_current_user, but returns None instead of raising."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def require_admin(
    current: Annotated[CurrentUser, Depends(get_current_user)]
) -> CurrentUser:
    """Requires admin or owner role."""
    if not current.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current


async def require_owner(
    current: Annotated[CurrentUser, Depends(get_current_user)]
) -> CurrentUser:
    """Requires owner role."""
    if not current.is_owner():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required"
        )
    return current


# Type aliases
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
OptionalUser = Annotated[Optional[CurrentUser], Depends(get_current_user_optional)]
AdminUser = Annotated[CurrentUser, Depends(require_admin)]
OwnerUser = Annotated[CurrentUser, Depends(require_owner)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
'@

Set-Content -Path "app\core\deps.py" -Value $depsPy -Encoding UTF8
Write-Host "✅ Created app\core\deps.py" -ForegroundColor Green

# ============================================================================
# 4. MODELS/MODELS.PY
# ============================================================================
$modelsPy = @'
"""
SQLAlchemy ORM models for CybinAI.
"""

import uuid
from datetime import datetime
from typing import Optional, List
import enum

from sqlalchemy import (
    String, Text, Boolean, Float, DateTime, ForeignKey, 
    Index, Enum as SQLEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from app.core.database import Base


class UserRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    AGENT = "agent"


class ConversationStatus(str, enum.Enum):
    OPEN = "open"
    PENDING = "pending"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ConversationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class ChannelType(str, enum.Enum):
    CHAT = "chat"
    EMAIL = "email"
    SMS = "sms"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    WHATSAPP = "whatsapp"


class SenderType(str, enum.Enum):
    CUSTOMER = "customer"
    AI = "ai"
    AGENT = "agent"
    SYSTEM = "system"


class TimestampMixin:
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


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subdomain: Mapped[str] = mapped_column(String(63), unique=True, nullable=False, index=True)
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[List["User"]] = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    customers: Mapped[List["Customer"]] = relationship("Customer", back_populates="tenant", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="tenant", cascade="all, delete-orphan")
    kb_articles: Mapped[List["KBArticle"]] = relationship("KBArticle", back_populates="tenant", cascade="all, delete-orphan")
    integrations: Mapped[List["Integration"]] = relationship("Integration", back_populates="tenant", cascade="all, delete-orphan")
    canned_responses: Mapped[List["CannedResponse"]] = relationship("CannedResponse", back_populates="tenant", cascade="all, delete-orphan")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="user_role"), default=UserRole.AGENT)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    assigned_conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="assigned_agent", foreign_keys="Conversation.assigned_to")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="agent_sender")

    __table_args__ = (Index("ix_users_tenant_email", "tenant_id", "email", unique=True),)


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    name: Mapped[Optional[str]] = mapped_column(String(255))
    external_ids: Mapped[dict] = mapped_column(JSONB, default=dict)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="customers")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="customer")

    __table_args__ = (
        Index("ix_customers_tenant_email", "tenant_id", "email"),
        Index("ix_customers_tenant_phone", "tenant_id", "phone"),
    )


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    subject: Mapped[Optional[str]] = mapped_column(String(500))
    channel: Mapped[ChannelType] = mapped_column(SQLEnum(ChannelType, name="channel_type"), default=ChannelType.CHAT)
    status: Mapped[ConversationStatus] = mapped_column(SQLEnum(ConversationStatus, name="conversation_status"), default=ConversationStatus.OPEN, index=True)
    priority: Mapped[ConversationPriority] = mapped_column(SQLEnum(ConversationPriority, name="conversation_priority"), default=ConversationPriority.NORMAL)
    ai_handled: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    first_response_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="conversations")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="conversations")
    assigned_agent: Mapped[Optional["User"]] = relationship("User", back_populates="assigned_conversations", foreign_keys=[assigned_to])
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

    __table_args__ = (
        Index("ix_conversations_tenant_status", "tenant_id", "status"),
        Index("ix_conversations_tenant_created", "tenant_id", "created_at"),
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type: Mapped[SenderType] = mapped_column(SQLEnum(SenderType, name="sender_type"), nullable=False)
    sender_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), default="text")
    attachments: Mapped[list] = mapped_column(JSONB, default=list)
    ai_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
    agent_sender: Mapped[Optional["User"]] = relationship("User", back_populates="messages")


class KBArticle(Base, TimestampMixin):
    __tablename__ = "kb_articles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="kb_articles")

    __table_args__ = (
        Index("ix_kb_articles_tenant_category", "tenant_id", "category"),
        Index("ix_kb_articles_tenant_published", "tenant_id", "published"),
    )


class Integration(Base, TimestampMixin):
    __tablename__ = "integrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    credentials: Mapped[dict] = mapped_column(JSONB, nullable=False)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[Optional[str]] = mapped_column(Text)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="integrations")

    __table_args__ = (Index("ix_integrations_tenant_type", "tenant_id", "type", unique=True),)


class CannedResponse(Base, TimestampMixin):
    __tablename__ = "canned_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    shortcut: Mapped[Optional[str]] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    use_count: Mapped[int] = mapped_column(default=0)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="canned_responses")

    __table_args__ = (Index("ix_canned_responses_tenant_shortcut", "tenant_id", "shortcut"),)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50))
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_audit_log_tenant_created", "tenant_id", "created_at"),
        Index("ix_audit_log_tenant_action", "tenant_id", "action"),
    )
'@

Set-Content -Path "app\models\models.py" -Value $modelsPy -Encoding UTF8
Write-Host "✅ Created app\models\models.py" -ForegroundColor Green

# ============================================================================
# 5. MODELS/__INIT__.PY
# ============================================================================
$modelsInit = @'
"""SQLAlchemy models for CybinAI."""

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
    Integration,
    CannedResponse,
    AuditLog,
)

__all__ = [
    "UserRole",
    "ConversationStatus",
    "ConversationPriority",
    "ChannelType",
    "SenderType",
    "Tenant",
    "User",
    "Customer",
    "Conversation",
    "Message",
    "KBArticle",
    "Integration",
    "CannedResponse",
    "AuditLog",
]
'@

Set-Content -Path "app\models\__init__.py" -Value $modelsInit -Encoding UTF8
Write-Host "✅ Created app\models\__init__.py" -ForegroundColor Green

# ============================================================================
# 6. SCHEMAS/AUTH.PY
# ============================================================================
$schemasAuth = @'
"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.models import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    tenant_subdomain: str = Field(..., min_length=3, max_length=63, pattern=r"^[a-z0-9-]+$")
    tenant_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    tenant_subdomain: str


class TokenRefresh(BaseModel):
    refresh_token: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: UserRole
    tenant_id: UUID
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_seen_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenPair


class TenantInfo(BaseModel):
    id: UUID
    name: str
    subdomain: str

    class Config:
        from_attributes = True


class MeResponse(BaseModel):
    user: UserResponse
    tenant: TenantInfo
'@

Set-Content -Path "app\schemas\auth.py" -Value $schemasAuth -Encoding UTF8
Write-Host "✅ Created app\schemas\auth.py" -ForegroundColor Green

# ============================================================================
# 7. SCHEMAS/__INIT__.PY
# ============================================================================
$schemasInit = @'
"""Pydantic schemas for API request/response validation."""

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenRefresh,
    PasswordChange,
    TokenPair,
    UserResponse,
    AuthResponse,
    TenantInfo,
    MeResponse,
)

__all__ = [
    "UserRegister",
    "UserLogin",
    "TokenRefresh",
    "PasswordChange",
    "TokenPair",
    "UserResponse",
    "AuthResponse",
    "TenantInfo",
    "MeResponse",
]
'@

Set-Content -Path "app\schemas\__init__.py" -Value $schemasInit -Encoding UTF8
Write-Host "✅ Created app\schemas\__init__.py" -ForegroundColor Green

# ============================================================================
# 8. SERVICES/AUTH_SERVICE.PY
# ============================================================================
$authService = @'
"""Authentication service with business logic."""

from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Tenant, UserRole
from app.core.security import hash_password, verify_password, create_token_pair
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenPair,
    UserResponse,
    AuthResponse,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def register(self, data: UserRegister) -> AuthResponse:
        existing_tenant = await self.db.execute(
            select(Tenant).where(Tenant.subdomain == data.tenant_subdomain.lower())
        )
        if existing_tenant.scalar_one_or_none():
            raise ValueError("Subdomain already taken")
        
        existing_user = await self.db.execute(
            select(User).where(User.email == data.email.lower())
        )
        if existing_user.scalar_one_or_none():
            raise ValueError("Email already registered")
        
        tenant = Tenant(
            name=data.tenant_name or data.tenant_subdomain.replace("-", " ").title(),
            subdomain=data.tenant_subdomain.lower(),
            settings={"branding": {"primary_color": "#3B82F6"}, "timezone": "America/New_York"}
        )
        self.db.add(tenant)
        await self.db.flush()
        
        user = User(
            tenant_id=tenant.id,
            email=data.email.lower(),
            password_hash=hash_password(data.password),
            name=data.name,
            role=UserRole.OWNER,
        )
        self.db.add(user)
        await self.db.flush()
        
        tokens = create_token_pair(user.id, tenant.id, user.role.value)
        
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenPair(**tokens),
        )
    
    async def login(self, data: UserLogin) -> AuthResponse:
        result = await self.db.execute(
            select(Tenant).where(
                Tenant.subdomain == data.tenant_subdomain.lower(),
                Tenant.active == True
            )
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise ValueError("Invalid credentials")
        
        result = await self.db.execute(
            select(User).where(
                User.tenant_id == tenant.id,
                User.email == data.email.lower(),
                User.is_active == True
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Invalid credentials")
        
        if not verify_password(data.password, user.password_hash):
            raise ValueError("Invalid credentials")
        
        user.last_seen_at = datetime.now(timezone.utc)
        tokens = create_token_pair(user.id, tenant.id, user.role.value)
        
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenPair(**tokens),
        )
    
    async def refresh_tokens(self, refresh_token: str) -> TokenPair:
        from app.core.security import TokenPayload
        
        payload = TokenPayload.from_token(refresh_token)
        
        if payload is None:
            raise ValueError("Invalid refresh token")
        
        if payload.token_type != "refresh":
            raise ValueError("Invalid token type")
        
        result = await self.db.execute(
            select(User).where(
                User.id == payload.user_id,
                User.tenant_id == payload.tenant_id,
                User.is_active == True
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found or inactive")
        
        result = await self.db.execute(
            select(Tenant).where(
                Tenant.id == payload.tenant_id,
                Tenant.active == True
            )
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise ValueError("Tenant not found or inactive")
        
        tokens = create_token_pair(user.id, tenant.id, user.role.value)
        return TokenPair(**tokens)
    
    async def change_password(self, user: User, current_password: str, new_password: str) -> bool:
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Current password is incorrect")
        
        user.password_hash = hash_password(new_password)
        return True
'@

Set-Content -Path "app\services\auth_service.py" -Value $authService -Encoding UTF8
Write-Host "✅ Created app\services\auth_service.py" -ForegroundColor Green

# ============================================================================
# 9. API/V1/ENDPOINTS/AUTH.PY
# ============================================================================
$authEndpoints = @'
"""Authentication API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import DbSession, AuthenticatedUser
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenRefresh,
    PasswordChange,
    AuthResponse,
    TokenPair,
    MeResponse,
    UserResponse,
    TenantInfo,
)
from app.services.auth_service import AuthService


router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, summary="Register a new business")
async def register(data: UserRegister, db: DbSession):
    service = AuthService(db)
    try:
        result = await service.register(data)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AuthResponse, summary="Login")
async def login(data: UserLogin, db: DbSession):
    service = AuthService(db)
    try:
        result = await service.login(data)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenPair, summary="Refresh Token")
async def refresh_token(data: TokenRefresh, db: DbSession):
    service = AuthService(db)
    try:
        result = await service.refresh_tokens(data.refresh_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=MeResponse, summary="Get Current User")
async def get_me(current: AuthenticatedUser):
    return MeResponse(
        user=UserResponse.model_validate(current.user),
        tenant=TenantInfo.model_validate(current.tenant),
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT, summary="Change Password")
async def change_password(data: PasswordChange, current: AuthenticatedUser, db: DbSession):
    service = AuthService(db)
    try:
        await service.change_password(current.user, data.current_password, data.new_password)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout")
async def logout(current: AuthenticatedUser):
    return None
'@

Set-Content -Path "app\api\v1\endpoints\auth.py" -Value $authEndpoints -Encoding UTF8
Write-Host "✅ Created app\api\v1\endpoints\auth.py" -ForegroundColor Green

# ============================================================================
# DONE
# ============================================================================
Write-Host ""
Write-Host "🎉 All files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart uvicorn: uvicorn app.main:app --reload"
Write-Host "2. Check http://localhost:8000/docs for 6 auth endpoints"
Write-Host "3. Commit and push: git add . && git commit -m 'Add auth system' && git push"