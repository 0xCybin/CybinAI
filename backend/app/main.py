"""
CybinAI - AI-Powered Customer Service Platform
Main FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.websocket import socket_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Startup and shutdown logic goes here.
    """
    # Startup
    print(f"🚀 Starting CybinAI API in {settings.ENVIRONMENT} mode")
    print(f"🔌 WebSocket server available at /ws/socket.io")
    # TODO: Initialize database connection pool
    # TODO: Initialize Redis connection
    # TODO: Initialize AI service
    yield
    # Shutdown
    print("👋 Shutting down CybinAI API")
    # TODO: Close database connections
    # TODO: Close Redis connections


app = FastAPI(
    title="CybinAI",
    description="AI-Powered Customer Service Platform for Small Businesses",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Mount Socket.IO for WebSocket support
# This handles connections at /ws/socket.io
app.mount("/ws", socket_app)


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "websocket": "/ws/socket.io",
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "CybinAI",
        "message": "AI-Powered Customer Service Platform",
        "docs": "/docs" if settings.DEBUG else "Documentation disabled in production",
        "websocket": "/ws/socket.io",
    }