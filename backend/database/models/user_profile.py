from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserProfile(Base):
    """
    The AI-generated preference profile from node_generate_profile
    (agents.py) — one row per user, upserted every time the recommendation
    workflow runs for them, so it always reflects the latest understanding
    rather than piling up a history of snapshots.
    """

    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    favorite_cuisines: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    dietary_restrictions: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    dining_occasions: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    price_range: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    adventurousness_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    flavor_preferences: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=_utcnow, onupdate=_utcnow)
