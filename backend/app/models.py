"""Database models.

The server is zero-knowledge with respect to task content: every list and task
is stored as an opaque ciphertext produced by the client. The only plaintext
the server sees is the email address, timestamps and structural metadata
(which list a task belongs to, whether it is in the trash).
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    # Key attributes (all base64, all opaque to the server).
    kek_salt: Mapped[str] = mapped_column(String(64))
    ops_limit: Mapped[int] = mapped_column(Integer)
    mem_limit: Mapped[int] = mapped_column(Integer)
    encrypted_key: Mapped[str] = mapped_column(Text)
    key_decryption_nonce: Mapped[str] = mapped_column(String(64))
    master_key_encrypted_with_recovery_key: Mapped[str] = mapped_column(Text)
    master_key_decryption_nonce: Mapped[str] = mapped_column(String(64))
    recovery_key_encrypted_with_master_key: Mapped[str] = mapped_column(Text)
    recovery_key_decryption_nonce: Mapped[str] = mapped_column(String(64))

    # Argon2 hashes of keys derived on the client. The password itself never
    # leaves the browser.
    login_key_hash: Mapped[str] = mapped_column(Text)
    recovery_auth_hash: Mapped[str] = mapped_column(Text)

    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    lists: Mapped[list["TaskList"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class AuthSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_agent: Mapped[str] = mapped_column(String(512), default="")
    ip: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship(back_populates="sessions")


class TaskList(Base):
    __tablename__ = "lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Per-list key, encrypted with the user's master key.
    encrypted_key: Mapped[str] = mapped_column(Text)
    key_decryption_nonce: Mapped[str] = mapped_column(String(64))
    # Name, colour, emoji... encrypted with the list key.
    encrypted_data: Mapped[str] = mapped_column(Text)
    data_decryption_nonce: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )

    user: Mapped[User] = relationship(back_populates="lists")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="list", cascade="all, delete-orphan"
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    list_id: Mapped[int] = mapped_column(
        ForeignKey("lists.id", ondelete="CASCADE"), index=True
    )
    # Title, notes, due date, subtasks... encrypted with the list key.
    encrypted_data: Mapped[str] = mapped_column(Text)
    decryption_nonce: Mapped[str] = mapped_column(String(64))
    is_trashed: Mapped[bool] = mapped_column(Boolean, default=False)
    trashed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )

    list: Mapped[TaskList] = relationship(back_populates="tasks")
