"""
Conversation/Ticket Endpoints
Handles conversation management for the agent dashboard.
Complete file: backend/app/api/v1/endpoints/conversations.py
"""

from datetime import datetime
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func, desc, and_
from sqlalchemy.orm import selectinload

from app.core.deps import DbSession, AuthenticatedUser
from app.core.websocket import emit_new_message, emit_internal_note
from app.models.models import (
    Conversation,
    Message,
    Customer,
    User,
    InternalNote,
    ConversationStatus,
    ConversationPriority,
    SenderType,
)
from app.schemas.conversation import (
    ConversationListResponse,
    ConversationListItem,
    ConversationDetail,
    ConversationAssign,
    ConversationStatusUpdate,
    ConversationPriorityUpdate,
    MessageCreate,
    MessageResponse,
    CustomerInfo,
)
from app.schemas.internal_notes import (
    InternalNoteCreate,
    InternalNoteResponse,
    InternalNoteListResponse,
    NoteAuthor,
)

router = APIRouter()


# ============================================================================
# Helper Functions
# ============================================================================

async def get_message_stats(db, conversation_id: UUID) -> dict:
    """Get message count and last message preview for a conversation."""
    count_result = await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
    )
    count = count_result.scalar() or 0
    
    last_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .limit(1)
    )
    last_msg = last_result.scalar_one_or_none()
    
    return {
        "count": count,
        "last_preview": last_msg.content[:100] if last_msg else None,
        "last_at": last_msg.created_at if last_msg else None,
    }


# ============================================================================
# List & Get Conversations
# ============================================================================

@router.get("/", response_model=ConversationListResponse, summary="List conversations")
async def list_conversations(
    db: DbSession,
    current: AuthenticatedUser,
    # Filter params
    status: Optional[str] = Query(None, description="Filter by status: open, pending, resolved, closed"),
    priority: Optional[str] = Query(None, description="Filter by priority: low, normal, high, urgent"),
    assigned_to: Optional[UUID] = Query(None, description="Filter by assigned agent ID"),
    unassigned_only: bool = Query(False, description="Show only unassigned conversations"),
    ai_handled: Optional[bool] = Query(None, description="Filter by AI handling status"),
    channel: Optional[str] = Query(None, description="Filter by channel: chat, email, sms"),
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, alias="limit", description="Items per page"),
):
    """
    List conversations/tickets for the current tenant.
    Supports filtering by status, priority, assignment, and more.
    """
    tenant_id = current.tenant.id
    offset = (page - 1) * page_size
    
    # Base query
    query = (
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(Conversation.tenant_id == tenant_id)
    )
    count_query = select(func.count(Conversation.id)).where(
        Conversation.tenant_id == tenant_id
    )
    
    # Apply filters
    if status:
        query = query.where(Conversation.status == status)
        count_query = count_query.where(Conversation.status == status)
    
    if priority:
        query = query.where(Conversation.priority == priority)
        count_query = count_query.where(Conversation.priority == priority)
    
    if assigned_to:
        query = query.where(Conversation.assigned_to == assigned_to)
        count_query = count_query.where(Conversation.assigned_to == assigned_to)
    
    if unassigned_only:
        query = query.where(Conversation.assigned_to.is_(None))
        count_query = count_query.where(Conversation.assigned_to.is_(None))
    
    if ai_handled is not None:
        query = query.where(Conversation.ai_handled == ai_handled)
        count_query = count_query.where(Conversation.ai_handled == ai_handled)
    
    if channel:
        query = query.where(Conversation.channel == channel)
        count_query = count_query.where(Conversation.channel == channel)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    query = query.order_by(desc(Conversation.updated_at)).offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    conversations = result.scalars().all()
    
    # Build response items
    items = []
    for conv in conversations:
        # Get message stats
        msg_stats = await get_message_stats(db, conv.id)
        
        # Get agent name if assigned
        agent_name = None
        if conv.assigned_to:
            agent_result = await db.execute(
                select(User).where(User.id == conv.assigned_to)
            )
            agent = agent_result.scalar_one_or_none()
            if agent:
                agent_name = agent.name
        
        items.append(ConversationListItem(
            id=conv.id,
            customer=CustomerInfo(
                id=conv.customer.id,
                name=conv.customer.name,
                email=conv.customer.email,
                phone=conv.customer.phone,
            ) if conv.customer else None,
            channel=conv.channel.value if hasattr(conv.channel, 'value') else conv.channel,
            status=conv.status.value if hasattr(conv.status, 'value') else conv.status,
            priority=conv.priority.value if hasattr(conv.priority, 'value') else conv.priority,
            ai_handled=conv.ai_handled,
            ai_confidence=conv.ai_confidence,
            assigned_to=conv.assigned_to,
            assigned_agent_name=agent_name,
            last_message_preview=msg_stats["last_preview"],
            last_message_at=msg_stats["last_at"],
            message_count=msg_stats["count"],
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        ))
    
    return ConversationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{conversation_id}", response_model=ConversationDetail, summary="Get conversation")
