from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text,Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Restaurant(Base):
    __tablename__ = "restaurants"
    item_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64))
    location: Mapped[str] = mapped_column(String(64))
    type: Mapped[str] = mapped_column(String(64))
    food_style: Mapped[str] = mapped_column(String(64))
    rating: Mapped[int] = mapped_column(Float)
    price_range: Mapped[int] = mapped_column(Integer) 
    signatures: Mapped[str] = mapped_column(Text)
    vibe: Mapped[str] = mapped_column(Text)
    environment: Mapped[str] = mapped_column(Text)
    shortcomings: Mapped[str] = mapped_column(Text)