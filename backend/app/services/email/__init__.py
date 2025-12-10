"""Email Service Module - Handles sending and receiving emails via Resend."""

from app.services.email.service import EmailService, get_email_service

__all__ = ["EmailService", "get_email_service"]