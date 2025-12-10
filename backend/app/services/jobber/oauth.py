"""
Jobber OAuth 2.0 Service

Handles the OAuth flow for connecting Jobber accounts to CybinAI tenants.
"""

import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Integration, Tenant

logger = logging.getLogger(__name__)


class JobberOAuthError(Exception):
    """Custom exception for Jobber OAuth errors."""
    pass


class JobberOAuthService:
    """
    Manages Jobber OAuth 2.0 authentication flow.
    
    Flow:
    1. Generate authorization URL with state parameter
    2. User authorizes on Jobber's site
    3. Jobber redirects back with authorization code
    4. Exchange code for access + refresh tokens
    5. Store tokens in Integration record
    """
    
    AUTHORIZE_URL = "https://api.getjobber.com/api/oauth/authorize"
    TOKEN_URL = "https://api.getjobber.com/api/oauth/token"
    API_URL = "https://api.getjobber.com/api/graphql"
    
    SCOPES = [
        "read_clients",
        "write_clients",
        "read_requests",
        "write_requests",
        "read_jobs",
        "read_account",
    ]
    
    def __init__(self):
        self.client_id = settings.JOBBER_CLIENT_ID
        self.client_secret = settings.JOBBER_CLIENT_SECRET
        self.redirect_uri = settings.JOBBER_REDIRECT_URI
        
        if not self.client_id or not self.client_secret:
            logger.warning("Jobber credentials not configured")
    
    def generate_authorization_url(self, tenant_id: UUID) -> tuple[str, str]:
        """Generate the Jobber OAuth authorization URL."""
        state = f"{tenant_id}:{secrets.token_urlsafe(32)}"
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.SCOPES),
            "state": state,
        }
        
        authorization_url = f"{self.AUTHORIZE_URL}?{urlencode(params)}"
        logger.info(f"Generated Jobber auth URL for tenant {tenant_id}")
        return authorization_url, state
    
    async def exchange_code_for_tokens(
        self,
        code: str,
        state: str,
        db: AsyncSession,
    ) -> dict:
        """Exchange authorization code for access and refresh tokens."""
        # Extract tenant_id from state
        try:
            tenant_id_str, _ = state.split(":", 1)
            tenant_id = UUID(tenant_id_str)
        except (ValueError, AttributeError) as e:
            raise JobberOAuthError(f"Invalid state parameter: {e}")
        
        # Verify tenant exists
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise JobberOAuthError(f"Tenant not found: {tenant_id}")
        
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            
            if response.status_code != 200:
                logger.error(f"Jobber token exchange failed: {response.text}")
                raise JobberOAuthError(f"Token exchange failed: {response.status_code}")
            
            token_data = response.json()
        
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        
        if not access_token or not refresh_token:
            raise JobberOAuthError("Missing tokens in response")
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Get account info from Jobber
        account_info = await self._get_account_info(access_token)
        
        # Store or update integration record
        await self._store_integration(
            db=db,
            tenant_id=tenant_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            account_info=account_info,
        )
        
        logger.info(f"Successfully connected Jobber for tenant {tenant_id}")
        
        return {
            "tenant_id": tenant_id,
            "account_id": account_info.get("id"),
            "account_name": account_info.get("name"),
            "connected": True,
        }
    
    async def refresh_access_token(
        self,
        integration: Integration,
        db: AsyncSession,
    ) -> str:
        """Refresh an expired access token."""
        credentials = integration.credentials or {}
        refresh_token = credentials.get("refresh_token")
        
        if not refresh_token:
            raise JobberOAuthError("No refresh token available")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            
            if response.status_code != 200:
                logger.error(f"Jobber token refresh failed: {response.text}")
                # Mark integration as inactive and store error
                integration.is_active = False
                integration.last_error = "Token refresh failed"
                await db.commit()
                raise JobberOAuthError("Token refresh failed")
            
            token_data = response.json()
        
        new_access_token = token_data.get("access_token")
        new_refresh_token = token_data.get("refresh_token", refresh_token)
        expires_in = token_data.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Update stored tokens
        integration.credentials = {
            **credentials,
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "expires_at": expires_at.isoformat(),
        }
        integration.is_active = True
        integration.last_error = None
        await db.commit()
        
        logger.info(f"Refreshed Jobber token for tenant {integration.tenant_id}")
        return new_access_token
    
    async def disconnect(
        self,
        tenant_id: UUID,
        db: AsyncSession,
    ) -> bool:
        """Disconnect Jobber integration for a tenant."""
        result = await db.execute(
            select(Integration).where(
                Integration.tenant_id == tenant_id,
                Integration.type == "jobber",
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            return False
        
        # Clear credentials and mark as inactive
        integration.is_active = False
        integration.credentials = {}
        integration.settings = {
            **integration.settings,
            "disconnected_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.commit()
        logger.info(f"Disconnected Jobber for tenant {tenant_id}")
        return True
    
    async def _get_account_info(self, access_token: str) -> dict:
        """Get Jobber account information."""
        query = """
        query {
            account {
                id
                name
            }
        }
        """
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.API_URL,
                json={"query": query},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-JOBBER-GRAPHQL-VERSION": "2023-11-15",
                },
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to get Jobber account info: {response.text}")
                return {}
            
            data = response.json()
            account = data.get("data", {}).get("account", {})
            return account
    
    async def _store_integration(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        access_token: str,
        refresh_token: str,
        expires_at: datetime,
        account_info: dict,
    ) -> Integration:
        """Store or update the Jobber integration record."""
        
        # Check for existing integration
        result = await db.execute(
            select(Integration).where(
                Integration.tenant_id == tenant_id,
                Integration.type == "jobber",
            )
        )
        integration = result.scalar_one_or_none()
        
        credentials = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
        }
        
        settings_data = {
            "account_id": account_info.get("id"),
            "account_name": account_info.get("name"),
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if integration:
            # Update existing
            integration.is_active = True
            integration.credentials = credentials
            integration.settings = {**integration.settings, **settings_data}
            integration.last_error = None
        else:
            # Create new
            integration = Integration(
                tenant_id=tenant_id,
                type="jobber",
                credentials=credentials,
                settings=settings_data,
                is_active=True,
            )
            db.add(integration)
        
        await db.commit()
        await db.refresh(integration)
        return integration


# Singleton instance
jobber_oauth = JobberOAuthService()