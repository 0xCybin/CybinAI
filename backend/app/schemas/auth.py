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
