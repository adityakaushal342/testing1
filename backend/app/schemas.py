"""Pydantic request/response schemas."""
import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Requests ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt 72-byte limit


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class VerifyEmailIn(BaseModel):
    token: str


class ResendVerificationIn(BaseModel):
    email: EmailStr


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


# ---------- Responses ----------
class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_verified: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access-token lifetime in seconds
    user: UserOut


class MessageOut(BaseModel):
    message: str
    # Dev-only helpers (present when DEV_EXPOSE_TOKENS is on): the link you'd normally email.
    dev_action_link: Optional[str] = None
    dev_token: Optional[str] = None
