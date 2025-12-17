"""
Pydantic schemas for User/Agent Management.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """User role enum matching the database."""
    OWNER = "owner"
    ADMIN = "admin"
    AGENT = "agent"


# =============================================================================
# Request Schemas
# =============================================================================

class UserCreate(BaseModel):
    """Schema for creating/inviting a new user."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    role: UserRole = UserRole.AGENT
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    # If password not provided, a temporary one will be generated
    # (In production, you'd send an invite email instead)


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = Field(None, max_length=500)


class UserPasswordReset(BaseModel):
    """Schema for resetting a user's password (admin action)."""
    new_password: str = Field(..., min_length=8, max_length=100)


# =============================================================================
# Response Schemas
# =============================================================================

class UserResponse(BaseModel):
    """User response for API."""
    id: UUID
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    is_active: bool
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    conversation_count: int = 0  # Number of assigned conversations
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Paginated user list response."""
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class UserDetailResponse(BaseModel):
    """Detailed user response with stats."""
    id: UUID
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    is_active: bool
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Stats
    assigned_conversations: int = 0
    resolved_conversations: int = 0
    
    class Config:
        from_attributes = True