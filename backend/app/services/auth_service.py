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
