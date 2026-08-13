"""
Declarative base for all SQLAlchemy ORM models.

Every model in ``app/models/`` should inherit from ``Base`` so that:
  1. Alembic's autogenerate can discover it via ``Base.metadata``.
  2. All models share one metadata registry (needed for foreign keys
     between tables defined in different files).
"""
from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base class. Import this, not sqlalchemy directly."""

    pass
