"""Authentication endpoints: register, login, verify email, forgot/reset password,
JWT refresh (with rotation), logout, current user, and a Google-login stub (future).
"""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..email_utils import build_link, send_email
from ..models import EmailToken, RefreshToken, User
from ..schemas import (
    ForgotPasswordIn,
    LoginIn,
    LogoutIn,
    MessageOut,
    RefreshIn,
    RegisterIn,
    ResendVerificationIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
    VerifyEmailIn,
)
from ..security import (
    create_access_token,
    hash_password,
    hash_token,
    new_raw_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(tz=datetime.timezone.utc)


def _is_expired(dt: datetime.datetime) -> bool:
    """Compare safely whether SQLite returns naive datetimes or Postgres returns aware ones."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt < _utcnow()


# --------------------------------------------------------------------------- helpers
def _issue_email_token(db: Session, user: User, purpose: str, expires: datetime.timedelta) -> str:
    """Create a single-use email token, store only its hash, return the raw token."""
    raw = new_raw_token()
    db.add(
        EmailToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            purpose=purpose,
            expires_at=_utcnow() + expires,
        )
    )
    db.commit()
    return raw


def _consume_email_token(db: Session, raw: str, purpose: str) -> EmailToken:
    token = db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_token(raw),
            EmailToken.purpose == purpose,
        )
    )
    if not token or token.used_at is not None or _is_expired(token.expires_at):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    return token


def _issue_refresh_token(db: Session, user: User) -> str:
    raw = new_raw_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=_utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()
    return raw


def _token_response(db: Session, user: User) -> TokenOut:
    access = create_access_token(user.id, user.role)
    refresh = _issue_refresh_token(db, user)
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MIN * 60,
        user=UserOut.model_validate(user),
    )


def _send_verification(user: User, raw: str) -> None:
    link = build_link("verify", raw)
    send_email(
        user.email,
        "Verify your AI Trading Master account",
        f"Hi {user.name},\n\nConfirm your email to activate your account:\n{link}\n\n"
        f"This link expires in {settings.VERIFY_TOKEN_EXPIRE_H} hours.\n"
        "If you didn't sign up, ignore this email.",
    )


def _send_reset(user: User, raw: str) -> None:
    link = build_link("reset", raw)
    send_email(
        user.email,
        "Reset your AI Trading Master password",
        f"Hi {user.name},\n\nReset your password here:\n{link}\n\n"
        f"This link expires in {settings.RESET_TOKEN_EXPIRE_MIN} minutes.\n"
        "If you didn't request this, ignore this email — your password stays unchanged.",
    )


def _dev(raw: str, purpose: str) -> dict:
    """Expose the action link/token in the response for local testing only."""
    if not settings.DEV_EXPOSE_TOKENS:
        return {}
    return {"dev_action_link": build_link(purpose, raw), "dev_token": raw}


# --------------------------------------------------------------------------- register
@router.post("/register", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="user",
        is_verified=not settings.REQUIRE_VERIFICATION,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    raw = _issue_email_token(db, user, "verify", datetime.timedelta(hours=settings.VERIFY_TOKEN_EXPIRE_H))
    _send_verification(user, raw)

    return MessageOut(
        message="Account created. Please check your email to verify your account.",
        **_dev(raw, "verify"),
    )


# --------------------------------------------------------------------------- verify email
@router.post("/verify-email", response_model=MessageOut)
def verify_email(payload: VerifyEmailIn, db: Session = Depends(get_db)):
    token = _consume_email_token(db, payload.token, "verify")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    user.is_verified = True
    token.used_at = _utcnow()
    db.commit()
    return MessageOut(message="Email verified successfully. You can now log in.")


@router.post("/resend-verification", response_model=MessageOut)
def resend_verification(payload: ResendVerificationIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    # Generic response to avoid leaking which emails are registered.
    generic = MessageOut(message="If that account exists and is unverified, a verification email has been sent.")
    if not user or user.is_verified:
        return generic
    raw = _issue_email_token(db, user, "verify", datetime.timedelta(hours=settings.VERIFY_TOKEN_EXPIRE_H))
    _send_verification(user, raw)
    if settings.DEV_EXPOSE_TOKENS:
        return MessageOut(message=generic.message, **_dev(raw, "verify"))
    return generic


# --------------------------------------------------------------------------- login
@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        # Same message for both cases — don't reveal whether the email exists.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    if settings.REQUIRE_VERIFICATION and not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified. Please verify first.")
    return _token_response(db, user)


# --------------------------------------------------------------------------- forgot / reset
@router.post("/forgot-password", response_model=MessageOut)
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    generic = MessageOut(message="If that account exists, a password reset link has been sent.")
    if not user:
        return generic
    raw = _issue_email_token(db, user, "reset", datetime.timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MIN))
    _send_reset(user, raw)
    if settings.DEV_EXPOSE_TOKENS:
        return MessageOut(message=generic.message, **_dev(raw, "reset"))
    return generic


@router.post("/reset-password", response_model=MessageOut)
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    token = _consume_email_token(db, payload.token, "reset")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    user.password_hash = hash_password(payload.new_password)
    token.used_at = _utcnow()
    # Security: revoke all existing sessions after a password reset.
    for rt in user.refresh_tokens:
        rt.revoked = True
    db.commit()
    return MessageOut(message="Password reset successful. Please log in with your new password.")


# --------------------------------------------------------------------------- refresh / logout
@router.post("/refresh", response_model=TokenOut)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)):
    rt = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(payload.refresh_token)))
    if not rt or rt.revoked or _is_expired(rt.expires_at):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    user = db.get(User, rt.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    # Rotation: revoke the used refresh token and issue a fresh pair.
    rt.revoked = True
    db.commit()
    return _token_response(db, user)


@router.post("/logout", response_model=MessageOut)
def logout(payload: LogoutIn, db: Session = Depends(get_db)):
    rt = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(payload.refresh_token)))
    if rt and not rt.revoked:
        rt.revoked = True
        db.commit()
    return MessageOut(message="Logged out.")


# --------------------------------------------------------------------------- me
@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current


# --------------------------------------------------------------------------- google (future)
@router.get("/google/login")
def google_login():
    """Placeholder for Google OAuth sign-in (planned)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google login is coming soon. Configure GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to enable.",
    )
