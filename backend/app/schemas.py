from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel

B64 = Field(min_length=1, max_length=1_000_000)


class Model(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


# --- Auth -------------------------------------------------------------------


class KeyDerivationParams(Model):
    kek_salt: str
    ops_limit: int
    mem_limit: int


class KeyAttributes(KeyDerivationParams):
    encrypted_key: str
    key_decryption_nonce: str
    master_key_encrypted_with_recovery_key: str
    master_key_decryption_nonce: str
    recovery_key_encrypted_with_master_key: str
    recovery_key_decryption_nonce: str


class EmailRequest(Model):
    email: EmailStr


class SignupRequest(Model):
    email: EmailStr
    key_attributes: KeyAttributes
    login_key: str = Field(min_length=32, max_length=128)
    recovery_auth_key: str = Field(min_length=32, max_length=128)


class LoginRequest(Model):
    email: EmailStr
    login_key: str = Field(min_length=1, max_length=128)


class TwoFactorVerifyRequest(Model):
    two_factor_session_id: str
    code: str = Field(min_length=6, max_length=8)


class AuthResponse(Model):
    token: str | None = None
    key_attributes: KeyAttributes | None = None
    two_factor_session_id: str | None = None


class RecoveryParams(Model):
    master_key_encrypted_with_recovery_key: str
    master_key_decryption_nonce: str


class NewPasswordAttributes(Model):
    kek_salt: str
    ops_limit: int
    mem_limit: int
    encrypted_key: str
    key_decryption_nonce: str
    login_key: str = Field(min_length=32, max_length=128)


class RecoverRequest(Model):
    email: EmailStr
    recovery_auth_key: str
    new_password: NewPasswordAttributes


class ChangePasswordRequest(Model):
    current_login_key: str
    new_password: NewPasswordAttributes


class DeleteAccountRequest(Model):
    login_key: str


# --- Account ----------------------------------------------------------------


class UserDetails(Model):
    id: int
    email: str
    created_at: datetime
    two_factor_enabled: bool


class TwoFactorSetup(Model):
    secret: str
    uri: str


class TwoFactorCode(Model):
    code: str = Field(min_length=6, max_length=8)


class SessionInfo(Model):
    id: int
    user_agent: str
    ip: str
    created_at: datetime
    last_used_at: datetime
    is_current: bool = False


# --- Lists & tasks ----------------------------------------------------------


class ListCreate(Model):
    encrypted_key: str = B64
    key_decryption_nonce: str = B64
    encrypted_data: str = B64
    data_decryption_nonce: str = B64


class ListUpdate(Model):
    encrypted_data: str = B64
    data_decryption_nonce: str = B64


class ListOut(ListCreate):
    id: int
    created_at: datetime
    updated_at: datetime


class TaskCreate(Model):
    list_id: int
    encrypted_data: str = B64
    decryption_nonce: str = B64


class TaskUpdate(TaskCreate):
    pass


class TaskOut(TaskCreate):
    id: int
    is_trashed: bool
    trashed_at: datetime | None
    created_at: datetime
    updated_at: datetime
