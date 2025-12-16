"""
Customer Management API Endpoints
Handles customer profile management, search, and conversation history.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import selectinload

from app.core.deps import DbSession, AuthenticatedUser
from app.models.models import Customer, Conversation, Message
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerDetail,
    ConversationSummary,
    CustomerConversationsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# List Customers
# =============================================================================

@router.get(
    "/",
    response_model=CustomerListResponse,
    summary="List customers",
)
async def list_customers(
    db: DbSession,
    current: AuthenticatedUser,
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    sort_by: str = Query("last_contact", description="Sort by: name, email, last_contact, created, conversations"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List customers for the current tenant with search and pagination.
    """
    tenant_id = current.tenant_id
    
    # Base query
    base_query = select(Customer).where(Customer.tenant_id == tenant_id)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        base_query = base_query.where(
            or_(
                Customer.name.ilike(search_term),
                Customer.email.ilike(search_term),
                Customer.phone.ilike(search_term),
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply sorting
    sort_column = {
        "name": Customer.name,
        "email": Customer.email,
        "created": Customer.created_at,
        "last_contact": Customer.updated_at,
    }.get(sort_by, Customer.updated_at)
    
    if sort_order == "asc":
        base_query = base_query.order_by(sort_column.asc().nulls_last())
    else:
        base_query = base_query.order_by(sort_column.desc().nulls_last())
    
    # Apply pagination
    base_query = base_query.offset(offset).limit(limit)
    
    # Execute
    result = await db.execute(base_query)
    customers = result.scalars().all()
    
    # Build response with conversation counts
    customer_responses = []
    for customer in customers:
        # Get conversation count and last contact
        stats_query = select(
            func.count(Conversation.id).label("conv_count"),
            func.max(Conversation.updated_at).label("last_contact"),
        ).where(Conversation.customer_id == customer.id)
        
        stats_result = await db.execute(stats_query)
        stats = stats_result.one()
        
        customer_responses.append(
            CustomerResponse(
                id=customer.id,
                name=customer.name,
                email=customer.email,
                phone=customer.phone,
                conversation_count=stats.conv_count or 0,
                last_contact_at=stats.last_contact,
                created_at=customer.created_at,
                updated_at=customer.updated_at,
            )
        )
    
    return CustomerListResponse(
        customers=customer_responses,
        total=total,
        limit=limit,
        offset=offset,
    )


# =============================================================================
# Get Customer Detail
# =============================================================================

@router.get(
    "/{customer_id}",
    response_model=CustomerDetail,
    summary="Get customer details",
)
async def get_customer(
    customer_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Get full customer profile with conversation history and stats.
    """
    tenant_id = current.tenant_id
    
    # Get customer
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id,
        )
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    
    # Get conversation stats
    stats_query = select(
        func.count(Conversation.id).label("conv_count"),
        func.min(Conversation.created_at).label("first_contact"),
        func.max(Conversation.updated_at).label("last_contact"),
    ).where(Conversation.customer_id == customer_id)
    
    stats_result = await db.execute(stats_query)
    stats = stats_result.one()
    
    # Get total message count across all conversations
    msg_count_query = select(func.count(Message.id)).join(
        Conversation, Message.conversation_id == Conversation.id
    ).where(Conversation.customer_id == customer_id)
    
    msg_result = await db.execute(msg_count_query)
    total_messages = msg_result.scalar() or 0
    
    # Get recent conversations (last 10)
    conv_query = (
        select(Conversation)
        .where(Conversation.customer_id == customer_id)
        .order_by(desc(Conversation.updated_at))
        .limit(10)
    )
    
    conv_result = await db.execute(conv_query)
    conversations = conv_result.scalars().all()
    
    # Build conversation summaries with message counts and previews
    recent_conversations = []
    for conv in conversations:
        # Get message count for this conversation
        conv_msg_query = select(func.count(Message.id)).where(
            Message.conversation_id == conv.id
        )
        conv_msg_result = await db.execute(conv_msg_query)
        msg_count = conv_msg_result.scalar() or 0
        
        # Get last message preview
        last_msg_query = (
            select(Message.content)
            .where(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        last_msg_result = await db.execute(last_msg_query)
        last_msg = last_msg_result.scalar()
        preview = last_msg[:100] + "..." if last_msg and len(last_msg) > 100 else last_msg
        
        recent_conversations.append(
            ConversationSummary(
                id=conv.id,
                channel=conv.channel.value if hasattr(conv.channel, 'value') else str(conv.channel),
                status=conv.status.value if hasattr(conv.status, 'value') else str(conv.status),
                subject=conv.subject,
                message_count=msg_count,
                ai_handled=conv.ai_handled,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                last_message_preview=preview,
            )
        )
    
    return CustomerDetail(
        id=customer.id,
        tenant_id=customer.tenant_id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        external_ids=customer.external_ids or {},
        metadata_=customer.metadata_ or {},
        conversation_count=stats.conv_count or 0,
        total_messages=total_messages,
        first_contact_at=stats.first_contact,
        last_contact_at=stats.last_contact,
        recent_conversations=recent_conversations,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
    )


# =============================================================================
# Create Customer
# =============================================================================

@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create customer",
)
async def create_customer(
    data: CustomerCreate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Create a new customer manually.
    
    Note: Customers are also created automatically when someone starts a chat.
    """
    tenant_id = current.tenant_id
    
    # Check for duplicate email within tenant
    if data.email:
        existing_query = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.email == data.email,
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A customer with this email already exists",
            )
    
    # Check for duplicate phone within tenant
    if data.phone:
        existing_query = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.phone == data.phone,
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A customer with this phone number already exists",
            )
    
    # Create customer
    customer = Customer(
        tenant_id=tenant_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        metadata_=data.metadata or {},
        external_ids=data.external_ids or {},
    )
    
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    
    logger.info(f"Created customer {customer.id} for tenant {tenant_id}")
    
    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        conversation_count=0,
        last_contact_at=None,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
    )


