"""
Analytics Pydantic Schemas
For dashboard metrics and reporting.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# =============================================================================
# Overview Stats
# =============================================================================

class OverviewStats(BaseModel):
    """High-level stats for dashboard cards."""
    total_conversations: int = 0
    open_conversations: int = 0
    resolved_today: int = 0
    ai_resolution_rate: float = Field(0.0, description="Percentage 0-100")
    avg_response_time_seconds: Optional[float] = None
    total_messages: int = 0


# =============================================================================
# Time-Series Data
# =============================================================================

class DailyCount(BaseModel):
    """Single data point for daily counts."""
    date: date
    count: int


class ConversationVolumeData(BaseModel):
    """Conversation volume over time."""
    period: str = Field(..., description="e.g., '7d', '30d', '90d'")
    data: List[DailyCount]
    total: int


# =============================================================================
# Breakdown Stats
# =============================================================================

class StatusBreakdown(BaseModel):
    """Conversations by status."""
    open: int = 0
    pending: int = 0
    resolved: int = 0
    closed: int = 0


class ChannelBreakdown(BaseModel):
    """Conversations by channel."""
    chat: int = 0
    email: int = 0
    sms: int = 0
    other: int = 0


class ResolutionBreakdown(BaseModel):
    """AI vs Human resolution."""
    ai_resolved: int = 0
    human_resolved: int = 0
    ai_resolution_rate: float = Field(0.0, description="Percentage 0-100")


class HourlyActivity(BaseModel):
    """Activity by hour of day."""
    hour: int = Field(..., ge=0, le=23)
    count: int


# =============================================================================
# Response Time Stats
# =============================================================================

class ResponseTimeStats(BaseModel):
    """Response time metrics."""
    avg_first_response_seconds: Optional[float] = None
    avg_resolution_time_seconds: Optional[float] = None
    median_first_response_seconds: Optional[float] = None


# =============================================================================
# Full Analytics Response
# =============================================================================

class AnalyticsDashboard(BaseModel):
    """Complete analytics dashboard data."""
    overview: OverviewStats
    volume: ConversationVolumeData
    status_breakdown: StatusBreakdown
    channel_breakdown: ChannelBreakdown
    resolution_breakdown: ResolutionBreakdown
    hourly_activity: List[HourlyActivity]
    response_times: ResponseTimeStats
    generated_at: datetime