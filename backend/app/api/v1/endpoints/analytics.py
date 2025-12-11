"""
Analytics API Endpoints
Dashboard metrics and reporting for tenant admins.
"""

from datetime import datetime, timedelta, date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select, func, and_, case, extract
from sqlalchemy.sql import text

from app.core.deps import DbSession, AuthenticatedUser
from app.models.models import Conversation, Message, ConversationStatus
from app.schemas.analytics import (
    AnalyticsDashboard,
    OverviewStats,
    ConversationVolumeData,
    DailyCount,
    StatusBreakdown,
    ChannelBreakdown,
    ResolutionBreakdown,
    HourlyActivity,
    ResponseTimeStats,
)

router = APIRouter()


@router.get("/dashboard", response_model=AnalyticsDashboard, summary="Get analytics dashboard")
async def get_analytics_dashboard(
    db: DbSession,
    current: AuthenticatedUser,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
):
    """
    Get complete analytics dashboard data for the current tenant.
    
    Includes:
    - Overview stats (totals, rates)
    - Conversation volume over time
    - Status breakdown
    - Channel breakdown
    - AI vs Human resolution rates
    - Hourly activity patterns
    - Response time metrics
    """
    tenant_id = current.tenant.id
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Base filter for tenant and date range
    base_filter = and_(
        Conversation.tenant_id == tenant_id,
        Conversation.created_at >= start_date,
    )
    
    # =========================================================================
    # Overview Stats
    # =========================================================================
    
    # Total conversations in period
    total_result = await db.execute(
        select(func.count(Conversation.id)).where(base_filter)
    )
    total_conversations = total_result.scalar() or 0
    
    # Open conversations (current, not filtered by date)
    open_result = await db.execute(
        select(func.count(Conversation.id)).where(
            and_(
                Conversation.tenant_id == tenant_id,
                Conversation.status.in_([ConversationStatus.OPEN, 'open']),
            )
        )
    )
    open_conversations = open_result.scalar() or 0
    
    # Resolved today
    resolved_today_result = await db.execute(
        select(func.count(Conversation.id)).where(
            and_(
                Conversation.tenant_id == tenant_id,
                Conversation.resolved_at >= today_start,
            )
        )
    )
    resolved_today = resolved_today_result.scalar() or 0
    
    # AI resolution rate
    ai_handled_result = await db.execute(
        select(func.count(Conversation.id)).where(
            and_(
                base_filter,
                Conversation.ai_handled == True,
                Conversation.status.in_([ConversationStatus.RESOLVED, ConversationStatus.CLOSED, 'resolved', 'closed']),
            )
        )
    )
    ai_resolved = ai_handled_result.scalar() or 0
    
    total_resolved_result = await db.execute(
        select(func.count(Conversation.id)).where(
            and_(
                base_filter,
                Conversation.status.in_([ConversationStatus.RESOLVED, ConversationStatus.CLOSED, 'resolved', 'closed']),
            )
        )
    )
    total_resolved = total_resolved_result.scalar() or 0
    
    ai_resolution_rate = (ai_resolved / total_resolved * 100) if total_resolved > 0 else 0.0
    
    # Total messages
    messages_result = await db.execute(
        select(func.count(Message.id))
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(base_filter)
    )
    total_messages = messages_result.scalar() or 0
    
    # Average first response time (for conversations that have first_response_at)
    avg_response_result = await db.execute(
        select(
            func.avg(
                extract('epoch', Conversation.first_response_at) - 
                extract('epoch', Conversation.created_at)
            )
        ).where(
            and_(
                base_filter,
                Conversation.first_response_at.isnot(None),
            )
        )
    )
    avg_response_time = avg_response_result.scalar()
    
    overview = OverviewStats(
        total_conversations=total_conversations,
        open_conversations=open_conversations,
        resolved_today=resolved_today,
        ai_resolution_rate=round(ai_resolution_rate, 1),
        avg_response_time_seconds=round(avg_response_time, 1) if avg_response_time else None,
        total_messages=total_messages,
    )
    
    # =========================================================================
    # Conversation Volume Over Time
    # =========================================================================
    
    volume_result = await db.execute(
        select(
            func.date(Conversation.created_at).label('date'),
            func.count(Conversation.id).label('count'),
        )
        .where(base_filter)
        .group_by(func.date(Conversation.created_at))
        .order_by(func.date(Conversation.created_at))
    )
    volume_rows = volume_result.all()
    
    # Fill in missing days with zero counts
    volume_data = []
    date_counts = {row.date: row.count for row in volume_rows}
    current_date = start_date.date()
    end_date = now.date()
    
    while current_date <= end_date:
        volume_data.append(DailyCount(
            date=current_date,
            count=date_counts.get(current_date, 0),
        ))
        current_date += timedelta(days=1)
    
    volume = ConversationVolumeData(
        period=f"{days}d",
        data=volume_data,
        total=total_conversations,
    )
    
    # =========================================================================
    # Status Breakdown
    # =========================================================================
    
    status_result = await db.execute(
        select(
            Conversation.status,
            func.count(Conversation.id).label('count'),
        )
        .where(Conversation.tenant_id == tenant_id)
        .group_by(Conversation.status)
    )
    status_rows = status_result.all()
    
    status_counts = {
        'open': 0, 'pending': 0, 'resolved': 0, 'closed': 0
    }
    for row in status_rows:
        status_str = row.status.value if hasattr(row.status, 'value') else str(row.status)
        if status_str in status_counts:
            status_counts[status_str] = row.count
    
    status_breakdown = StatusBreakdown(**status_counts)
    
    # =========================================================================
    # Channel Breakdown
    # =========================================================================
    
    channel_result = await db.execute(
        select(
            Conversation.channel,
            func.count(Conversation.id).label('count'),
        )
        .where(base_filter)
        .group_by(Conversation.channel)
    )
    channel_rows = channel_result.all()
    
    channel_counts = {'chat': 0, 'email': 0, 'sms': 0, 'other': 0}
    for row in channel_rows:
        channel = row.channel.lower() if row.channel else 'other'
        if channel in channel_counts:
            channel_counts[channel] = row.count
        else:
            channel_counts['other'] += row.count
    
    channel_breakdown = ChannelBreakdown(**channel_counts)
    
    # =========================================================================
    # Resolution Breakdown (AI vs Human)
    # =========================================================================
    
    human_resolved_result = await db.execute(
        select(func.count(Conversation.id)).where(
            and_(
                base_filter,
                Conversation.ai_handled == False,
                Conversation.status.in_([ConversationStatus.RESOLVED, ConversationStatus.CLOSED, 'resolved', 'closed']),
            )
        )
    )
    human_resolved = human_resolved_result.scalar() or 0
    
    resolution_breakdown = ResolutionBreakdown(
        ai_resolved=ai_resolved,
        human_resolved=human_resolved,
        ai_resolution_rate=round(ai_resolution_rate, 1),
    )
    
    # =========================================================================
    # Hourly Activity
    # =========================================================================
    
    hourly_result = await db.execute(
        select(
            extract('hour', Conversation.created_at).label('hour'),
            func.count(Conversation.id).label('count'),
        )
        .where(base_filter)
        .group_by(extract('hour', Conversation.created_at))
        .order_by(extract('hour', Conversation.created_at))
    )
    hourly_rows = hourly_result.all()
    
    hourly_counts = {int(row.hour): row.count for row in hourly_rows}
    hourly_activity = [
        HourlyActivity(hour=h, count=hourly_counts.get(h, 0))
        for h in range(24)
    ]
    
    # =========================================================================
    # Response Time Stats
    # =========================================================================
    
    # Average resolution time (created_at to resolved_at)
    avg_resolution_result = await db.execute(
        select(
            func.avg(
                extract('epoch', Conversation.resolved_at) - 
                extract('epoch', Conversation.created_at)
            )
        ).where(
            and_(
                base_filter,
                Conversation.resolved_at.isnot(None),
            )
        )
    )
    avg_resolution_time = avg_resolution_result.scalar()
    
    response_times = ResponseTimeStats(
        avg_first_response_seconds=round(avg_response_time, 1) if avg_response_time else None,
        avg_resolution_time_seconds=round(avg_resolution_time, 1) if avg_resolution_time else None,
    )
    
    # =========================================================================
    # Return Complete Dashboard
    # =========================================================================
    
    return AnalyticsDashboard(
        overview=overview,
        volume=volume,
        status_breakdown=status_breakdown,
        channel_breakdown=channel_breakdown,
        resolution_breakdown=resolution_breakdown,
        hourly_activity=hourly_activity,
        response_times=response_times,
        generated_at=now,
    )


@router.get("/overview", response_model=OverviewStats, summary="Get overview stats only")
async def get_overview_stats(
    db: DbSession,
    current: AuthenticatedUser,
    days: int = Query(30, ge=1, le=365),
):
    """
    Get just the overview stats (lighter endpoint for dashboard cards).
    """
    # Call the full dashboard and return just overview
    dashboard = await get_analytics_dashboard(db, current, days)
    return dashboard.overview