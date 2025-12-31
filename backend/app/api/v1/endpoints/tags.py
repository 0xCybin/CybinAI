"""
Tags API Endpoints

Handles tag management and conversation tagging.
- Tag CRUD: Admin/Owner only
- Tag assignment: Any authenticated user (agent+)
"""

import logging
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import CurrentUser, get_current_user, require_admin
from app.models.tags import Tag, ConversationTag
from app.models.models import Conversation, User
from app.schemas.tags import (
    TagCreate,
    TagUpdate,
    TagResponse,
    TagListResponse,
    TagAssign,
    TagBulkAssign,
    ConversationTagResponse,
    ConversationTagsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

async def get_tag_conversation_count(db: AsyncSession, tag_id: UUID) -> int:
    """Get the number of conversations using this tag."""
    result = await db.execute(
        select(func.count(ConversationTag.conversation_id)).where(
            ConversationTag.tag_id == tag_id
        )
    )
    return result.scalar() or 0


async def get_tag_or_404(
    db: AsyncSession, 
    tag_id: UUID, 
    tenant_id: UUID
) -> Tag:
    """Get a tag by ID or raise 404."""
    result = await db.execute(
        select(Tag).where(
            and_(Tag.id == tag_id, Tag.tenant_id == tenant_id)
        )
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    return tag


async def get_conversation_or_404(
    db: AsyncSession,
    conversation_id: UUID,
    tenant_id: UUID
) -> Conversation:
    """Get a conversation by ID or raise 404."""
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    return conversation


# =============================================================================
# Tag CRUD (Admin Only)
# =============================================================================

@router.get("", response_model=TagListResponse)
async def list_tags(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: Optional[str] = Query(None, description="Search by name"),
):
    """
    List all tags for the tenant.
    Any authenticated user can view tags.
    """
    query = select(Tag).where(Tag.tenant_id == current_user.tenant_id)
    
    if search:
        query = query.where(Tag.name.ilike(f"%{search}%"))
    
    query = query.order_by(Tag.name)
    
    result = await db.execute(query)
    tags = result.scalars().all()
    
    # Get conversation counts for each tag
    tag_responses = []
    for tag in tags:
        count = await get_tag_conversation_count(db, tag.id)
        tag_responses.append(TagResponse(
            id=tag.id,
            name=tag.name,
            color=tag.color,
            description=tag.description,
            conversation_count=count,
            created_at=tag.created_at,
            updated_at=tag.updated_at,
        ))
    
    return TagListResponse(tags=tag_responses, total=len(tag_responses))


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new tag.
    Requires admin or owner role.
    """
    # Check for duplicate name
    existing = await db.execute(
        select(Tag).where(
            and_(
                Tag.tenant_id == current_user.tenant_id,
                Tag.name.ilike(data.name)
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag '{data.name}' already exists"
        )
    
    tag = Tag(
        tenant_id=current_user.tenant_id,
        name=data.name,
        color=data.color,
        description=data.description,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    
    logger.info(f"Tag created: {tag.name} by user {current_user.user_id}")
    
    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        description=tag.description,
        conversation_count=0,
        created_at=tag.created_at,
        updated_at=tag.updated_at,
    )


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single tag by ID."""
    tag = await get_tag_or_404(db, tag_id, current_user.tenant_id)
    count = await get_tag_conversation_count(db, tag.id)
    
    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        description=tag.description,
        conversation_count=count,
        created_at=tag.created_at,
        updated_at=tag.updated_at,
    )


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    data: TagUpdate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update a tag.
    Requires admin or owner role.
    """
    tag = await get_tag_or_404(db, tag_id, current_user.tenant_id)
    
    # Check for duplicate name if name is being changed
    if data.name and data.name.lower() != tag.name.lower():
        existing = await db.execute(
            select(Tag).where(
                and_(
                    Tag.tenant_id == current_user.tenant_id,
                    Tag.name.ilike(data.name),
                    Tag.id != tag_id
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tag '{data.name}' already exists"
            )
    
    # Update fields
    if data.name is not None:
        tag.name = data.name
    if data.color is not None:
        tag.color = data.color
    if data.description is not None:
        tag.description = data.description
    
    await db.commit()
    await db.refresh(tag)
    
    count = await get_tag_conversation_count(db, tag.id)
    
    logger.info(f"Tag updated: {tag.name} by user {current_user.user_id}")
    
    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        description=tag.description,
        conversation_count=count,
        created_at=tag.created_at,
        updated_at=tag.updated_at,
    )


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Delete a tag.
    Requires admin or owner role.
    This will remove the tag from all conversations.
    """
    tag = await get_tag_or_404(db, tag_id, current_user.tenant_id)
    
    logger.info(f"Tag deleted: {tag.name} by user {current_user.user_id}")
    
    await db.delete(tag)
    await db.commit()
    
    return None


# =============================================================================
# Conversation Tagging (Any Authenticated User)
# =============================================================================

@router.get(
    "/conversations/{conversation_id}/tags", 
    response_model=ConversationTagsResponse
)
async def get_conversation_tags(
    conversation_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all tags assigned to a conversation."""
    # Verify conversation exists and belongs to tenant
    await get_conversation_or_404(db, conversation_id, current_user.tenant_id)
    
    # Get tags with assignment info
    result = await db.execute(
        select(ConversationTag, Tag, User)
        .join(Tag, ConversationTag.tag_id == Tag.id)
        .outerjoin(User, ConversationTag.assigned_by == User.id)
        .where(ConversationTag.conversation_id == conversation_id)
        .order_by(Tag.name)
    )
    rows = result.all()
    
    tags = []
    for conv_tag, tag, user in rows:
        tags.append(ConversationTagResponse(
            id=tag.id,
            name=tag.name,
            color=tag.color,
            assigned_at=conv_tag.assigned_at,
            assigned_by=conv_tag.assigned_by,
            assigned_by_name=user.name if user else None,
        ))
    
    return ConversationTagsResponse(
        conversation_id=conversation_id,
        tags=tags
    )


@router.post(
    "/conversations/{conversation_id}/tags",
    response_model=ConversationTagsResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_tag_to_conversation(
    conversation_id: UUID,
    data: TagAssign,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Add a tag to a conversation."""
    # Verify conversation exists
    await get_conversation_or_404(db, conversation_id, current_user.tenant_id)
    
    # Verify tag exists
    tag = await get_tag_or_404(db, data.tag_id, current_user.tenant_id)
    
    # Check if already assigned
    existing = await db.execute(
        select(ConversationTag).where(
            and_(
                ConversationTag.conversation_id == conversation_id,
                ConversationTag.tag_id == data.tag_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag '{tag.name}' is already assigned to this conversation"
        )
    
    # Create assignment
    conv_tag = ConversationTag(
        conversation_id=conversation_id,
        tag_id=data.tag_id,
        assigned_by=current_user.user_id,
    )
    db.add(conv_tag)
    await db.commit()
    
    logger.info(
        f"Tag '{tag.name}' added to conversation {conversation_id} "
        f"by user {current_user.user_id}"
    )
    
    # Return updated tags list
    return await get_conversation_tags(conversation_id, current_user, db)


@router.post(
    "/conversations/{conversation_id}/tags/bulk",
    response_model=ConversationTagsResponse,
    status_code=status.HTTP_201_CREATED
)
async def bulk_add_tags_to_conversation(
    conversation_id: UUID,
    data: TagBulkAssign,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Add multiple tags to a conversation at once."""
    # Verify conversation exists
    await get_conversation_or_404(db, conversation_id, current_user.tenant_id)
    
    # Get existing tags on this conversation
    existing_result = await db.execute(
        select(ConversationTag.tag_id).where(
            ConversationTag.conversation_id == conversation_id
        )
    )
    existing_tag_ids = set(row[0] for row in existing_result.all())
    
    # Add each tag that isn't already assigned
    for tag_id in data.tag_ids:
        if tag_id in existing_tag_ids:
            continue
        
        # Verify tag exists and belongs to tenant
        tag = await get_tag_or_404(db, tag_id, current_user.tenant_id)
        
        conv_tag = ConversationTag(
            conversation_id=conversation_id,
            tag_id=tag_id,
            assigned_by=current_user.user_id,
        )
        db.add(conv_tag)
    
    await db.commit()
    
    logger.info(
        f"Bulk tags added to conversation {conversation_id} "
        f"by user {current_user.user_id}"
    )
    
    # Return updated tags list
    return await get_conversation_tags(conversation_id, current_user, db)


@router.delete(
    "/conversations/{conversation_id}/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def remove_tag_from_conversation(
    conversation_id: UUID,
    tag_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Remove a tag from a conversation."""
    # Verify conversation exists
    await get_conversation_or_404(db, conversation_id, current_user.tenant_id)
    
    # Find the assignment
    result = await db.execute(
        select(ConversationTag).where(
            and_(
                ConversationTag.conversation_id == conversation_id,
                ConversationTag.tag_id == tag_id
            )
        )
    )
    conv_tag = result.scalar_one_or_none()
    
    if not conv_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag is not assigned to this conversation"
        )
    
    await db.delete(conv_tag)
    await db.commit()
    
    logger.info(
        f"Tag {tag_id} removed from conversation {conversation_id} "
        f"by user {current_user.user_id}"
    )
    
    return None


@router.put(
    "/conversations/{conversation_id}/tags",
    response_model=ConversationTagsResponse
)
async def set_conversation_tags(
    conversation_id: UUID,
    data: TagBulkAssign,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Replace all tags on a conversation with the provided list.
    Useful for "set and forget" tag management.
    """
    # Verify conversation exists
    await get_conversation_or_404(db, conversation_id, current_user.tenant_id)
    
    # Verify all tags exist and belong to tenant
    for tag_id in data.tag_ids:
        await get_tag_or_404(db, tag_id, current_user.tenant_id)
    
    # Remove all existing tags
    await db.execute(
        ConversationTag.__table__.delete().where(
            ConversationTag.conversation_id == conversation_id
        )
    )
    
    # Add new tags
    for tag_id in data.tag_ids:
        conv_tag = ConversationTag(
            conversation_id=conversation_id,
            tag_id=tag_id,
            assigned_by=current_user.user_id,
        )
        db.add(conv_tag)
    
    await db.commit()
    
    logger.info(
        f"Tags replaced on conversation {conversation_id} "
        f"by user {current_user.user_id}"
    )
    
    # Return updated tags list
    return await get_conversation_tags(conversation_id, current_user, db)