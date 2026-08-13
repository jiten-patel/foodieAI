from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from database.base import Base

class Recipe(Base):
    __tablename__ = "recipes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(255))
    cuisine: Mapped[str] = mapped_column(String(64))
    servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prep_time: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cook_time: Mapped[str | None] = mapped_column(String(32), nullable=True)
    total_time: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ingredients: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    directions: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)