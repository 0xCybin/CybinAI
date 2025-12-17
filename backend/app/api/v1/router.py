"""
API v1 Router
Combines all endpoint routers into a single router.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    tenants,
    conversations,
    customers,
    knowledge_base,
    widget,
    integrations,
    email,
    analytics,
    settings,
    users,  # NEW - User/Agent Management
)

api_router = APIRouter()

# Authentication endpoints
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# Tenant management (admin)
api_router.include_router(
    tenants.router,
    prefix="/tenants",
    tags=["Tenants"]
)

# User/Agent management (NEW)
api_router.include_router(
    users.router,
    tags=["Users"]
)

# Conversation/ticket management
api_router.include_router(
    conversations.router,
    prefix="/conversations",
    tags=["Conversations"]
)

# Customer management
api_router.include_router(
    customers.router,
    prefix="/customers",
    tags=["Customers"]
)

# Knowledge base management
api_router.include_router(
    knowledge_base.router,
    prefix="/knowledge-base",
    tags=["Knowledge Base"]
)

# Public widget endpoints (for embedded chat)
api_router.include_router(
    widget.router,
    prefix="/widget",
    tags=["Widget"]
)

# Integrations (Jobber, etc.)
api_router.include_router(
    integrations.router,
    tags=["Integrations"]
)

# Email channel endpoints
api_router.include_router(
    email.router,
    prefix="/email",
    tags=["Email"]
)

# Analytics dashboard endpoints
api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Analytics"]
)

# Admin settings endpoints
api_router.include_router(
    settings.router,
    prefix="/settings",
    tags=["Settings"]
)