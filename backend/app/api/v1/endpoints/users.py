"""
Users API Endpoints

Handles user/agent management for tenant admins.
"""

import logging
import secrets
import string
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, get_current_user, require_admin, require_owner
from app.core.security import hash_password
from app.models.models import User, Conversation, ConversationStatus
from app.schemas.users import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserDetailResponse,
    UserPasswordReset,
    UserRole,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


# =============================================================================
# Helper Functions
# =============================================================================

def generate_temp_password(length: int = 12) -> str:
    """Generate a temporary password."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


async def get_user_conversation_count(db: AsyncSession, user_id: UUID) -> int:
    """Get the count of conversations assigned to a user."""
    result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.assigned_to == user_id
        )
    )
    return result.scalar() or 0


async def get_user_resolved_count(db: AsyncSession, user_id: UUID) -> int:
    """Get the count of resolved conversations for a user."""
    result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.assigned_to == user_id,
            Conversation.status == ConversationStatus.RESOLVED
        )
    )
    return result.scalar() or 0


# =============================================================================
# List Users
# =============================================================================

@router.get("", response_model=UserListResponse)
async def list_users(
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
):
    """
    List all users in the tenant.
    Requires admin or owner role.
    """
    # Build base query
    query = select(User).where(User.tenant_id == current_user.tenant_id)
    count_query = select(func.count(User.id)).where(User.tenant_id == current_user.tenant_id)
    
    # Apply filters
    if search:
        search_filter = or_(
            User.name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Build response with conversation counts
    user_responses = []
    for user in users:
        conv_count = await get_user_conversation_count(db, user.id)
        user_responses.append(UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role if isinstance(user.role, str) else user.role.value,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            last_seen_at=user.last_seen_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            conversation_count=conv_count,
        ))
    
    total_pages = (total + per_page - 1) // per_page
    
    return UserListResponse(
        users=user_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


# =============================================================================
# Get User
# =============================================================================

@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: UUID,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get details of a specific user.
    Requires admin or owner role.
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Get stats
    assigned_count = await get_user_conversation_count(db, user.id)
    resolved_count = await get_user_resolved_count(db, user.id)
    
    return UserDetailResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role if isinstance(user.role, str) else user.role.value,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        last_seen_at=user.last_seen_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        assigned_conversations=assigned_count,
        resolved_conversations=resolved_count,
    )


# =============================================================================
# Create User
# =============================================================================

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new user/agent.
    Requires admin or owner role.
    
    - Admins can only create agents
    - Owners can create admins and agents
    """
    # Check role permissions
    current_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    requested_role = data.role.value if isinstance(data.role, UserRole) else data.role
    
    # Admins can only create agents
    if current_role == "admin" and requested_role != "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins can only create agent users",
        )
    
    # Nobody can create owners
    if requested_role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create owner users",
        )
    
    # Check if email already exists in tenant
    existing = await db.execute(
        select(User).where(
            User.tenant_id == current_user.tenant_id,
            User.email == data.email.lower(),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    
    # Generate password if not provided
    password = data.password or generate_temp_password()
    
    # Create user
    user = User(
        tenant_id=current_user.tenant_id,
        email=data.email.lower(),
        name=data.name,
        role=requested_role,
        password_hash=hash_password(password),
        is_active=True,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    logger.info(f"User {user.email} created by {current_user.user.email}")
    
    # Note: In production, you'd send an invite email with the temp password
    # or a magic link. For now, we return the user and log the temp password.
    if not data.password:
        logger.info(f"Temporary password for {user.email}: {password}")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role if isinstance(user.role, str) else user.role.value,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        last_seen_at=user.last_seen_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        conversation_count=0,
    )


# =============================================================================
# Update User
# =============================================================================

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update a user.
    Requires admin or owner role.
    
    Restrictions:
    - Cannot edit yourself through this endpoint
    - Admins can only edit agents
    - Only owners can change roles
    - Cannot change role to owner
    """
    # Get the user to update
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Cannot edit yourself
    if user.id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the profile endpoint to edit your own account",
        )
    
    current_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    target_role = user.role if isinstance(user.role, str) else user.role.value
    
    # Admins can only edit agents
    if current_role == "admin" and target_role != "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins can only edit agent users",
        )
    
    # Only owners can change roles
    if data.role is not None:
        if current_role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners can change user roles",
            )
        
        new_role = data.role.value if isinstance(data.role, UserRole) else data.role
        
        # Cannot change to owner
        if new_role == "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change role to owner",
            )
        
        user.role = new_role
    
    # Update other fields
    if data.name is not None:
        user.name = data.name
    
    if data.email is not None:
        # Check for duplicate
        existing = await db.execute(
            select(User).where(
                User.tenant_id == current_user.tenant_id,
                User.email == data.email.lower(),
                User.id != user_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
        user.email = data.email.lower()
    
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    
    if data.is_active is not None:
        # Only owners can deactivate users
        if current_role != "owner" and data.is_active != user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners can change user active status",
            )
        user.is_active = data.is_active
    
    await db.commit()
    await db.refresh(user)
    
    conv_count = await get_user_conversation_count(db, user.id)
    
    logger.info(f"User {user.email} updated by {current_user.user.email}")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role if isinstance(user.role, str) else user.role.value,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        last_seen_at=user.last_seen_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        conversation_count=conv_count,
    )


# =============================================================================
# Delete/Deactivate User
# =============================================================================

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: Annotated[CurrentUser, Depends(require_owner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Deactivate a user (soft delete).
    Requires owner role.
    
    Note: We don't hard delete to preserve conversation history.
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Cannot delete yourself
    if user.id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )
    
    # Cannot delete other owners
    target_role = user.role if isinstance(user.role, str) else user.role.value
    if target_role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate owner accounts",
        )
    
    # Soft delete
    user.is_active = False
    await db.commit()
    
    logger.info(f"User {user.email} deactivated by {current_user.user.email}")
    
    return None


# =============================================================================
# Reset Password (Admin action)
# =============================================================================

@router.post("/{user_id}/reset-password", status_code=status.HTTP_200_OK)
async def reset_user_password(
    user_id: UUID,
    data: UserPasswordReset,
    current_user: Annotated[CurrentUser, Depends(require_owner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Reset a user's password.
    Requires owner role.
    """
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Cannot reset your own password here
    if user.id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the change password endpoint for your own account",
        )
    
    user.password_hash = hash_password(data.new_password)
    await db.commit()
    
    logger.info(f"Password reset for {user.email} by {current_user.user.email}")
    
    return {"message": "Password reset successfully"}