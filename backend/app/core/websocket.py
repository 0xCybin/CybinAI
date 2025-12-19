"""
WebSocket Manager using Socket.IO

Handles real-time communication for:
- Agent Dashboard: New messages, new conversations, status updates
- Chat Widget: Real-time agent messages to customers

Architecture:
- Each tenant gets their own "room" for isolation (agents)
- Each conversation gets its own "room" (widgets)
- Agents join their tenant's room on connect
- Widgets join their conversation's room on connect
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
    
    Two connection types supported:
    1. Agent: { "tenant_id": "uuid", "user_id": "uuid" } - joins tenant room
    2. Widget: { "conversation_id": "uuid" } - joins conversation room (no auth needed)
    """
    logger.info(f"WebSocket connect attempt: sid={sid}")
    
    if not auth:
        logger.warning(f"Connection rejected - no auth provided: sid={sid}")
        return False  # Reject connection
    
    # Check if this is a widget connection (conversation_id only, no tenant/user)
    conversation_id = auth.get("conversation_id")
    tenant_id = auth.get("tenant_id")
    user_id = auth.get("user_id")
    
    # Widget connection - just needs conversation_id
    if conversation_id and not tenant_id:
        room = f"conversation:{conversation_id}"
        await sio.enter_room(sid, room)
        await sio.save_session(sid, {
            "type": "widget",
            "conversation_id": conversation_id,
        })
        logger.info(f"Widget connected: sid={sid}, conversation={conversation_id}, room={room}")
        await sio.emit("connected", {"status": "ok", "type": "widget", "room": room}, to=sid)
        return True
    
    # Agent connection - requires tenant_id
    if not tenant_id:
        logger.warning(f"Connection rejected - no tenant_id or conversation_id: sid={sid}")
        return False
    
    # Store user info in session
    await sio.save_session(sid, {
        "type": "agent",
        "tenant_id": tenant_id,
        "user_id": user_id,
    })
    
    # Join tenant's room
    room = f"tenant:{tenant_id}"
    await sio.enter_room(sid, room)
    
    logger.info(f"Agent connected: sid={sid}, tenant={tenant_id}, user={user_id}, room={room}")
    
    # Notify the client they're connected
    await sio.emit("connected", {"status": "ok", "type": "agent", "room": room}, to=sid)
    
    return True  # Accept connection


@sio.event
async def disconnect(sid: str):
    """Handle WebSocket disconnection."""
    try:
        session = await sio.get_session(sid)
        connection_type = session.get("type", "unknown") if session else "unknown"
        
        if connection_type == "widget":
            conversation_id = session.get("conversation_id", "unknown")
            logger.info(f"Widget disconnected: sid={sid}, conversation={conversation_id}")
        else:
            tenant_id = session.get("tenant_id", "unknown")
            logger.info(f"Agent disconnected: sid={sid}, tenant={tenant_id}")
    except Exception as e:
        logger.warning(f"Error getting session on disconnect: {e}")
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
    
    Sends to BOTH:
    - Tenant room (for agents viewing dashboard)
    - Conversation room (for widget showing this conversation)
    """
    payload = {
        "conversation_id": str(conversation_id),
        "message": message_data,
    }
    
    # Emit to tenant room (agents see all tenant conversations)
    tenant_room = f"tenant:{tenant_id}"
    logger.info(f"Emitting new_message to tenant room {tenant_room}, conversation={conversation_id}")
    await sio.emit("new_message", payload, room=tenant_room)
    
    # Also emit to conversation room (widget for this specific conversation)
    conv_room = f"conversation:{conversation_id}"
    logger.info(f"Emitting new_message to conversation room {conv_room}")
    await sio.emit("new_message", payload, room=conv_room)


async def emit_conversation_updated(tenant_id: UUID, conversation_id: UUID, update_data: dict):
    """
    Emit when a conversation is updated (status, assignment, etc.)
    Agents will see the conversation update in their list.
    """
    room = f"tenant:{tenant_id}"
    logger.info(f"Emitting conversation_updated to room {room}, conversation={conversation_id}")
    await sio.emit(
        "conversation_updated",
        {
            "conversation_id": str(conversation_id),
            **update_data,
        },
        room=room,
    )


async def emit_typing_indicator(tenant_id: UUID, conversation_id: UUID, sender_type: str, is_typing: bool):
    """
    Emit typing indicator.
    Shows when customer or agent is typing.
    """
    payload = {
        "conversation_id": str(conversation_id),
        "sender_type": sender_type,
        "is_typing": is_typing,
    }
    
    # Emit to tenant room (for agents)
    tenant_room = f"tenant:{tenant_id}"
    await sio.emit("typing", payload, room=tenant_room)
    
    # Also emit to conversation room (for widget)
    conv_room = f"conversation:{conversation_id}"
    await sio.emit("typing", payload, room=conv_room)


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
        logger.info(f"Client {sid} joined conversation room: {room}")


@sio.event
async def leave_conversation(sid: str, data: dict):
    """Agent leaves a conversation room."""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        room = f"conversation:{conversation_id}"
        await sio.leave_room(sid, room)
        logger.info(f"Client {sid} left conversation room: {room}")


@sio.event
async def ping(sid: str, data: dict):
    """Simple ping/pong for connection health check."""
    await sio.emit("pong", {"timestamp": data.get("timestamp")}, to=sid)