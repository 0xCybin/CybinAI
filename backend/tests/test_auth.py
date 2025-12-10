"""Authentication API Tests"""

import pytest
from httpx import AsyncClient
from app.models.models import Tenant, User


class TestRegistration:
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "email": "newowner@newbusiness.com",
            "password": "SecurePassword123!",
            "name": "New Owner",
            "business_name": "New Business LLC",
            "subdomain": "newbusiness",
        })
        assert response.status_code == 201
        assert "tokens" in response.json()

    @pytest.mark.asyncio
    async def test_register_duplicate_subdomain(self, client: AsyncClient, test_tenant: Tenant):
        response = await client.post("/api/v1/auth/register", json={
            "email": "another@owner.com",
            "password": "SecurePassword123!",
            "name": "Another Owner",
            "business_name": "Another Business",
            "subdomain": test_tenant.subdomain,
        })
        assert response.status_code == 400


class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user: User, test_tenant: Tenant):
        response = await client.post("/api/v1/auth/login", json={
            "email": test_user.email,
            "password": "TestPassword123!",
            "tenant_subdomain": test_tenant.subdomain,
        })
        assert response.status_code == 200
        assert "tokens" in response.json()

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user: User, test_tenant: Tenant):
        response = await client.post("/api/v1/auth/login", json={
            "email": test_user.email,
            "password": "WrongPassword123!",
            "tenant_subdomain": test_tenant.subdomain,
        })
        assert response.status_code == 401


class TestTokens:
    @pytest.mark.asyncio
    async def test_access_protected_route(self, client: AsyncClient, auth_headers: dict):
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert "user" in response.json()

    @pytest.mark.asyncio
    async def test_access_protected_route_no_token(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
