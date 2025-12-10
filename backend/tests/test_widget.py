"""Widget/Chat API Tests"""

import pytest
import uuid
from httpx import AsyncClient
from app.models.models import Tenant


class TestWidgetConfig:
    @pytest.mark.asyncio
    async def test_get_config_by_subdomain(self, client: AsyncClient, test_tenant: Tenant):
        response = await client.get(f"/api/v1/widget/{test_tenant.subdomain}/config")
        assert response.status_code == 200
        assert response.json()["tenant_id"] == str(test_tenant.id)

    @pytest.mark.asyncio
    async def test_get_config_nonexistent_tenant(self, client: AsyncClient):
        response = await client.get("/api/v1/widget/nonexistent/config")
        assert response.status_code == 404


class TestConversations:
    @pytest.mark.asyncio
    async def test_start_conversation(self, client: AsyncClient, test_tenant: Tenant):
        response = await client.post(f"/api/v1/widget/{test_tenant.subdomain}/conversations", json={})
        assert response.status_code == 200
        assert "conversation_id" in response.json()

    @pytest.mark.asyncio
    async def test_get_conversation(self, client: AsyncClient, test_tenant: Tenant):
        create_resp = await client.post(f"/api/v1/widget/{test_tenant.subdomain}/conversations", json={})
        conv_id = create_resp.json()["conversation_id"]
        response = await client.get(f"/api/v1/widget/{test_tenant.subdomain}/conversations/{conv_id}")
        assert response.status_code == 200
        assert response.json()["id"] == conv_id


class TestMessages:
    @pytest.mark.asyncio
    async def test_send_message(self, client: AsyncClient, test_tenant: Tenant):
        create_resp = await client.post(f"/api/v1/widget/{test_tenant.subdomain}/conversations", json={})
        conv_id = create_resp.json()["conversation_id"]
        response = await client.post(
            f"/api/v1/widget/{test_tenant.subdomain}/conversations/{conv_id}/messages",
            json={"content": "Hello, I need help!"}
        )
        assert response.status_code == 200
        assert response.json()["customer_message"]["content"] == "Hello, I need help!"

    @pytest.mark.asyncio
    async def test_send_empty_message(self, client: AsyncClient, test_tenant: Tenant):
        create_resp = await client.post(f"/api/v1/widget/{test_tenant.subdomain}/conversations", json={})
        conv_id = create_resp.json()["conversation_id"]
        response = await client.post(
            f"/api/v1/widget/{test_tenant.subdomain}/conversations/{conv_id}/messages",
            json={"content": ""}
        )
        assert response.status_code == 422
