"""
WebSocket Manager using Socket.IO

Handles real-time communication for:
- Agent Dashboard: New messages, new conversations, status updates
- Chat Widget: Real-time agent messages to customers

Architecture:
- Each tenant gets their own "room" for isolation (agents)
- Each conversation gets its own room (widget clients)
- Events are broadcast to appropriate rooms
"""

import logging
from typing import Optional
from uuid import UUID

import socketio

logger = logging.getLogger(__name__)

# Create async Socket.IO server
# cors_allowed_origins handles CORS for WebSocket connections
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Add production URLs here later
    ],
    logger=False,  # Set to True for debugging
    engineio_logger=False,
)

# Create ASGI app that will be mounted to FastAPI
socket_app = socketio.ASGIApp(sio, socketio_path="/ws/socket.io")


# =============================================================================
# Connection Handlers
# =============================================================================

@sio.event
async def connect(sid: str, environ: dict, auth: Optional[dict] = None):
    """
    Handle new WebSocket connection.
    
    Two connection types:
    1. Agent Dashboard: { "tenant_id": "uuid", "user_id": "uuid" }
       - Joins tenant room to see all conversations
    2. Widget: { "conversation_id": "uuid" }
       - Joins conversation room to receive agent messages
    """
    logger.info(f"WebSocket connect attempt: sid={sid}")
    
    if not auth:
        logger.warning(f"Connection rejected - no auth provided: sid={sid}")
        return False  # Reject connection
    
    tenant_id = auth.get("tenant_id")
    user_id = auth.get("user_id")
    conversation_id = auth.get("conversation_id")
    
    # Widget connection (has conversation_id)
    if conversation_id:
        await sio.save_session(sid, {
            "type": "widget",
            "conversation_id": conversation_id,
        })
        
        # Join conversation-specific room
        room = f"conversation:{conversation_id}"
        await sio.enter_room(sid, room)
        
        logger.info(f"Widget connected: sid={sid}, conversation={conversation_id}")
        await sio.emit("connected", {"status": "ok", "room": room, "type": "widget"}, to=sid)
        return True
    
    # Agent connection (has tenant_id)
    if tenant_id:
        await sio.save_session(sid, {
            "type": "agent",
            "tenant_id": tenant_id,
            "user_id": user_id,
        })
        
        # Join tenant room
        room = f"tenant:{tenant_id}"
        await sio.enter_room(sid, room)
        
        logger.info(f"Agent connected: sid={sid}, tenant={tenant_id}, user={user_id}")
        await sio.emit("connected", {"status": "ok", "room": room, "type": "agent"}, to=sid)
        return True
    
    logger.warning(f"Connection rejected - missing tenant_id or conversation_id: sid={sid}")
    return False


@sio.event
async def disconnect(sid: str):
    """Handle WebSocket disconnection."""
    session = await sio.get_session(sid)
    if session:
        conn_type = session.get("type", "unknown")
        if conn_type == "widget":
            logger.info(f"Widget disconnected: sid={sid}, conversation={session.get('conversation_id')}")
        else:
            logger.info(f"Agent disconnected: sid={sid}, tenant={session.get('tenant_id')}")
    else:
        logger.info(f"WebSocket disconnected: sid={sid}")


# =============================================================================
# Event Emitters (called from API endpoints)
# =============================================================================

async def emit_new_conversation(tenant_id: UUID, conversation_data: dict):
    """
    Emit when a new conversation is created.
    Agents will see a new conversation appear in their inbox.
    """
    room = f"tenant:{tenant_id}"
    logger.info(f"Emitting new_conversation to room {room}")
    await sio.emit("new_conversation", conversation_data, room=room)


async def emit_new_message(tenant_id: UUID, conversation_id: UUID, message_data: dict):
    """
    Emit when a new message is added to a conversation.
    
    DUAL-ROOM EMISSION:
    1. tenant:{tenant_id} - All agents in the tenant see the message
    2. conversation:{conversation_id} - The specific widget sees the message
    
    This ensures both the agent dashboard AND the customer widget
    receive real-time updates.
    """
    tenant_room = f"tenant:{tenant_id}"
    conversation_room = f"conversation:{conversation_id}"
    
    payload = {
        "conversation_id": str(conversation_id),
        "message": message_data,
    }
    
    # Emit to tenant room (for agent dashboard)
    logger.info(f"Emitting new_message to tenant room {tenant_room}")
    await sio.emit("new_message", payload, room=tenant_room)
    
    # Emit to conversation room (for widget)
    logger.info(f"Emitting new_message to conversation room {conversation_room}")
    await sio.emit("new_message", payload, room=conversation_room)


async def emit_conversation_updated(tenant_id: UUID, conversation_id: UUID, update_data: dict):
    """
    Emit when a conversation is updated (status, assignment, etc.)
    
    DUAL-ROOM EMISSION:
    1. tenant room - Agents see conversation list updates
    2. conversation room - Widget can react to status changes
    """
    tenant_room = f"tenant:{tenant_id}"
    conversation_room = f"conversation:{conversation_id}"
    
    payload = {
        "conversation_id": str(conversation_id),
        **update_data,
    }
    
    # Emit to tenant room (for agent dashboard)
    logger.info(f"Emitting conversation_updated to tenant room {tenant_room}")
    await sio.emit("conversation_updated", payload, room=tenant_room)
    
    # Emit to conversation room (for widget - e.g., to show "agent joined")
    logger.info(f"Emitting conversation_updated to conversation room {conversation_room}")
    await sio.emit("conversation_updated", payload, room=conversation_room)


async def emit_typing_indicator(tenant_id: UUID, conversation_id: UUID, sender_type: str, is_typing: bool):
    """
    Emit typing indicator.
    Shows when customer or agent is typing.
    """
    tenant_room = f"tenant:{tenant_id}"
    conversation_room = f"conversation:{conversation_id}"
    
    payload = {
        "conversation_id": str(conversation_id),
        "sender_type": sender_type,
        "is_typing": is_typing,
    }
    
    # Emit to both rooms
    await sio.emit("typing", payload, room=tenant_room)
    await sio.emit("typing", payload, room=conversation_room)


# =============================================================================
# Client Events (received from frontend)
# =============================================================================

@sio.event
async def join_conversation(sid: str, data: dict):
    """
    Agent explicitly joins a conversation room for more targeted updates.
    (Optional - we broadcast to tenant room anyway)
    """
    conversation_id = data.get("conversation_id")
    if conversation_id:
        room = f"conversation:{conversation_id}"
        await sio.enter_room(sid, room)
        logger.info(f"Agent {sid} joined conversation room: {room}")


@sio.event
async def leave_conversation(sid: str, data: dict):
    """Agent leaves a conversation room."""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        room = f"conversation:{conversation_id}"
        await sio.leave_room(sid, room)
        logger.info(f"Agent {sid} left conversation room: {room}")


@sio.event
async def ping(sid: str, data: dict):
    """Simple ping/pong for connection health check."""
    await sio.emit("pong", {"timestamp": data.get("timestamp")}, to=sid)