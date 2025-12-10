"""
Knowledge Base Service

Handles CRUD operations and search for KB articles.
This is where we'll add vector search later with pgvector.
"""

import logging
import re
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import KBArticle
from app.schemas.knowledge_base import (
    KBArticleCreate,
    KBArticleUpdate,
    KBArticleResponse,
    KBSearchResult,
)

logger = logging.getLogger(__name__)


class KnowledgeBaseService:
    """
    Service for managing knowledge base articles.

    Usage:
        kb_service = KnowledgeBaseService(db_session)
        articles = await kb_service.list_articles(tenant_id)
        results = await kb_service.search(tenant_id, "business hours")
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ===================
    # CRUD OPERATIONS
    # ===================

    async def create_article(
        self,
        tenant_id: UUID,
        data: KBArticleCreate,
    ) -> KBArticle:
        """Create a new KB article."""
        article = KBArticle(
            tenant_id=tenant_id,
            title=data.title,
            content=data.content,
            category=data.category,
            tags=data.tags,
            published=data.published,
        )

        self.db.add(article)
        await self.db.commit()
        await self.db.refresh(article)

        logger.info(f"Created KB article: {article.id} for tenant {tenant_id}")
        return article

    async def get_article(
        self,
        tenant_id: UUID,
        article_id: UUID,
    ) -> Optional[KBArticle]:
        """Get a single KB article by ID."""
        result = await self.db.execute(
            select(KBArticle).where(
                and_(
                    KBArticle.id == article_id,
                    KBArticle.tenant_id == tenant_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_articles(
        self,
        tenant_id: UUID,
        category: Optional[str] = None,
        published: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[KBArticle], int]:
        """
        List KB articles with optional filtering.

        Returns:
            Tuple of (articles, total_count)
        """
        # Build base query
        query = select(KBArticle).where(KBArticle.tenant_id == tenant_id)
        count_query = select(func.count(KBArticle.id)).where(KBArticle.tenant_id == tenant_id)

        # Apply filters
        if category:
            query = query.where(KBArticle.category == category)
            count_query = count_query.where(KBArticle.category == category)

        if published is not None:
            query = query.where(KBArticle.published == published)
            count_query = count_query.where(KBArticle.published == published)

        if search:
            # Simple text search (case-insensitive)
            search_term = f"%{search}%"
            search_filter = or_(
                KBArticle.title.ilike(search_term),
                KBArticle.content.ilike(search_term),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(KBArticle.updated_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        articles = list(result.scalars().all())

        return articles, total

    async def update_article(
        self,
        tenant_id: UUID,
        article_id: UUID,
        data: KBArticleUpdate,
    ) -> Optional[KBArticle]:
        """Update a KB article."""
        article = await self.get_article(tenant_id, article_id)
        if not article:
            return None

        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(article, field, value)

        await self.db.commit()
        await self.db.refresh(article)

        logger.info(f"Updated KB article: {article_id}")
        return article

    async def delete_article(
        self,
        tenant_id: UUID,
        article_id: UUID,
    ) -> bool:
        """Delete a KB article."""
        article = await self.get_article(tenant_id, article_id)
        if not article:
            return False

        await self.db.delete(article)
        await self.db.commit()

        logger.info(f"Deleted KB article: {article_id}")
        return True

    async def get_categories(self, tenant_id: UUID) -> list[str]:
        """Get all unique categories for a tenant."""
        result = await self.db.execute(
            select(KBArticle.category)
            .where(
                and_(
                    KBArticle.tenant_id == tenant_id,
                    KBArticle.category.isnot(None),
                )
            )
            .distinct()
            .order_by(KBArticle.category)
        )
        return [row[0] for row in result.fetchall() if row[0]]

    # ===================
    # SEARCH
    # ===================

    async def search(
        self,
        tenant_id: UUID,
        query: str,
        limit: int = 5,
        category: Optional[str] = None,
    ) -> list[KBSearchResult]:
        """
        Search the knowledge base for relevant articles.

        Currently uses simple text matching.
        TODO: Upgrade to vector similarity search with pgvector.

        Args:
            tenant_id: The tenant to search within
            query: The search query (customer's question)
            limit: Maximum results to return
            category: Optional category filter

        Returns:
            List of search results with relevance scores
        """
        # Normalize query
        query_lower = query.lower()
        query_words = set(re.findall(r'\w+', query_lower))

        # Build query for published articles
        db_query = select(KBArticle).where(
            and_(
                KBArticle.tenant_id == tenant_id,
                KBArticle.published == True,
            )
        )

        if category:
            db_query = db_query.where(KBArticle.category == category)

        result = await self.db.execute(db_query)
        articles = list(result.scalars().all())

        # Score and rank articles
        scored_results: list[tuple[KBArticle, float]] = []

        for article in articles:
            score = self._calculate_relevance(article, query_lower, query_words)
            if score > 0:
                scored_results.append((article, score))

        # Sort by score descending and take top results
        scored_results.sort(key=lambda x: x[1], reverse=True)
        top_results = scored_results[:limit]

        # Convert to response format - FLAT fields, not nested
        return [
            KBSearchResult(
                id=article.id,
                title=article.title,
                content=article.content,
                category=article.category,
                score=min(score, 1.0),  # Cap at 1.0
            )
            for article, score in top_results
        ]

    def _calculate_relevance(
        self,
        article: KBArticle,
        query_lower: str,
        query_words: set[str],
    ) -> float:
        """
        Calculate relevance score for an article.

        Simple scoring algorithm:
        - Exact phrase match in title: +0.5
        - Exact phrase match in content: +0.3
        - Word matches in title: +0.1 each
        - Word matches in content: +0.05 each
        - Tag matches: +0.15 each

        Returns:
            Relevance score (0.0 to 1.0+)
        """
        score = 0.0
        title_lower = article.title.lower()
        content_lower = article.content.lower()
        tags_lower = [t.lower() for t in (article.tags or [])]

        # Exact phrase matches
        if query_lower in title_lower:
            score += 0.5
        if query_lower in content_lower:
            score += 0.3

        # Word matches
        title_words = set(re.findall(r'\w+', title_lower))
        content_words = set(re.findall(r'\w+', content_lower))

        title_matches = query_words & title_words
        content_matches = query_words & content_words

        score += len(title_matches) * 0.1
        score += len(content_matches) * 0.05

        # Tag matches
        for tag in tags_lower:
            if tag in query_words or any(word in tag for word in query_words):
                score += 0.15

        return score

    # ===================
    # AI CONTEXT BUILDER
    # ===================

    async def get_context_for_query(
        self,
        tenant_id: UUID,
        customer_query: str,
        max_articles: int = 3,
        max_context_length: int = 2000,
    ) -> Optional[str]:
        """
        Get relevant KB context for an AI response.

        This is the main method called by the AI service to get
        relevant knowledge for answering customer questions.

        Args:
            tenant_id: The tenant
            customer_query: What the customer asked
            max_articles: Maximum articles to include
            max_context_length: Maximum characters of context

        Returns:
            Formatted context string, or None if no relevant articles found
        """
        results = await self.search(tenant_id, customer_query, limit=max_articles)

        if not results:
            return None

        # Build context from search results
        context_parts = []
        current_length = 0

        for result in results:
            # Only include articles with decent relevance
            if result.score < 0.1:
                continue

            article_text = f"### {result.title}\n{result.content}"

            # Check if we'd exceed length limit
            if current_length + len(article_text) > max_context_length:
                # Try to fit a truncated version
                remaining = max_context_length - current_length - 50
                if remaining > 100:
                    # Truncate content
                    truncated_content = result.content[:remaining] + "..."
                    article_text = f"### {result.title}\n{truncated_content}"
                else:
                    break

            context_parts.append(article_text)
            current_length += len(article_text)

        if not context_parts:
            return None

        return "\n\n".join(context_parts)