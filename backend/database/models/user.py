from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from database.base import Base

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=_utcnow)
    # Bumped on every refresh (rotation) and on logout (revocation). Tokens
    # carry the version they were issued with — a mismatch means the token
    # is stale, even if its signature/exp are still technically valid.
    token_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")