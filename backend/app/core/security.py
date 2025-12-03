"""
Security utilities: password hashing and JWT tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from uuid import UUID

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    user_id: UUID,
    tenant_id: UUID,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_EXPIRATION_MINUTES
        )
    
    to_encode = {
        "sub": str(user_id),
        "tid": str(tenant_id),
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(
    user_id: UUID,
    tenant_id: UUID,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT refresh token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.JWT_REFRESH_EXPIRATION_DAYS
        )
    
    to_encode = {
        "sub": str(user_id),
        "tid": str(tenant_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def create_token_pair(user_id: UUID, tenant_id: UUID, role: str) -> dict:
    """Create both access and refresh tokens."""
    access_token = create_access_token(user_id, tenant_id, role)
    refresh_token = create_refresh_token(user_id, tenant_id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60,
    }


class TokenPayload:
    """Parsed token payload for easier access."""
    
    def __init__(self, payload: dict):
        self.user_id = UUID(payload.get("sub", ""))
        self.tenant_id = UUID(payload.get("tid", ""))
        self.role = payload.get("role", "")
        self.token_type = payload.get("type", "")
        self.exp = payload.get("exp")
        self.iat = payload.get("iat")
    
    @classmethod
    def from_token(cls, token: str) -> Optional["TokenPayload"]:
        """Create TokenPayload from a JWT token string."""
        payload = decode_token(token)
        if payload is None:
            return None
        try:
            return cls(payload)
        except (ValueError, KeyError):
            return None