async def get_conversation(
    conversation_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Get full conversation details including all messages and internal notes.
    """
    tenant_id = current.tenant.id
    
    # Get conversation with customer
    query = (
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Get all messages
    msg_query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    msg_result = await db.execute(msg_query)
    messages = msg_result.scalars().all()
    
    # Get internal notes with author info
    notes_query = (
        select(InternalNote)
        .options(selectinload(InternalNote.author))
        .where(InternalNote.conversation_id == conversation_id)
        .order_by(InternalNote.created_at.asc())
    )
    notes_result = await db.execute(notes_query)
    notes = notes_result.scalars().all()
    
    # Get agent name
    agent_name = None
    if conv.assigned_to:
        agent_result = await db.execute(select(User).where(User.id == conv.assigned_to))
        agent = agent_result.scalar_one_or_none()
        if agent:
            agent_name = agent.name
    
    return ConversationDetail(
        id=conv.id,
        tenant_id=conv.tenant_id,
        customer=CustomerInfo(
            id=conv.customer.id,
            name=conv.customer.name,
            email=conv.customer.email,
            phone=conv.customer.phone,
        ) if conv.customer else None,
        channel=conv.channel.value if hasattr(conv.channel, 'value') else conv.channel,
        status=conv.status.value if hasattr(conv.status, 'value') else conv.status,
        priority=conv.priority.value if hasattr(conv.priority, 'value') else conv.priority,
        ai_handled=conv.ai_handled,
        ai_confidence=conv.ai_confidence,
        assigned_to=conv.assigned_to,
        assigned_agent_name=agent_name,
        metadata=conv.metadata_ or {},
        messages=[
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_type=m.sender_type.value if hasattr(m.sender_type, 'value') else m.sender_type,
                sender_id=m.sender_id,
                content=m.content,
                metadata=m.ai_metadata or {},
                created_at=m.created_at,
            )
            for m in messages
        ],
        internal_notes=[
            InternalNoteResponse(
                id=note.id,
                conversation_id=note.conversation_id,
                author=NoteAuthor(
                    id=note.author.id,
                    name=note.author.name,
                    avatar_url=note.author.avatar_url,
                ),
                content=note.content,
                mentions=note.mentions or [],
                created_at=note.created_at,
            )
            for note in notes
        ],
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


# ============================================================================
# Conversation Actions
# ============================================================================

@router.post("/{conversation_id}/assign", response_model=ConversationDetail, summary="Assign conversation")
async def assign_conversation(
    conversation_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
    data: ConversationAssign = None,
):
    """
    Assign conversation to an agent (human takeover).
    If agent_id is not provided, assigns to the current user.
    """
    tenant_id = current.tenant.id
    
    # Use current user if no agent specified
    agent_id = data.agent_id if data and data.agent_id else current.user.id
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Verify agent belongs to tenant
    agent_result = await db.execute(
        select(User).where(
            and_(
                User.id == agent_id,
                User.tenant_id == tenant_id,
            )
        )
    )
    agent = agent_result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent not found in this tenant",
        )
    
    # Assign and mark as human-handled
    conv.assigned_to = agent_id
    conv.ai_handled = False
    conv.updated_at = datetime.utcnow()
    
    # Update status to open if it was pending
    if conv.status == ConversationStatus.PENDING or conv.status == "pending":
        conv.status = ConversationStatus.OPEN
    
    await db.commit()
    
    # Return updated conversation
    return await get_conversation(conversation_id, db, current)


@router.post("/{conversation_id}/take-over", response_model=ConversationDetail, summary="Take over conversation")
async def take_over_conversation(
    conversation_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Take over a conversation (assign to current user).
    Shortcut for assign with no agent_id.
    """
    return await assign_conversation(conversation_id, db, current, None)


@router.post("/{conversation_id}/unassign", response_model=ConversationDetail, summary="Unassign conversation")
async def unassign_conversation(
    conversation_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Unassign a conversation (return to AI handling or queue).
    """
    tenant_id = current.tenant.id
    
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    conv.assigned_to = None
    conv.ai_handled = True
    conv.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return await get_conversation(conversation_id, db, current)


@router.patch("/{conversation_id}/status", response_model=ConversationDetail, summary="Update status")
async def update_conversation_status(
    conversation_id: UUID,
    data: ConversationStatusUpdate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Update conversation status (open, pending, resolved, closed).
    """
    tenant_id = current.tenant.id
    
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Map string to enum if needed
    if hasattr(ConversationStatus, data.status.upper()):
        conv.status = getattr(ConversationStatus, data.status.upper())
    else:
        conv.status = data.status
    
    conv.updated_at = datetime.utcnow()
    
    # Set resolved_at if resolving
    if data.status in ["resolved", "closed"]:
        conv.resolved_at = datetime.utcnow()
    
    await db.commit()
    
    return await get_conversation(conversation_id, db, current)


@router.patch("/{conversation_id}/priority", response_model=ConversationDetail, summary="Update priority")
async def update_conversation_priority(
    conversation_id: UUID,
    data: ConversationPriorityUpdate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Update conversation priority (low, normal, high, urgent).
    """
    tenant_id = current.tenant.id
    
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Map string to enum if needed
    if hasattr(ConversationPriority, data.priority.upper()):
        conv.priority = getattr(ConversationPriority, data.priority.upper())
    else:
        conv.priority = data.priority
    
    conv.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return await get_conversation(conversation_id, db, current)


# ============================================================================
# Messages
# ============================================================================

@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="Send agent message")
async def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Send a message as an agent in a conversation.
    Automatically assigns the conversation to the current agent if not already assigned.
    Emits WebSocket event for real-time updates to widget and other agents.
    """
    tenant_id = current.tenant.id
    agent_id = current.user.id
    
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Create the message
    message = Message(
        conversation_id=conversation_id,
        sender_type=SenderType.AGENT if hasattr(SenderType, 'AGENT') else "agent",
        sender_id=agent_id,
        content=data.content,
        ai_metadata={},
    )
    db.add(message)
    
    # Update conversation
    conv.updated_at = datetime.utcnow()
    
    # Auto-assign if not already assigned to this agent
    if conv.assigned_to != agent_id:
        conv.assigned_to = agent_id
        conv.ai_handled = False
    
    # Set first_response_at if this is the first agent response
    if not conv.first_response_at:
        conv.first_response_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(message)
    
    # Emit WebSocket event for real-time updates
    await emit_new_message(
        tenant_id=tenant_id,
        conversation_id=conversation_id,
        message_data={
            "id": str(message.id),
            "conversation_id": str(message.conversation_id),
            "sender_type": message.sender_type.value if hasattr(message.sender_type, 'value') else message.sender_type,
            "sender_id": str(message.sender_id) if message.sender_id else None,
            "content": message.content,
            "created_at": message.created_at.isoformat(),
        }
    )
    
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_type=message.sender_type.value if hasattr(message.sender_type, 'value') else message.sender_type,
        sender_id=message.sender_id,
        content=message.content,
        metadata=message.ai_metadata or {},
        created_at=message.created_at,
    )


# ============================================================================
# Internal Notes
# ============================================================================

@router.get(
    "/{conversation_id}/notes",
    response_model=InternalNoteListResponse,
    summary="List internal notes"
)
async def list_internal_notes(
    conversation_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Get all internal notes for a conversation.
    Only accessible to authenticated agents - NEVER exposed to customers.
    """
    tenant_id = current.tenant.id

    # Verify conversation exists and belongs to tenant
    conv_result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    conv = conv_result.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Get all notes with author info
    notes_query = (
        select(InternalNote)
        .options(selectinload(InternalNote.author))
        .where(InternalNote.conversation_id == conversation_id)
        .order_by(InternalNote.created_at.asc())
    )
    notes_result = await db.execute(notes_query)
    notes = notes_result.scalars().all()

    return InternalNoteListResponse(
        items=[
            InternalNoteResponse(
                id=note.id,
                conversation_id=note.conversation_id,
                author=NoteAuthor(
                    id=note.author.id,
                    name=note.author.name,
                    avatar_url=note.author.avatar_url,
                ),
                content=note.content,
                mentions=note.mentions or [],
                created_at=note.created_at,
            )
            for note in notes
        ],
        total=len(notes),
    )


@router.post(
    "/{conversation_id}/notes",
    response_model=InternalNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add internal note"
)
async def create_internal_note(
    conversation_id: UUID,
    data: InternalNoteCreate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Add an internal note to a conversation.
    
    Internal notes are for agent collaboration and are NEVER visible to customers.
    Supports @mentions of other agents (stored as UUIDs for future notification).
    """
    tenant_id = current.tenant.id
    author_id = current.user.id

    # Verify conversation exists and belongs to tenant
    conv_result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    conv = conv_result.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Create the note
    note = InternalNote(
        conversation_id=conversation_id,
        author_id=author_id,
        content=data.content,
        mentions=data.mentions or [],
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    # Load author relationship
    author_result = await db.execute(
        select(User).where(User.id == author_id)
    )
    author = author_result.scalar_one()

    # Emit WebSocket event for real-time updates to other agents
    await emit_internal_note(
        tenant_id=tenant_id,
        conversation_id=conversation_id,
        note_data={
            "id": str(note.id),
            "conversation_id": str(note.conversation_id),
            "author": {
                "id": str(author.id),
                "name": author.name,
                "avatar_url": author.avatar_url,
            },
            "content": note.content,
            "mentions": [str(m) for m in (note.mentions or [])],
            "created_at": note.created_at.isoformat(),
        }
    )

    return InternalNoteResponse(
        id=note.id,
        conversation_id=note.conversation_id,
        author=NoteAuthor(
            id=author.id,
            name=author.name,
            avatar_url=author.avatar_url,
        ),
        content=note.content,
        mentions=note.mentions or [],
        created_at=note.created_at,
    )


@router.delete(
    "/{conversation_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete internal note"
)
async def delete_internal_note(
    conversation_id: UUID,
    note_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Delete an internal note.
    Only the note author or an admin can delete a note.
    """
    tenant_id = current.tenant.id
    user_id = current.user.id
    user_role = current.user.role

    # Get the note
    note_result = await db.execute(
        select(InternalNote)
        .join(Conversation)
        .where(
            and_(
                InternalNote.id == note_id,
                InternalNote.conversation_id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
    )
    note = note_result.scalar_one_or_none()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )

    # Check permission: author or admin/owner
    is_author = note.author_id == user_id
    is_admin = user_role in ("admin", "owner") if isinstance(user_role, str) else user_role.value in ("admin", "owner")
    
    if not is_author and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the note author or an admin can delete this note",
        )

    await db.delete(note)
    await db.commit()

    return None


# ============================================================================
# Legacy/Compatibility Endpoints
# ============================================================================

@router.patch("/{conversation_id}")
async def update_conversation(
    conversation_id: UUID,
    current: AuthenticatedUser,
):
    """
    Update conversation - redirects to specific endpoints.
    Use /status, /priority, or /assign for specific updates.
    """
    return {"message": "Use specific endpoints: /status, /priority, /assign"}


@router.post("/{conversation_id}/close", response_model=ConversationDetail, summary="Close conversation")
async def close_conversation(
    conversation_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Close/resolve a conversation.
    """
    return await update_conversation_status(
        conversation_id,
        ConversationStatusUpdate(status="closed"),
        db,
        current,
    )


@router.get("/{conversation_id}/ai-suggestions", summary="Get AI suggestions")
async def get_ai_suggestions(
    conversation_id: UUID,
    current: AuthenticatedUser,
):
    """
    Get AI-suggested responses for a conversation.
    TODO: Implement with actual AI suggestions based on context.
    """
    return {
        "suggestions": [
            "I understand your concern. Let me look into this for you.",
            "Thank you for your patience. I'm checking on this now.",
            "Is there anything else I can help you with today?",
        ]
    }