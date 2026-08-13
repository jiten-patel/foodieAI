from datetime import date as date_
from sqlalchemy import Integer, String, Text, Float, Date, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from database.base import Base

class UserReview(Base):
    __tablename__ = "user_review"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    user_id: Mapped[str] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    item_id: Mapped[int] = mapped_column(Integer, ForeignKey("restaurants.item_id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    text: Mapped[str] = mapped_column(Text)
    date: Mapped[date_ | None] = mapped_column(Date, nullable=True)
    rating: Mapped[float] = mapped_column(Float)
    language: Mapped[str] = mapped_column(String(8))
    images: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)