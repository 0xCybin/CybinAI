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
