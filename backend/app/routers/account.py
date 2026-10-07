import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AuthSession, User
from ..schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    NewPasswordAttributes,
    SessionInfo,
    TwoFactorCode,
    TwoFactorSetup,
    UserDetails,
)
from ..security import current_session, current_user, hash_secret, verify_secret

router = APIRouter(prefix="/users/me", tags=["account"])


def verify_totp(secret: str | None, code: str) -> bool:
    return bool(secret) and pyotp.TOTP(secret).verify(code.strip(), valid_window=1)


def apply_new_password(user: User, attrs: NewPasswordAttributes) -> None:
    user.kek_salt = attrs.kek_salt
    user.ops_limit = attrs.ops_limit
    user.mem_limit = attrs.mem_limit
    user.encrypted_key = attrs.encrypted_key
    user.key_decryption_nonce = attrs.key_decryption_nonce
    user.login_key_hash = hash_secret(attrs.login_key)


def _details(user: User) -> UserDetails:
    return UserDetails(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        two_factor_enabled=user.totp_enabled,
    )


@router.get("", response_model=UserDetails)
def me(user: User = Depends(current_user)):
    return _details(user)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    session: AuthSession = Depends(current_session),
    db: Session = Depends(get_db),
):
    user = session.user
    if not verify_secret(user.login_key_hash, body.current_login_key):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Incorrect current password")
    apply_new_password(user, body.new_password)
    # Sign out all other devices.
    for s in list(user.sessions):
        if s.id != session.id:
            db.delete(s)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    body: DeleteAccountRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not verify_secret(user.login_key_hash, body.login_key):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Incorrect password")
    db.delete(user)
    db.commit()


# --- Two-factor authentication ----------------------------------------------


@router.post("/two-factor/setup", response_model=TwoFactorSetup)
def two_factor_setup(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.totp_enabled:
        raise HTTPException(status.HTTP_409_CONFLICT, "Two-factor already enabled")
    user.totp_secret = pyotp.random_base32()
    db.commit()
    uri = pyotp.TOTP(user.totp_secret).provisioning_uri(
        name=user.email, issuer_name="ente tasks"
    )
    return TwoFactorSetup(secret=user.totp_secret, uri=uri)


@router.post("/two-factor/enable", response_model=UserDetails)
def two_factor_enable(
    body: TwoFactorCode, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    if not verify_totp(user.totp_secret, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code")
    user.totp_enabled = True
    db.commit()
    return _details(user)


@router.post("/two-factor/disable", response_model=UserDetails)
def two_factor_disable(
    body: TwoFactorCode, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    if not user.totp_enabled or not verify_totp(user.totp_secret, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code")
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return _details(user)


# --- Sessions ---------------------------------------------------------------


@router.get("/sessions", response_model=list[SessionInfo])
def list_sessions(
    session: AuthSession = Depends(current_session), db: Session = Depends(get_db)
):
    sessions = db.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == session.user_id)
        .order_by(AuthSession.last_used_at.desc())
    )
    return [
        SessionInfo.model_validate(s).model_copy(update={"is_current": s.id == session.id})
        for s in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: int,
    session: AuthSession = Depends(current_session),
    db: Session = Depends(get_db),
):
    target = db.get(AuthSession, session_id)
    if target is None or target.user_id != session.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    db.delete(target)
    db.commit()


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(session: AuthSession = Depends(current_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
