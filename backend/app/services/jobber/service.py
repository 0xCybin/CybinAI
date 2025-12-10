"""
Jobber Service - High-level business operations

This service provides the business logic layer for Jobber integration,
implementing the AI function calls like schedule_appointment, etc.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.jobber.client import JobberClient, JobberAPIError, get_jobber_client
from app.schemas.jobber import (
    ScheduleAppointmentParams,
    CheckAppointmentStatusParams,
    CreateCallbackRequestParams,
    JobberActionResult,
)

logger = logging.getLogger(__name__)


class JobberService:
    """
    High-level service for Jobber operations.
    
    Implements the AI tool call methods:
    - schedule_appointment
    - check_appointment_status
    - create_callback_request
    """
    
    def __init__(self, client: JobberClient):
        self.client = client
    
    async def schedule_appointment(
        self, params: ScheduleAppointmentParams
    ) -> JobberActionResult:
        """
        Schedule an appointment in Jobber.
        
        This will:
        1. Find or create a client in Jobber
        2. Create a work request with the service details
        
        Args:
            params: ScheduleAppointmentParams with customer info and service details
            
        Returns:
            JobberActionResult with success status and data
        """
        logger.info(f"Scheduling appointment for {params.customer_name}")
        
        try:
            # Step 1: Find or create the client
            client_data = await self._find_or_create_client(
                name=params.customer_name,
                phone=params.customer_phone,
                email=params.customer_email,
            )
            
            client_id = client_data["id"]
            
            # Step 2: Create work request
            request_title = f"{params.service_type}"
            if params.preferred_date:
                request_title += f" - {params.preferred_date}"
            
            details_parts = []
            if params.notes:
                details_parts.append(f"Issue: {params.notes}")
            if params.preferred_date:
                details_parts.append(f"Preferred Date: {params.preferred_date}")
            if params.preferred_time:
                details_parts.append(f"Preferred Time: {params.preferred_time}")
            if params.address:
                details_parts.append(f"Address: {params.address}")
            
            details_text = "\n".join(details_parts) if details_parts else "Service request via AI chat"
            
            request_data = await self.client.create_request(
                client_id=client_id,
                title=request_title,
                details=details_text,
            )
            
            logger.info(
                f"Appointment scheduled: client={client_id}, "
                f"request={request_data['id']}"
            )
            
            return JobberActionResult(
                success=True,
                message=(
                    f"Appointment scheduled for {params.customer_name}. "
                    f"Service: {params.service_type}. "
                    "You will receive a confirmation shortly."
                ),
                data={
                    "client_id": client_id,
                    "client_name": client_data.get("name"),
                    "request_id": request_data["id"],
                    "request_title": request_data.get("title"),
                    "service_type": params.service_type,
                    "preferred_date": params.preferred_date,
                    "preferred_time": params.preferred_time,
                },
                jobber_id=request_data["id"]
            )
            
        except JobberAPIError as e:
            logger.error(f"Jobber API error scheduling appointment: {e}")
            return JobberActionResult(
                success=False,
                message="Had trouble creating the appointment in our system. Let me connect you with someone who can help.",
                error=str(e)
            )
        except Exception as e:
            logger.error(f"Error scheduling appointment: {e}")
            return JobberActionResult(
                success=False,
                message="An error occurred while scheduling. Please try again.",
                error=str(e)
            )
    
    async def check_appointment_status(
        self, params: CheckAppointmentStatusParams
    ) -> JobberActionResult:
        """
        Check appointment status for a customer.
        
        Looks up the customer by phone and retrieves their recent jobs/requests.
        
        Args:
            params: CheckAppointmentStatusParams with lookup info
            
        Returns:
            JobberActionResult with appointment data
        """
        logger.info(f"Checking appointment status for phone: {params.customer_phone}")
        
        try:
            # Find the client by phone number
            client = await self.client.find_client_by_phone(params.customer_phone)
            
            if not client:
                # Try by name if provided
                if params.customer_name:
                    client = await self.client.find_client_by_name(params.customer_name)
            
            if not client:
                return JobberActionResult(
                    success=True,
                    message="No appointments found for that phone number. Would you like to schedule a new appointment?",
                    data={"appointments": []}
                )
            
            # Get their jobs
            jobs = await self.client.get_jobs_for_client(client["id"], limit=5)
            
            if not jobs:
                return JobberActionResult(
                    success=True,
                    message="No upcoming appointments found. Would you like to schedule a service?",
                    data={"appointments": [], "client_id": client["id"]}
                )
            
            # Format for response
            appointments = []
            for job in jobs:
                # Get the next visit if available
                visits = job.get("visits", {}).get("nodes", [])
                next_visit = visits[0] if visits else None
                
                appointments.append({
                    "id": job.get("id"),
                    "job_number": job.get("jobNumber"),
                    "title": job.get("title", "Service appointment"),
                    "status": job.get("jobStatus", "scheduled"),
                    "scheduled_date": next_visit.get("startAt") if next_visit else job.get("startAt"),
                    "visit_status": next_visit.get("status") if next_visit else None,
                })
            
            return JobberActionResult(
                success=True,
                message=f"Found {len(appointments)} appointment(s).",
                data={
                    "client_id": client["id"],
                    "client_name": client.get("name"),
                    "appointments": appointments,
                }
            )
            
        except JobberAPIError as e:
            logger.error(f"Jobber API error checking status: {e}")
            return JobberActionResult(
                success=False,
                message="Could not retrieve appointment information right now.",
                error=str(e)
            )
        except Exception as e:
            logger.error(f"Error checking appointment status: {e}")
            return JobberActionResult(
                success=False,
                message="Could not retrieve appointment information.",
                error=str(e)
            )
    
    async def create_callback_request(
        self, params: CreateCallbackRequestParams
    ) -> JobberActionResult:
        """
        Create a callback request in Jobber.
        
        Creates a work request flagged as needing a callback.
        
        Args:
            params: CreateCallbackRequestParams with customer and reason
            
        Returns:
            JobberActionResult with request data
        """
        logger.info(f"Creating callback request for {params.customer_name}")
        
        try:
            # Find or create client
            client_data = await self._find_or_create_client(
                name=params.customer_name,
                phone=params.customer_phone,
            )
            
            client_id = client_data["id"]
            
            # Create callback request
            details = f"📞 CALLBACK REQUESTED\n\nReason: {params.reason}"
            if params.best_time:
                details += f"\nBest time to call: {params.best_time}"
            details += f"\nPhone: {params.customer_phone}"
            
            request_data = await self.client.create_request(
                client_id=client_id,
                title=f"Callback Request - {params.reason[:50]}",
                details=details,
            )
            
            return JobberActionResult(
                success=True,
                message=(
                    f"Callback request submitted for {params.customer_name}. "
                    "Someone will call you back during business hours."
                ),
                data={
                    "client_id": client_id,
                    "request_id": request_data["id"],
                    "reason": params.reason,
                },
                jobber_id=request_data["id"]
            )
            
        except JobberAPIError as e:
            logger.error(f"Jobber API error creating callback: {e}")
            return JobberActionResult(
                success=False,
                message="Could not create callback request right now.",
                error=str(e)
            )
        except Exception as e:
            logger.error(f"Error creating callback request: {e}")
            return JobberActionResult(
                success=False,
                message="An error occurred. Please try again.",
                error=str(e)
            )
    
    # ========================================================================
    # Private helper methods
    # ========================================================================
    
    async def _find_or_create_client(
        self,
        name: str,
        phone: str,
        email: Optional[str] = None,
    ) -> dict:
        """Find existing client or create a new one."""
        # Try to find by phone first
        existing = await self.client.find_client_by_phone(phone)
        if existing:
            logger.info(f"Found existing client: {existing['id']}")
            return existing
        
        # Create new client - parse name into first/last
        name_parts = name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        client = await self.client.create_client(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            email=email,
        )
        
        logger.info(f"Created new client: {client['id']}")
        return client


async def get_jobber_service(
    db: AsyncSession,
    tenant_id: UUID
) -> Optional[JobberService]:
    """
    Factory function to get JobberService for a tenant.
    
    Returns None if Jobber is not connected for the tenant.
    """
    try:
        # Create the client (it will validate the integration exists)
        client = await get_jobber_client(db, tenant_id)
        
        # Test that we can get a token (validates integration is active)
        # The client handles this internally, but we do a quick check
        try:
            await client._get_integration()
        except JobberAPIError:
            logger.info(f"Jobber not connected for tenant {tenant_id}")
            return None
        
        return JobberService(client=client)
        
    except Exception as e:
        logger.error(f"Error getting Jobber service: {e}")
        return None