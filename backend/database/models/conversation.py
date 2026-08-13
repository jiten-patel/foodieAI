from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    """One chat session. Maps 1:1 to a LangGraph ``thread_id`` (== session_id)."""

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

   
    # Nullable: guest/anonymous users don't have a user id yet.
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True,)

    title: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:  # pragma: no cover - debug convenience only
        return f"<Conversation id={self.id}>"


class Message(Base):
    """A single turn (user or assistant) within a Conversation."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )

    # "user" | "assistant" — kept as a plain string rather than an Enum so
    # new roles (e.g. "system") don't require a migration.
    role: Mapped[str] = mapped_column(String(16))

    content: Mapped[str] = mapped_column(Text)

    # Set only on assistant messages — which specialist agent produced this
    # reply and what intent the planner classified. Useful for analytics
    # ("which agent handles the most volume") without re-parsing logs.
    intent: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=_utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")

    def __repr__(self) -> str:  # pragma: no cover - debug convenience only
        return f"<Message id={self.id} role={self.role!r}>"
