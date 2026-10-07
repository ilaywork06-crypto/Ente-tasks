
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import (
    AuthResponse,
    EmailRequest,
    KeyAttributes,
    KeyDerivationParams,
    LoginRequest,
    RecoverRequest,
    RecoveryParams,
    SignupRequest,
    TwoFactorVerifyRequest,
)
from ..security import (
    DEFAULT_MEM_LIMIT,
    DEFAULT_OPS_LIMIT,
    create_session,
    decoy_bytes,
    hash_secret,
    resolve_two_factor_challenge,
    two_factor_challenge,
    verify_secret,
)
from .account import apply_new_password, verify_totp

router = APIRouter(prefix="/auth", tags=["auth"])

# Used to keep the response time for unknown emails similar to known ones.
_DUMMY_HASH = hash_secret("dummy")


def _user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def _key_attributes(user: User) -> KeyAttributes:
    return KeyAttributes.model_validate(user)


def _signed_in(db: Session, user: User, request: Request) -> AuthResponse:
    return AuthResponse(
        token=create_session(db, user, request),
        key_attributes=_key_attributes(user),
    )


@router.post("/params", response_model=KeyDerivationParams)
def key_derivation_params(body: EmailRequest, db: Session = Depends(get_db)):
    user = _user_by_email(db, body.email)
    if user is None:
        return KeyDerivationParams(
            kek_salt=decoy_bytes(body.email.lower(), "salt", 16),
            ops_limit=DEFAULT_OPS_LIMIT,
            mem_limit=DEFAULT_MEM_LIMIT,
        )
    return KeyDerivationParams.model_validate(user)


@router.post("/signup", response_model=AuthResponse, response_model_exclude_none=True)
def signup(body: SignupRequest, request: Request, db: Session = Depends(get_db)):
    email = body.email.lower()
    if _user_by_email(db, email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        email=email,
        **body.key_attributes.model_dump(),
        login_key_hash=hash_secret(body.login_key),
        recovery_auth_hash=hash_secret(body.recovery_auth_key),
    )
    db.add(user)
    db.commit()
    return _signed_in(db, user, request)


@router.post("/login", response_model=AuthResponse, response_model_exclude_none=True)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = _user_by_email(db, body.email)
    if user is None:
        verify_secret(_DUMMY_HASH, body.login_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not verify_secret(user.login_key_hash, body.login_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if user.totp_enabled:
        return AuthResponse(two_factor_session_id=two_factor_challenge(user))
    return _signed_in(db, user, request)


@router.post(
    "/two-factor/verify", response_model=AuthResponse, response_model_exclude_none=True
)
def verify_two_factor(
    body: TwoFactorVerifyRequest, request: Request, db: Session = Depends(get_db)
):
    user = db.get(User, resolve_two_factor_challenge(body.two_factor_session_id))
    if user is None or not user.totp_enabled:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
    if not verify_totp(user.totp_secret, body.code):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect code")
    return _signed_in(db, user, request)


@router.post("/recover/params", response_model=RecoveryParams)
def recovery_params(body: EmailRequest, db: Session = Depends(get_db)):
    user = _user_by_email(db, body.email)
    if user is None:
        email = body.email.lower()
        return RecoveryParams(
            master_key_encrypted_with_recovery_key=decoy_bytes(email, "rk", 48),
            master_key_decryption_nonce=decoy_bytes(email, "rkn", 24),
        )
    return RecoveryParams.model_validate(user)


@router.post("/recover", response_model=AuthResponse, response_model_exclude_none=True)
def recover(body: RecoverRequest, request: Request, db: Session = Depends(get_db)):
    user = _user_by_email(db, body.email)
    if user is None:
        verify_secret(_DUMMY_HASH, body.recovery_auth_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect recovery key")
    if not verify_secret(user.recovery_auth_hash, body.recovery_auth_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect recovery key")
    apply_new_password(user, body.new_password)
    # A recovery is a fresh start: sign out everywhere else.
    user.sessions.clear()
    db.commit()
    return _signed_in(db, user, request)
