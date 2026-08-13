from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from passlib.context import CryptContext
from config import get_settings

__settings = get_settings()
__pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str :
    """
    Hash a plain-text password.
    """
    return __pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a plain-text password against its hash.
    """
    return __pwd_context.verify(password, password_hash)


def create_access_token(user_id, role, token_version: int = 0) -> str:
    """
    Create a short-lived access token.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=__settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "ver": token_version,
        "exp": expire,
    }

    return jwt.encode(payload, __settings.jwt_secret_key, algorithm=__settings.jwt_algorithm)

def create_refresh_token(user_id, token_version: int = 0) -> str:
    """
    Create a long-lived refresh token.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        days=__settings.refresh_token_expire_days
    )

    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "ver": token_version,
        "exp": expire,
    }

    return jwt.encode(payload, __settings.jwt_secret_key, algorithm=__settings.jwt_algorithm)

def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT.

    Raises:
        jwt.ExpiredSignatureError
        jwt.InvalidTokenError
    """
    return jwt.decode(
        token,
        __settings.jwt_secret_key,
        algorithms=[__settings.jwt_algorithm],
    )

def decode_token_allow_expired(token: str) -> dict | None:
    """
    Best-effort decode used only by logout: we want to know *whose* token
    this was so we can revoke it (bump token_version) even if it already
    expired — that's the whole scenario this exists for. Still verifies the
    signature, just not the expiry. Returns None for anything unreadable.
    """
    try:
        return jwt.decode(
            token,
            __settings.jwt_secret_key,
            algorithms=[__settings.jwt_algorithm],
            options={"verify_exp": False},
        )
    except jwt.InvalidTokenError:
        return None