import base64
import hashlib
import hmac
import secrets
from datetime import timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import Depends, Header, HTTPException, Request, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import AuthSession, User, now

_hasher = PasswordHasher()
_two_factor_signer = URLSafeTimedSerializer(settings.secret_key, salt="2fa")

# Matches libsodium's crypto_pwhash_OPSLIMIT_MODERATE / MEMLIMIT_MODERATE,
# which the client uses by default.
DEFAULT_OPS_LIMIT = 3
DEFAULT_MEM_LIMIT = 268435456


def hash_secret(value: str) -> str:
    return _hasher.hash(value)


def verify_secret(stored_hash: str, value: str) -> bool:
    try:
        return _hasher.verify(stored_hash, value)
    except (VerificationError, InvalidHashError):
        return False


def decoy_bytes(email: str, purpose: str, length: int) -> str:
    """Deterministic, unguessable bytes for an unknown email.

    Returned in place of real key material so that the API does not reveal
    whether an account exists for a given email address.
    """
    out = b""
    counter = 0
    while len(out) < length:
        out += hmac.new(
            settings.secret_key.encode(),
            f"{purpose}:{counter}:{email}".encode(),
            hashlib.sha256,
        ).digest()
        counter += 1
    return base64.b64encode(out[:length]).decode()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User, request: Request) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=_token_hash(token),
            user_agent=(request.headers.get("user-agent") or "")[:512],
            ip=(request.client.host if request.client else "")[:64],
        )
    )
    db.commit()
    return token


def two_factor_challenge(user: User) -> str:
    return _two_factor_signer.dumps({"uid": user.id})


def resolve_two_factor_challenge(challenge: str) -> int:
    try:
        data = _two_factor_signer.loads(challenge, max_age=600)
    except SignatureExpired:
        raise HTTPException(status.HTTP_410_GONE, "Two-factor session expired")
    except BadSignature:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
    return int(data["uid"])


def current_session(
    x_auth_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AuthSession:
    if not x_auth_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    session = db.scalar(
        select(AuthSession).where(AuthSession.token_hash == _token_hash(x_auth_token))
    )
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    last_used = session.last_used_at
    if last_used.tzinfo is None:
        last_used = last_used.replace(tzinfo=timezone.utc)
    if now() - last_used > timedelta(days=settings.session_ttl_days):
        db.delete(session)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    # Avoid a write on every request.
    if now() - last_used > timedelta(minutes=5):
        session.last_used_at = now()
        db.commit()
    return session


def current_user(session: AuthSession = Depends(current_session)) -> User:
    return session.user

