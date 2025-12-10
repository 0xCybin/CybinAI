"""
Email Service - Resend Integration

Handles sending and receiving emails for customer conversations.
Uses Resend API for transactional email.

Setup required:
1. Create account at https://resend.com
2. Add API key to .env as RESEND_API_KEY
3. For production: verify your domain in Resend dashboard
"""

import logging
import re
from datetime import datetime
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import Tenant, Conversation, Message, Customer

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailServiceError(Exception):
    """Base exception for email service errors."""
    pass


class EmailService:
    """
    Email service using Resend API.
    
    Capabilities:
    - Send transactional emails (replies to customers)
    - Parse inbound emails (via webhook)
    - Thread emails properly using Message-ID and In-Reply-To headers
    """
    
    RESEND_API_URL = "https://api.resend.com"
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
        self.api_key = settings.RESEND_API_KEY
        
    @property
    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return bool(self.api_key)
    
    async def _get_tenant(self) -> Optional[Tenant]:
        """Get the tenant for this service instance."""
        result = await self.db.execute(
            select(Tenant).where(Tenant.id == self.tenant_id)
        )
        return result.scalar_one_or_none()
    
    async def _get_from_address(self, tenant: Tenant) -> str:
        """
        Get the 'from' email address for a tenant.
        
        Priority:
        1. Tenant's custom email domain (support@theirdomain.com)
        2. Tenant subdomain @ our domain (acmehvac@mail.cybinai.com)
        3. Default fallback (noreply@cybinai.com)
        """
        # Check tenant settings for custom email
        if tenant.settings and tenant.settings.get("email_from"):
            return tenant.settings["email_from"]
        
        # Use tenant subdomain
        if tenant.subdomain:
            # In production, you'd use your verified domain
            # For testing, Resend allows sending from onboarding@resend.dev
            if settings.ENVIRONMENT == "development":
                return "onboarding@resend.dev"  # Resend's test address
            return f"{tenant.subdomain}@mail.cybinai.com"
        
        return settings.EMAIL_FROM or "noreply@cybinai.com"
    
    async def _get_reply_to_address(self, tenant: Tenant, conversation_id: UUID) -> str:
        """
        Generate a reply-to address that encodes the conversation ID.
        This allows us to route inbound replies to the correct conversation.
        
        Format: reply+{conversation_id}@mail.cybinai.com
        """
        if settings.ENVIRONMENT == "development":
            # In dev, we can't receive emails, so just use a placeholder
            return f"reply+{conversation_id}@mail.cybinai.com"
        
        return f"reply+{conversation_id}@mail.cybinai.com"
    
    def _generate_message_id(self, conversation_id: UUID, message_id: UUID) -> str:
        """Generate a Message-ID header for email threading."""
        domain = "mail.cybinai.com"
        return f"<{message_id}@{domain}>"
    
    def _get_in_reply_to(self, conversation_metadata: dict) -> Optional[str]:
        """Get the In-Reply-To header from conversation metadata."""
        return conversation_metadata.get("last_email_message_id")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        conversation_id: Optional[UUID] = None,
        message_id: Optional[UUID] = None,
        in_reply_to: Optional[str] = None,
    ) -> dict:
        """
        Send an email via Resend API.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            body_text: Plain text body
            body_html: Optional HTML body
            conversation_id: Link to conversation for threading
            message_id: Our internal message ID for Message-ID header
            in_reply_to: Previous email's Message-ID for threading
            
        Returns:
            dict with 'success', 'email_id', and 'error' keys
        """
        if not self.is_configured:
            logger.warning("Email service not configured - RESEND_API_KEY missing")
            return {
                "success": False,
                "email_id": None,
                "error": "Email service not configured"
            }
        
        tenant = await self._get_tenant()
        if not tenant:
            return {
                "success": False,
                "email_id": None,
                "error": "Tenant not found"
            }
        
        from_address = await self._get_from_address(tenant)
        from_name = tenant.name or "Support"
        
        # Build headers for threading
        headers = {}
        if message_id:
            headers["Message-ID"] = self._generate_message_id(
                conversation_id or UUID("00000000-0000-0000-0000-000000000000"),
                message_id
            )
        if in_reply_to:
            headers["In-Reply-To"] = in_reply_to
            headers["References"] = in_reply_to
        
        # Build reply-to for routing responses
        reply_to = None
        if conversation_id:
            reply_to = await self._get_reply_to_address(tenant, conversation_id)
        
        # Prepare request payload
        payload = {
            "from": f"{from_name} <{from_address}>",
            "to": [to_email],
            "subject": subject,
            "text": body_text,
        }
        
        if body_html:
            payload["html"] = body_html
        
        if reply_to:
            payload["reply_to"] = reply_to
            
        if headers:
            payload["headers"] = headers
        
        # Send via Resend API
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.RESEND_API_URL}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=30.0,
                )
                
                if response.status_code in (200, 201):
                    data = response.json()
                    logger.info(f"Email sent successfully: {data.get('id')}")
                    return {
                        "success": True,
                        "email_id": data.get("id"),
                        "error": None
                    }
                else:
                    error_data = response.json()
                    error_msg = error_data.get("message", response.text)
                    logger.error(f"Resend API error: {response.status_code} - {error_msg}")
                    return {
                        "success": False,
                        "email_id": None,
                        "error": error_msg
                    }
                    
        except httpx.TimeoutException:
            logger.error("Resend API timeout")
            return {
                "success": False,
                "email_id": None,
                "error": "Email service timeout"
            }
        except Exception as e:
            logger.error(f"Email send error: {e}")
            return {
                "success": False,
                "email_id": None,
                "error": str(e)
            }
    
    async def send_conversation_reply(
        self,
        conversation: Conversation,
        message: Message,
        customer: Customer,
    ) -> dict:
        """
        Send an email reply for a conversation message.
        
        This is called when an agent (or AI) sends a message in an email conversation.
        
        Args:
            conversation: The conversation object
            message: The message to send
            customer: The customer to send to
            
        Returns:
            dict with send result
        """
        if not customer.email:
            return {
                "success": False,
                "email_id": None,
                "error": "Customer has no email address"
            }
        
        # Get subject from conversation or generate one
        subject = conversation.subject or "Your support request"
        
        # Add Re: prefix if this is a reply
        if conversation.metadata and conversation.metadata.get("email_thread_started"):
            if not subject.lower().startswith("re:"):
                subject = f"Re: {subject}"
        
        # Get in-reply-to header from conversation metadata
        in_reply_to = None
        if conversation.metadata:
            in_reply_to = conversation.metadata.get("last_email_message_id")
        
        # Format the message body
        body_text = message.content
        
        # Create simple HTML version
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <p>{message.content.replace(chr(10), '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                This email is in response to your conversation with us.
                Reply directly to this email to continue the conversation.
            </p>
        </div>
        """
        
        result = await self.send_email(
            to_email=customer.email,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            conversation_id=conversation.id,
            message_id=message.id,
            in_reply_to=in_reply_to,
        )
        
        # Update conversation metadata with email info
        if result["success"] and result["email_id"]:
            if not conversation.metadata:
                conversation.metadata = {}
            conversation.metadata["email_thread_started"] = True
            conversation.metadata["last_email_message_id"] = self._generate_message_id(
                conversation.id, message.id
            )
            conversation.metadata["last_email_sent_at"] = datetime.utcnow().isoformat()
            # Mark for commit by caller
        
        return result


class InboundEmailParser:
    """
    Parser for inbound emails from Resend webhook.
    
    Extracts the meaningful content from emails, handling:
    - Quoted reply content
    - Email signatures
    - Forwarded content
    """
    
    # Patterns to detect quoted content
    QUOTE_PATTERNS = [
        r'^>.*$',  # Lines starting with >
        r'^On .+ wrote:$',  # "On Monday, Jan 1 wrote:"
        r'^-{3,}\s*Original Message\s*-{3,}',  # --- Original Message ---
        r'^From:\s+.+$',  # From: header in quoted email
        r'_{10,}',  # Long underscore lines
    ]
    
    # Patterns to detect signatures
    SIGNATURE_PATTERNS = [
        r'^--\s*$',  # Standard signature delimiter
        r'^Sent from my (iPhone|iPad|Android|Galaxy)',
        r'^Get Outlook for',
        r'^Best regards,?$',
        r'^Thanks,?$',
        r'^Regards,?$',
        r'^Cheers,?$',
    ]
    
    @classmethod
    def extract_reply_content(cls, body: str) -> str:
        """
        Extract only the new content from an email reply.
        
        Strips quoted content, signatures, and other noise.
        """
        if not body:
            return ""
        
        lines = body.split('\n')
        content_lines = []
        
        for line in lines:
            # Check if we've hit a quote or signature
            is_quote = any(re.match(pattern, line.strip(), re.IGNORECASE) 
                         for pattern in cls.QUOTE_PATTERNS)
            is_signature = any(re.match(pattern, line.strip(), re.IGNORECASE) 
                              for pattern in cls.SIGNATURE_PATTERNS)
            
            if is_quote or is_signature:
                # Stop processing - everything after is quoted/signature
                break
            
            content_lines.append(line)
        
        # Clean up
        content = '\n'.join(content_lines).strip()
        
        # Remove excessive whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        return content
    
    @classmethod
    def extract_conversation_id(cls, email_address: str) -> Optional[UUID]:
        """
        Extract conversation ID from reply-to address.
        
        Format: reply+{uuid}@domain.com
        """
        match = re.search(r'reply\+([a-f0-9-]{36})@', email_address.lower())
        if match:
            try:
                return UUID(match.group(1))
            except ValueError:
                pass
        return None


async def get_email_service(db: AsyncSession, tenant_id: UUID) -> EmailService:
    """Factory function to get email service for a tenant."""
    return EmailService(db, tenant_id)