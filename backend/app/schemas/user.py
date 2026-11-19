from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr

class UserRegister(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(UserBase):
    password: str

class GoogleAuthRequest(BaseModel):
    access_token: str | None = None
    id_token: str | None = None
    code: str | None = None
    redirect_uri: str | None = "postmessage"

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: str | None = None


class EncryptionKeyBundle(BaseModel):
    encryption_salt: str | None = None
    encryption_verifier: str | None = None
    wrapped_dek: str | None = None
    recovery_wrapped_dek: str | None = None
    e2ee_enabled: bool = False


class EncryptionKeyUpdate(BaseModel):
    encryption_salt: str
    encryption_verifier: str
    wrapped_dek: str
    recovery_wrapped_dek: str | None = None