# =============================================================================
# Update Customer
# =============================================================================

@router.patch(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Update customer",
)
async def update_customer(
    customer_id: UUID,
    data: CustomerUpdate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Update customer profile information.
    """
    tenant_id = current.tenant_id
    
    # Get customer
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id,
        )
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    
    # Check for duplicate email if changing
    if data.email is not None and data.email != customer.email:
        existing_query = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.email == data.email,
            Customer.id != customer_id,
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A customer with this email already exists",
            )
    
    # Check for duplicate phone if changing
    if data.phone is not None and data.phone != customer.phone:
        existing_query = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.phone == data.phone,
            Customer.id != customer_id,
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A customer with this phone number already exists",
            )
    
    # Update fields
    if data.name is not None:
        customer.name = data.name
    if data.email is not None:
        customer.email = data.email
    if data.phone is not None:
        customer.phone = data.phone
    if data.metadata is not None:
        customer.metadata_ = data.metadata
    if data.external_ids is not None:
        customer.external_ids = data.external_ids
    
    await db.commit()
    await db.refresh(customer)
    
    # Get conversation count
    stats_query = select(
        func.count(Conversation.id).label("conv_count"),
        func.max(Conversation.updated_at).label("last_contact"),
    ).where(Conversation.customer_id == customer_id)
    
    stats_result = await db.execute(stats_query)
    stats = stats_result.one()
    
    logger.info(f"Updated customer {customer_id}")
    
    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        conversation_count=stats.conv_count or 0,
        last_contact_at=stats.last_contact,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
    )


# =============================================================================
# Delete Customer
# =============================================================================

@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete customer",
)
async def delete_customer(
    customer_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Delete a customer and all their conversations.
    
    Warning: This is a destructive operation and cannot be undone.
    """
    tenant_id = current.tenant_id
    
    # Get customer
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id,
        )
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    
    # Delete customer (cascade will handle conversations and messages)
    await db.delete(customer)
    await db.commit()
    
    logger.info(f"Deleted customer {customer_id} for tenant {tenant_id}")
    
    return None


# =============================================================================
# Get Customer Conversations
# =============================================================================

@router.get(
    "/{customer_id}/conversations",
    response_model=CustomerConversationsResponse,
    summary="Get customer conversations",
)
async def get_customer_conversations(
    customer_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
    status_filter: Optional[str] = Query(None, description="Filter by status: open, pending, resolved, closed"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Get all conversations for a specific customer.
    """
    tenant_id = current.tenant_id
    
    # Verify customer exists and belongs to tenant
    customer_query = select(Customer).where(
        Customer.id == customer_id,
        Customer.tenant_id == tenant_id,
    )
    customer_result = await db.execute(customer_query)
    customer = customer_result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    
    # Build conversation query
    conv_query = select(Conversation).where(Conversation.customer_id == customer_id)
    
    # Apply status filter
    if status_filter:
        conv_query = conv_query.where(Conversation.status == status_filter)
    
    # Get total count
    count_query = select(func.count()).select_from(conv_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    conv_query = (
        conv_query
        .order_by(desc(Conversation.updated_at))
        .offset(offset)
        .limit(limit)
    )
    
    conv_result = await db.execute(conv_query)
    conversations = conv_result.scalars().all()
    
    # Build summaries
    conversation_summaries = []
    for conv in conversations:
        # Get message count
        msg_count_query = select(func.count(Message.id)).where(
            Message.conversation_id == conv.id
        )
        msg_result = await db.execute(msg_count_query)
        msg_count = msg_result.scalar() or 0
        
        # Get last message preview
        last_msg_query = (
            select(Message.content)
            .where(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        last_msg_result = await db.execute(last_msg_query)
        last_msg = last_msg_result.scalar()
        preview = last_msg[:100] + "..." if last_msg and len(last_msg) > 100 else last_msg
        
        conversation_summaries.append(
            ConversationSummary(
                id=conv.id,
                channel=conv.channel.value if hasattr(conv.channel, 'value') else str(conv.channel),
                status=conv.status.value if hasattr(conv.status, 'value') else str(conv.status),
                subject=conv.subject,
                message_count=msg_count,
                ai_handled=conv.ai_handled,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                last_message_preview=preview,
            )
        )
    
    return CustomerConversationsResponse(
        customer_id=customer_id,
        customer_name=customer.name,
        conversations=conversation_summaries,
        total=total,
    )