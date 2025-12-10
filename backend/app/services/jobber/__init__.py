"""
Jobber Integration Module

Provides OAuth authentication and API operations for Jobber integration.
"""

from app.services.jobber.oauth import (
    JobberOAuthService,
    JobberOAuthError,
    jobber_oauth,
)
from app.services.jobber.client import (
    JobberClient,
    JobberAPIError,
    get_jobber_client,
)
from app.services.jobber.service import (
    JobberService,
    get_jobber_service,
)

__all__ = [
    # OAuth
    "JobberOAuthService",
    "JobberOAuthError",
    "jobber_oauth",
    # Client
    "JobberClient",
    "JobberAPIError",
    "get_jobber_client",
    # Service
    "JobberService",
    "get_jobber_service",
]
