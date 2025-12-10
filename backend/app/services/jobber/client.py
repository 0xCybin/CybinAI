"""
Jobber GraphQL Client

Handles all GraphQL operations against Jobber's API.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Integration
from app.services.jobber.oauth import jobber_oauth, JobberOAuthError

logger = logging.getLogger(__name__)


class JobberAPIError(Exception):
    """Custom exception for Jobber API errors."""
    def __init__(self, message: str, errors: list = None):
        super().__init__(message)
        self.errors = errors or []


class JobberClient:
    """GraphQL client for Jobber API operations."""
    
    API_URL = "https://api.getjobber.com/api/graphql"
    API_VERSION = "2023-11-15"
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
        self._integration: Optional[Integration] = None
        self._access_token: Optional[str] = None
    
    async def _get_integration(self) -> Integration:
        """Get the Jobber integration for this tenant."""
        if self._integration:
            return self._integration
        
        result = await self.db.execute(
            select(Integration).where(
                Integration.tenant_id == self.tenant_id,
                Integration.type == "jobber",
                Integration.is_active == True,
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise JobberAPIError("Jobber integration not connected for this tenant")
        
        self._integration = integration
        return integration
    
    async def _get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary."""
        if self._access_token:
            return self._access_token
        
        integration = await self._get_integration()
        credentials = integration.credentials or {}
        
        access_token = credentials.get("access_token")
        expires_at_str = credentials.get("expires_at")
        
        if not access_token:
            raise JobberAPIError("No access token available")
        
        # Check if token is expired or about to expire (5 min buffer)
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            buffer = datetime.now(timezone.utc)
            if expires_at <= buffer:
                logger.info(f"Jobber token expired, refreshing for tenant {self.tenant_id}")
                access_token = await jobber_oauth.refresh_access_token(integration, self.db)
        
        self._access_token = access_token
        return access_token
    
    async def _execute_query(
        self,
        query: str,
        variables: Optional[dict] = None,
    ) -> dict:
        """Execute a GraphQL query against Jobber's API."""
        access_token = await self._get_access_token()
        
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-JOBBER-GRAPHQL-VERSION": self.API_VERSION,
                },
            )
            
            if response.status_code == 401:
                # Token might be invalid, try refreshing
                logger.warning("Got 401 from Jobber, attempting token refresh")
                integration = await self._get_integration()
                self._access_token = await jobber_oauth.refresh_access_token(integration, self.db)
                
                # Retry the request
                response = await client.post(
                    self.API_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self._access_token}",
                        "Content-Type": "application/json",
                        "X-JOBBER-GRAPHQL-VERSION": self.API_VERSION,
                    },
                )
            
            if response.status_code != 200:
                raise JobberAPIError(f"Jobber API error: {response.status_code} - {response.text}")
            
            data = response.json()
            
            # Check for GraphQL errors
            if "errors" in data:
                errors = data["errors"]
                error_messages = [e.get("message", "Unknown error") for e in errors]
                raise JobberAPIError(f"GraphQL errors: {', '.join(error_messages)}", errors)
            
            return data.get("data", {})
    
    # =========================================================================
    # Client (Customer) Operations
    # =========================================================================
    
    async def create_client(
        self,
        first_name: str,
        last_name: str,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        company_name: Optional[str] = None,
        street_address: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        zip_code: Optional[str] = None,
    ) -> dict:
        """Create a new client in Jobber."""
        phones_input = []
        if phone:
            phones_input.append({
                "number": phone,
                "description": "MAIN",
                "primary": True,
            })
        
        emails_input = []
        if email:
            emails_input.append({
                "address": email,
                "description": "MAIN",
                "primary": True,
            })
        
        billing_address = None
        if any([street_address, city, state, zip_code]):
            billing_address = {}
            if street_address:
                billing_address["street1"] = street_address
            if city:
                billing_address["city"] = city
            if state:
                billing_address["province"] = state
            if zip_code:
                billing_address["postalCode"] = zip_code
            billing_address["country"] = "US"
        
        mutation = """
        mutation CreateClient($input: ClientCreateInput!) {
            clientCreate(input: $input) {
                client {
                    id
                    firstName
                    lastName
                    name
                    companyName
                    phones {
                        number
                    }
                    emails {
                        address
                    }
                }
                userErrors {
                    message
                    path
                }
            }
        }
        """
        
        variables = {
            "input": {
                "firstName": first_name,
                "lastName": last_name,
            }
        }
        
        if company_name:
            variables["input"]["companyName"] = company_name
        if phones_input:
            variables["input"]["phones"] = phones_input
        if emails_input:
            variables["input"]["emails"] = emails_input
        if billing_address:
            variables["input"]["billingAddress"] = billing_address
        
        data = await self._execute_query(mutation, variables)
        result = data.get("clientCreate", {})
        
        user_errors = result.get("userErrors", [])
        if user_errors:
            error_messages = [e.get("message", "Unknown error") for e in user_errors]
            raise JobberAPIError(f"Failed to create client: {', '.join(error_messages)}")
        
        client = result.get("client")
        if not client:
            raise JobberAPIError("No client returned from creation")
        
        logger.info(f"Created Jobber client {client['id']} for tenant {self.tenant_id}")
        return client
    
    async def find_client_by_phone(self, phone: str) -> Optional[dict]:
        """Search for a client by phone number."""
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        query = """
        query FindClient($searchTerm: String!) {
            clients(searchTerm: $searchTerm, first: 5) {
                nodes {
                    id
                    firstName
                    lastName
                    name
                    companyName
                    phones {
                        number
                    }
                    emails {
                        address
                    }
                }
            }
        }
        """
        
        data = await self._execute_query(query, {"searchTerm": clean_phone})
        clients = data.get("clients", {}).get("nodes", [])
        
        if clients:
            return clients[0]
        return None
    
    async def find_client_by_name(self, name: str) -> Optional[dict]:
        """Search for a client by name."""
        query = """
        query FindClient($searchTerm: String!) {
            clients(searchTerm: $searchTerm, first: 5) {
                nodes {
                    id
                    firstName
                    lastName
                    name
                    companyName
                    phones {
                        number
                    }
                    emails {
                        address
                    }
                }
            }
        }
        """
        
        data = await self._execute_query(query, {"searchTerm": name})
        clients = data.get("clients", {}).get("nodes", [])
        
        if clients:
            return clients[0]
        return None
    
    # =========================================================================
    # Request (Service Request) Operations
    # =========================================================================
    
    async def create_request(
        self,
        client_id: str,
        title: str,
        details: Optional[str] = None,
    ) -> dict:
        """Create a service/work request in Jobber."""
        mutation = """
        mutation CreateRequest($input: RequestCreateInput!) {
            requestCreate(input: $input) {
                request {
                    id
                    title
                    client {
                        id
                        name
                    }
                    jobberWebUri
                }
                userErrors {
                    message
                    path
                }
            }
        }
        """

        # Combine title and details into one title string
        full_title = title
        if details:
            full_title = f"{title} | {details[:200]}"

        variables = {
            "input": {
                "clientId": client_id,
                "title": full_title,
            }
        }

        data = await self._execute_query(mutation, variables)
        result = data.get("requestCreate", {})

        user_errors = result.get("userErrors", [])
        if user_errors:
            error_messages = [e.get("message", "Unknown error") for e in user_errors]
            raise JobberAPIError(f"Failed to create request: {', '.join(error_messages)}")

        request = result.get("request")
        if not request:
            raise JobberAPIError("No request returned from creation")

        logger.info(f"Created Jobber request {request['id']} for tenant {self.tenant_id}")
        return request
    
    # =========================================================================
    # Job Operations
    # =========================================================================
    
    async def get_jobs_for_client(
        self,
        client_id: str,
        limit: int = 5,
    ) -> list[dict]:
        """Get recent jobs for a client."""
        query = """
        query GetClientJobs($clientId: EncodedId!, $limit: Int!) {
            client(id: $clientId) {
                jobs(first: $limit) {
                    nodes {
                        id
                        jobNumber
                        title
                        jobStatus
                        startAt
                        endAt
                        visits(first: 3) {
                            nodes {
                                id
                                title
                                startAt
                                endAt
                                status
                            }
                        }
                    }
                }
            }
        }
        """
        
        data = await self._execute_query(query, {"clientId": client_id, "limit": limit})
        client = data.get("client", {})
        jobs = client.get("jobs", {}).get("nodes", [])
        return jobs
    
    async def find_job_by_number(self, job_number: str) -> Optional[dict]:
        """Find a job by its job number."""
        query = """
        query FindJob($jobNumber: String!) {
            jobs(filter: { jobNumber: $jobNumber }, first: 1) {
                nodes {
                    id
                    jobNumber
                    title
                    jobStatus
                    startAt
                    endAt
                    client {
                        id
                        name
                        phones {
                            number
                        }
                    }
                    visits(first: 5) {
                        nodes {
                            id
                            title
                            startAt
                            endAt
                            status
                        }
                    }
                }
            }
        }
        """
        
        data = await self._execute_query(query, {"jobNumber": job_number})
        jobs = data.get("jobs", {}).get("nodes", [])
        
        if jobs:
            return jobs[0]
        return None
    
    # =========================================================================
    # Utility Methods
    # =========================================================================
    
    async def test_connection(self) -> dict:
        """Test the Jobber connection by fetching account info."""
        query = """
        query TestConnection {
            account {
                id
                name
            }
        }
        """
        
        data = await self._execute_query(query)
        return data.get("account", {})


async def get_jobber_client(db: AsyncSession, tenant_id: UUID) -> JobberClient:
    """Factory function to get a Jobber client for a tenant."""
    return JobberClient(db, tenant_id)