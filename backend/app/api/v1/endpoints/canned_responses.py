"""
Canned Responses API Endpoints

Handles CRUD operations for canned/quick responses that agents can use
to quickly reply to common queries.

Features:
- Create, read, update, delete canned responses
- Search by shortcut or content
- Variable expansion ({{customer_name}}, etc.)
- Track usage count
"""

import logging
import re
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import DbSession, AuthenticatedUser
from app.models.models import CannedResponse, Customer, Conversation

# Import schemas - adjust path as needed for your project structure
from app.schemas.canned_responses import (
    CannedResponseCreate,
    CannedResponseUpdate,
    CannedResponseResponse,
    CannedResponseList,
    CannedResponseExpanded,
    VariableContext,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

def extract_variables(content: str) -> List[str]:
    """Extract variable names from content (e.g., {{customer_name}})."""
    pattern = r"\{\{(\w+)\}\}"
    return list(set(re.findall(pattern, content)))


def expand_variables(content: str, context: dict) -> str:
    """Replace {{variable}} placeholders with actual values."""
    def replace_var(match):
        var_name = match.group(1)
        value = context.get(var_name)
        if value is not None:
            return str(value)
        # Leave placeholder if no value provided
        return match.group(0)
    
    pattern = r"\{\{(\w+)\}\}"
    return re.sub(pattern, replace_var, content)


# =============================================================================
# CRUD Endpoints
# =============================================================================

@router.get("", response_model=CannedResponseList, summary="List canned responses")
async def list_canned_responses(
    db: DbSession,
    current: AuthenticatedUser,
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """
    List all canned responses for the current tenant.
    
    Optionally filter by category.
    """
    query = select(CannedResponse).where(
        CannedResponse.tenant_id == current.tenant_id
    )
    
    if category:
        query = query.where(CannedResponse.category == category)
    
    # Get total count
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get paginated results, ordered by use_count (most used first)
    query = query.order_by(CannedResponse.use_count.desc(), CannedResponse.title)
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    responses = result.scalars().all()
    
    return CannedResponseList(
        responses=[CannedResponseResponse.model_validate(r) for r in responses],
        total=total
    )


@router.post("", response_model=CannedResponseResponse, status_code=status.HTTP_201_CREATED, summary="Create canned response")
async def create_canned_response(
    data: CannedResponseCreate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Create a new canned response.
    
    Shortcuts must be unique within the tenant and start with '/'.
    """
    # Check for duplicate shortcut if provided
    if data.shortcut:
        existing = await db.execute(
            select(CannedResponse).where(
                CannedResponse.tenant_id == current.tenant_id,
                CannedResponse.shortcut == data.shortcut
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Shortcut '{data.shortcut}' already exists"
            )
    
    canned_response = CannedResponse(
        tenant_id=current.tenant_id,
        title=data.title,
        shortcut=data.shortcut,
        content=data.content,
        category=data.category,
        use_count=0,
    )
    
    db.add(canned_response)
    await db.commit()
    await db.refresh(canned_response)
    
    logger.info(f"Created canned response '{data.title}' for tenant {current.tenant_id}")
    
    return CannedResponseResponse.model_validate(canned_response)


@router.get("/search", response_model=CannedResponseList, summary="Search canned responses")
async def search_canned_responses(
    db: DbSession,
    current: AuthenticatedUser,
    q: str = Query(..., min_length=1, description="Search query"),
):
    """
    Search canned responses by shortcut, title, or content.
    
    Useful for agent quick-search functionality.
    """
    search_term = f"%{q}%"
    
    query = select(CannedResponse).where(
        CannedResponse.tenant_id == current.tenant_id,
        or_(
            CannedResponse.shortcut.ilike(search_term),
            CannedResponse.title.ilike(search_term),
            CannedResponse.content.ilike(search_term),
        )
    ).order_by(CannedResponse.use_count.desc())
    
    result = await db.execute(query)
    responses = result.scalars().all()
    
    return CannedResponseList(
        responses=[CannedResponseResponse.model_validate(r) for r in responses],
        total=len(responses)
    )


@router.get("/by-shortcut/{shortcut:path}", response_model=CannedResponseResponse, summary="Get by shortcut")
async def get_by_shortcut(
    shortcut: str,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Get a canned response by its shortcut.
    
    The shortcut should include the leading '/'.
    Example: /thanks
    """
    # Ensure shortcut starts with /
    if not shortcut.startswith("/"):
        shortcut = f"/{shortcut}"
    
    result = await db.execute(
        select(CannedResponse).where(
            CannedResponse.tenant_id == current.tenant_id,
            CannedResponse.shortcut == shortcut
        )
    )
    canned_response = result.scalar_one_or_none()
    
    if not canned_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canned response with shortcut '{shortcut}' not found"
        )
    
    return CannedResponseResponse.model_validate(canned_response)


@router.get("/{response_id}", response_model=CannedResponseResponse, summary="Get canned response")
async def get_canned_response(
    response_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """Get a specific canned response by ID."""
    result = await db.execute(
        select(CannedResponse).where(
            CannedResponse.id == response_id,
            CannedResponse.tenant_id == current.tenant_id
        )
    )
    canned_response = result.scalar_one_or_none()
    
    if not canned_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canned response not found"
        )
    
    return CannedResponseResponse.model_validate(canned_response)


@router.put("/{response_id}", response_model=CannedResponseResponse, summary="Update canned response")
async def update_canned_response(
    response_id: UUID,
    data: CannedResponseUpdate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """Update an existing canned response."""
    result = await db.execute(
        select(CannedResponse).where(
            CannedResponse.id == response_id,
            CannedResponse.tenant_id == current.tenant_id
        )
    )
    canned_response = result.scalar_one_or_none()
    
    if not canned_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canned response not found"
        )
    
    # Check for duplicate shortcut if updating
    if data.shortcut and data.shortcut != canned_response.shortcut:
        existing = await db.execute(
            select(CannedResponse).where(
                CannedResponse.tenant_id == current.tenant_id,
                CannedResponse.shortcut == data.shortcut,
                CannedResponse.id != response_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Shortcut '{data.shortcut}' already exists"
            )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(canned_response, field, value)
    
    await db.commit()
    await db.refresh(canned_response)
    
    logger.info(f"Updated canned response {response_id}")
    
    return CannedResponseResponse.model_validate(canned_response)


@router.delete("/{response_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete canned response")
async def delete_canned_response(
    response_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
):
    """Delete a canned response."""
    result = await db.execute(
        select(CannedResponse).where(
            CannedResponse.id == response_id,
            CannedResponse.tenant_id == current.tenant_id
        )
    )
    canned_response = result.scalar_one_or_none()
    
    if not canned_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canned response not found"
        )
    
    await db.delete(canned_response)
    await db.commit()
    
    logger.info(f"Deleted canned response {response_id}")


# =============================================================================
# Variable Expansion Endpoints
# =============================================================================

@router.post("/{response_id}/expand", response_model=CannedResponseExpanded, summary="Expand variables")
async def expand_canned_response(
    response_id: UUID,
    db: DbSession,
    current: AuthenticatedUser,
    conversation_id: Optional[UUID] = Query(None, description="Conversation ID for context"),
    customer_id: Optional[UUID] = Query(None, description="Customer ID for context"),
):
    """
    Expand a canned response with variable substitution.
    
    If conversation_id or customer_id is provided, automatically fills in
    customer information. Otherwise, uses placeholder text.
    
    Also increments the use_count for analytics.
    """
    # Get the canned response
    result = await db.execute(
        select(CannedResponse).where(
            CannedResponse.id == response_id,
            CannedResponse.tenant_id == current.tenant_id
        )
    )
    canned_response = result.scalar_one_or_none()
    
    if not canned_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canned response not found"
        )
    
    # Build context
    context = {
        "agent_name": current.user.name or current.user.email,
        "agent_email": current.user.email,
        "business_name": current.tenant.name,
        "business_phone": current.tenant.settings.get("phone", ""),
        "business_email": current.tenant.settings.get("email", ""),
        "current_date": datetime.now().strftime("%B %d, %Y"),
        "current_time": datetime.now().strftime("%I:%M %p"),
    }
    
    # Get customer info if available
    customer = None
    if customer_id:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.id == customer_id,
                Customer.tenant_id == current.tenant_id
            )
        )
        customer = customer_result.scalar_one_or_none()
    elif conversation_id:
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current.tenant_id
            )
        )
        conversation = conv_result.scalar_one_or_none()
        if conversation and conversation.customer_id:
            customer_result = await db.execute(
                select(Customer).where(Customer.id == conversation.customer_id)
            )
            customer = customer_result.scalar_one_or_none()
    
    if customer:
        context["customer_name"] = customer.name or "Valued Customer"
        context["customer_first_name"] = (customer.name or "").split()[0] if customer.name else "there"
        context["customer_email"] = customer.email or ""
        context["customer_phone"] = customer.phone or ""
    else:
        context["customer_name"] = "Valued Customer"
        context["customer_first_name"] = "there"
    
    if conversation_id:
        context["ticket_id"] = str(conversation_id)[:8].upper()
    
    # Extract and expand
    variables_used = extract_variables(canned_response.content)
    expanded_content = expand_variables(canned_response.content, context)
    
    # Increment use count
    canned_response.use_count += 1
    await db.commit()
    
    return CannedResponseExpanded(
        original=canned_response.content,
        expanded=expanded_content,
        variables_used=variables_used
    )


# =============================================================================
# Utility Endpoints
# =============================================================================

@router.get("/categories/list", response_model=List[str], summary="List categories")
async def list_categories(
    db: DbSession,
    current: AuthenticatedUser,
):
    """Get all unique categories used by canned responses."""
    result = await db.execute(
        select(CannedResponse.category).where(
            CannedResponse.tenant_id == current.tenant_id,
            CannedResponse.category.isnot(None)
        ).distinct()
    )
    categories = [row[0] for row in result.fetchall() if row[0]]
    return sorted(categories)