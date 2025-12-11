"""
WebSocket Manager using Socket.IO

Handles real-time communication for:
- Agent Dashboard: New messages, new conversations, status updates
- Future: Customer typing indicators, presence

Architecture:
- Each tenant gets their own "room" for isolation
- Agents join their tenant's room on connect
- Events are broadcast to all agents in the tenant's room
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
    
    Agents connect with their tenant_id to join the appropriate room.
    Auth dict should contain: { "tenant_id": "uuid-here", "user_id": "uuid-here" }
    """
    logger.info(f"WebSocket connect attempt: sid={sid}")
    
    if not auth:
        logger.warning(f"Connection rejected - no auth provided: sid={sid}")
        return False  # Reject connection
    
    tenant_id = auth.get("tenant_id")
    user_id = auth.get("user_id")
    
    if not tenant_id:
        logger.warning(f"Connection rejected - no tenant_id: sid={sid}")
        return False
    
    # Store user info in session
    await sio.save_session(sid, {
        "tenant_id": tenant_id,
        "user_id": user_id,
    })
    
    # Join tenant's room
    room = f"tenant:{tenant_id}"
    await sio.enter_room(sid, room)
    
    logger.info(f"WebSocket connected: sid={sid}, tenant={tenant_id}, user={user_id}")
    
    # Notify the client they're connected
    await sio.emit("connected", {"status": "ok", "room": room}, to=sid)
    
    return True  # Accept connection


@sio.event
async def disconnect(sid: str):
    """Handle WebSocket disconnection."""
    session = await sio.get_session(sid)
    tenant_id = session.get("tenant_id") if session else "unknown"
    logger.info(f"WebSocket disconnected: sid={sid}, tenant={tenant_id}")


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
    Agents viewing this conversation will see the message appear.
    """
    room = f"tenant:{tenant_id}"
    logger.info(f"Emitting new_message to room {room}, conversation={conversation_id}")
    await sio.emit(
        "new_message",
        {
            "conversation_id": str(conversation_id),
            "message": message_data,
        },
        room=room,
    )


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
    Emit typing indicator (future feature).
    Shows when customer is typing.
    """
    room = f"tenant:{tenant_id}"
    await sio.emit(
        "typing",
        {
            "conversation_id": str(conversation_id),
            "sender_type": sender_type,
            "is_typing": is_typing,
        },
        room=room,
    )


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
        sio.enter_room(sid, room)
        logger.info(f"Agent {sid} joined conversation room: {room}")


@sio.event
async def leave_conversation(sid: str, data: dict):
    """Agent leaves a conversation room."""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        room = f"conversation:{conversation_id}"
        sio.leave_room(sid, room)
        logger.info(f"Agent {sid} left conversation room: {room}")


@sio.event
async def ping(sid: str, data: dict):
    """Simple ping/pong for connection health check."""
    await sio.emit("pong", {"timestamp": data.get("timestamp")}, to=sid)