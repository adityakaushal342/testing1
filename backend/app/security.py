"""Password hashing, JWT access tokens, and opaque token helpers."""
import datetime
import hashlib
import secrets
from typing import Optional

import bcrypt
import jwt

from .config import settings

# bcrypt has a 72-byte input limit; we enforce a max password length in schemas.


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _now() -> datetime.datetime:
    return datetime.datetime.now(tz=datetime.timezone.utc)


def create_access_token(user_id: str, role: str) -> str:
    now = _now()
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MIN),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload


def new_raw_token() -> str:
    """Cryptographically-strong opaque token (used for email links and refresh tokens)."""
    return secrets.token_urlsafe(32)


def hash_token(raw: str) -> str:
    """Only the SHA-256 hash of email/refresh tokens is ever stored in the DB."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
