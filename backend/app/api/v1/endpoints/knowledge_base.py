"""
Knowledge Base Endpoints
Manages FAQ articles and AI training content.
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.core.deps import get_db, get_current_user
from app.models.models import KBArticle, User
from app.schemas.knowledge_base import (
    KBArticleCreate,
    KBArticleUpdate,
    KBArticleResponse,
    KBArticleListResponse,
    KBSearchRequest,
    KBSearchResponse,
    KBSearchResult,
    KBCategoryListResponse,
)

router = APIRouter()


@router.get("/articles", response_model=KBArticleListResponse)
async def list_articles(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search articles by title/content"),
    published: Optional[bool] = Query(None, description="Filter by published status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List knowledge base articles for the current tenant.
    Supports filtering by category, search term, and published status.
    """
    # Base query filtered by tenant
    query = select(KBArticle).where(KBArticle.tenant_id == current_user.tenant_id)
    count_query = select(func.count(KBArticle.id)).where(KBArticle.tenant_id == current_user.tenant_id)

    # Apply filters
    if category:
        query = query.where(KBArticle.category == category)
        count_query = count_query.where(KBArticle.category == category)

    if published is not None:
        query = query.where(KBArticle.published == published)
        count_query = count_query.where(KBArticle.published == published)

    if search:
        search_filter = or_(
            KBArticle.title.ilike(f"%{search}%"),
            KBArticle.content.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(KBArticle.updated_at.desc()).offset(offset).limit(limit)

    # Execute query
    result = await db.execute(query)
    articles = result.scalars().all()

    return KBArticleListResponse(
        articles=[KBArticleResponse.model_validate(a) for a in articles],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/articles/{article_id}", response_model=KBArticleResponse)
async def get_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific knowledge base article by ID.
    """
    result = await db.execute(
        select(KBArticle).where(
            and_(
                KBArticle.id == article_id,
                KBArticle.tenant_id == current_user.tenant_id,
            )
        )
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    return KBArticleResponse.model_validate(article)


@router.post("/articles", response_model=KBArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    article_in: KBArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new knowledge base article.
    """
    article = KBArticle(
        tenant_id=current_user.tenant_id,
        title=article_in.title,
        content=article_in.content,
        category=article_in.category,
        tags=article_in.tags or [],
        published=article_in.published if article_in.published is not None else True,
        metadata_=article_in.metadata or {},
    )

    db.add(article)
    await db.commit()
    await db.refresh(article)

    return KBArticleResponse.model_validate(article)


@router.patch("/articles/{article_id}", response_model=KBArticleResponse)
async def update_article(
    article_id: UUID,
    article_in: KBArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a knowledge base article.
    """
    result = await db.execute(
        select(KBArticle).where(
            and_(
                KBArticle.id == article_id,
                KBArticle.tenant_id == current_user.tenant_id,
            )
        )
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    # Update fields if provided
    update_data = article_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "metadata":
            setattr(article, "metadata_", value)
        else:
            setattr(article, field, value)

    await db.commit()
    await db.refresh(article)

    return KBArticleResponse.model_validate(article)


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a knowledge base article.
    """
    result = await db.execute(
        select(KBArticle).where(
            and_(
                KBArticle.id == article_id,
                KBArticle.tenant_id == current_user.tenant_id,
            )
        )
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    await db.delete(article)
    await db.commit()

    return None


@router.get("/categories", response_model=KBCategoryListResponse)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all unique article categories for the current tenant.
    """
    result = await db.execute(
        select(KBArticle.category)
        .where(
            and_(
                KBArticle.tenant_id == current_user.tenant_id,
                KBArticle.category.isnot(None),
            )
        )
        .distinct()
        .order_by(KBArticle.category)
    )
    categories = [row[0] for row in result.all() if row[0]]

    # Include default categories if none exist
    if not categories:
        categories = ["General", "Services", "Pricing", "Hours & Location", "Policies"]

    return KBCategoryListResponse(categories=categories)


@router.post("/search", response_model=KBSearchResponse)
async def search_articles(
    search_request: KBSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search across knowledge base articles.
    Used by AI to find relevant context for customer questions.
    
    Currently uses simple text search. 
    TODO: Implement vector similarity search with embeddings.
    """
    query = search_request.query.strip()
    if not query:
        return KBSearchResponse(results=[], query=query)

    # Search in title, content, and tags
    # Only search published articles
    search_filter = and_(
        KBArticle.tenant_id == current_user.tenant_id,
        KBArticle.published == True,
        or_(
            KBArticle.title.ilike(f"%{query}%"),
            KBArticle.content.ilike(f"%{query}%"),
        ),
    )

    result = await db.execute(
        select(KBArticle)
        .where(search_filter)
        .order_by(KBArticle.updated_at.desc())
        .limit(search_request.limit)
    )
    articles = result.scalars().all()

    # Calculate simple relevance score based on matches
    results = []
    query_lower = query.lower()
    for article in articles:
        # Simple scoring: title match = 2, content match = 1
        score = 0.0
        if query_lower in article.title.lower():
            score += 2.0
        if query_lower in article.content.lower():
            score += 1.0
        # Normalize to 0-1 range
        score = min(score / 3.0, 1.0)

        results.append(
            KBSearchResult(
                id=article.id,
                title=article.title,
                content=article.content,
                category=article.category,
                score=score,
            )
        )

    # Sort by score descending
    results.sort(key=lambda x: x.score, reverse=True)

    return KBSearchResponse(results=results, query=query)