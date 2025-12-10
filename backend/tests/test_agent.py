"""Agent Dashboard API Tests"""

import pytest
import uuid
from httpx import AsyncClient
from app.models.models import Tenant


class TestAgentConversationList:
    @pytest.mark.asyncio
    async def test_list_conversations(self, client: AsyncClient, auth_headers: dict):
        response = await client.get("/api/v1/conversations", headers=auth_headers)
        assert response.status_code == 200
        assert "items" in response.json()

    @pytest.mark.asyncio
    async def test_list_conversations_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/conversations")
        assert response.status_code == 401


class TestAgentActions:
    @pytest.mark.asyncio
    async def test_take_over_conversation(self, client: AsyncClient, auth_headers: dict, test_tenant: Tenant):
        create_resp = await client.post(f"/api/v1/widget/{test_tenant.subdomain}/conversations", json={})
        conv_id = create_resp.json()["conversation_id"]
        response = await client.post(f"/api/v1/conversations/{conv_id}/take-over", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["ai_handled"] is False

    @pytest.mark.asyncio
    async def test_send_agent_message(self, client: AsyncClient, auth_headers: dict, test_tenant: Tenant):
        create_resp = await client.post(f"/api/v1/widget/{test_tenant.subdomain}/conversations", json={})
        conv_id = create_resp.json()["conversation_id"]
        await client.post(f"/api/v1/conversations/{conv_id}/take-over", headers=auth_headers)
        response = await client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            headers=auth_headers,
            json={"content": "Hi! I am a human agent."}
        )
        assert response.status_code == 200
        assert response.json()["sender_type"] == "agent"
