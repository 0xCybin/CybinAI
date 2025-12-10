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
from app.core.security import decode_token, TokenPayload
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
        return self.role == "owner" or self.role == UserRole.OWNER
    
    def is_admin(self) -> bool:
        return self.role in ("owner", "admin", UserRole.OWNER, UserRole.ADMIN)
    
    def is_agent(self) -> bool:
        return self.role in ("owner", "admin", "agent", UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    """Dependency that extracts and validates the JWT token."""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # decode_token returns a dict or None
    payload_dict = decode_token(token)
    
    if payload_dict is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert dict to TokenPayload object
    try:
        payload = TokenPayload(payload_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token payload: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check token type (access it from the object now)
    if payload.token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.id == payload.user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get tenant
    result = await db.execute(
        select(Tenant).where(Tenant.id == user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return CurrentUser(user=user, tenant=tenant)


async def require_admin(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    """Dependency that requires admin or owner role."""
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or owner role required",
        )
    return current_user


async def require_owner(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    """Dependency that requires owner role."""
    if not current_user.is_owner():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner role required",
        )
    return current_user


def get_tenant_id(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> UUID:
    """Dependency that returns just the tenant ID."""
    return current_user.tenant_id


# =============================================================================
# Type Aliases for cleaner endpoint signatures
# =============================================================================

# Database session dependency
DbSession = Annotated[AsyncSession, Depends(get_db)]

# Authenticated user dependency
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]

# Admin user dependency
AdminUser = Annotated[CurrentUser, Depends(require_admin)]

# Owner user dependency  
OwnerUser = Annotated[CurrentUser, Depends(require_owner)]