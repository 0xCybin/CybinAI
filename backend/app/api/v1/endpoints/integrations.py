"""
Integrations API Endpoints

Handles OAuth flows and integration management for third-party services.
Currently supports: Jobber
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, get_current_user, require_admin
from app.models.models import Integration
from app.schemas.integrations import (
    IntegrationResponse,
    IntegrationListResponse,
    IntegrationStatus,
    JobberConnectResponse,
)
from app.services.jobber import (
    jobber_oauth,
    JobberOAuthError,
    get_jobber_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations", tags=["integrations"])


# =============================================================================
# Integration Management
# =============================================================================

@router.get("", response_model=IntegrationListResponse)
async def list_integrations(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all integrations for the current tenant."""
    result = await db.execute(
        select(Integration).where(Integration.tenant_id == current_user.tenant_id)
    )
    integrations = result.scalars().all()
    
    integration_responses = []
    
    # Check for Jobber
    jobber_integration = next(
        (i for i in integrations if i.type == "jobber"),
        None
    )
    
    if jobber_integration:
        # Map is_active to status
        if jobber_integration.is_active:
            status_value = IntegrationStatus.CONNECTED
        elif jobber_integration.last_error:
            status_value = IntegrationStatus.ERROR
        else:
            status_value = IntegrationStatus.DISCONNECTED
            
        integration_responses.append(IntegrationResponse(
            id=jobber_integration.id,
            tenant_id=jobber_integration.tenant_id,
            type="jobber",
            status=status_value,
            account_name=jobber_integration.settings.get("account_name"),
            connected_at=jobber_integration.settings.get("connected_at"),
            last_sync_at=jobber_integration.last_sync_at,
            error_message=jobber_integration.last_error,
        ))
    
    return IntegrationListResponse(integrations=integration_responses)


@router.get("/{integration_type}", response_model=IntegrationResponse)
async def get_integration(
    integration_type: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get details of a specific integration."""
    result = await db.execute(
        select(Integration).where(
            Integration.tenant_id == current_user.tenant_id,
            Integration.type == integration_type,
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Integration '{integration_type}' not found",
        )
    
    # Map is_active to status
    if integration.is_active:
        status_value = IntegrationStatus.CONNECTED
    elif integration.last_error:
        status_value = IntegrationStatus.ERROR
    else:
        status_value = IntegrationStatus.DISCONNECTED
    
    return IntegrationResponse(
        id=integration.id,
        tenant_id=integration.tenant_id,
        type=integration.type,
        status=status_value,
        account_name=integration.settings.get("account_name"),
        connected_at=integration.settings.get("connected_at"),
        last_sync_at=integration.last_sync_at,
        error_message=integration.last_error,
    )


# =============================================================================
# Jobber OAuth Flow
# =============================================================================

@router.get("/jobber/connect", response_model=JobberConnectResponse)
async def initiate_jobber_connect(
    current_user: Annotated[CurrentUser, Depends(require_admin)],
):
    """
    Initiate the Jobber OAuth flow.
    Returns an authorization URL that the user should be redirected to.
    Only admins/owners can connect integrations.
    """
    try:
        authorization_url, state = jobber_oauth.generate_authorization_url(
            current_user.tenant_id
        )
        
        return JobberConnectResponse(
            authorization_url=authorization_url,
            state=state,
        )
    except Exception as e:
        logger.exception(f"Failed to initiate Jobber connect: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate Jobber connection",
        )


@router.get("/jobber/callback")
async def jobber_oauth_callback(
    code: str = Query(..., description="Authorization code from Jobber"),
    state: str = Query(..., description="State parameter for verification"),
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth callback endpoint for Jobber.
    Jobber redirects here after user authorizes the app.
    """
    try:
        result = await jobber_oauth.exchange_code_for_tokens(code, state, db)
        
        # Redirect to frontend with success message
        frontend_url = "http://localhost:3000/admin/integrations"
        return RedirectResponse(
            url=f"{frontend_url}?status=connected&provider=jobber&account={result.get('account_name', '')}",
            status_code=status.HTTP_302_FOUND,
        )
        
    except JobberOAuthError as e:
        logger.error(f"Jobber OAuth error: {e}")
        frontend_url = "http://localhost:3000/admin/integrations"
        return RedirectResponse(
            url=f"{frontend_url}?status=error&provider=jobber&message={str(e)}",
            status_code=status.HTTP_302_FOUND,
        )
    except Exception as e:
        logger.exception(f"Unexpected error in Jobber callback: {e}")
        frontend_url = "http://localhost:3000/admin/integrations"
        return RedirectResponse(
            url=f"{frontend_url}?status=error&provider=jobber&message=Connection failed",
            status_code=status.HTTP_302_FOUND,
        )


@router.post("/jobber/disconnect")
async def disconnect_jobber(
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Disconnect Jobber integration. Only admins/owners can disconnect."""
    try:
        success = await jobber_oauth.disconnect(current_user.tenant_id, db)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jobber integration not found",
            )
        
        return {"message": "Jobber disconnected successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to disconnect Jobber: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect Jobber",
        )


@router.post("/jobber/test")
async def test_jobber_connection(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Test the Jobber connection by fetching account info."""
    try:
        service = await get_jobber_service(db, current_user.tenant_id)
        
        if not await service.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Jobber is not connected",
            )
        
        from app.services.jobber import get_jobber_client
        client = await get_jobber_client(db, current_user.tenant_id)
        account_info = await client.test_connection()
        
        return {
            "status": "connected",
            "account_id": account_info.get("id"),
            "account_name": account_info.get("name"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Jobber connection test failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}",
        )