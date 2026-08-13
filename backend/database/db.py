"""
Postgres connection helper for the restaurants table.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager

import psycopg2
from typing import Generator
from config import get_settings
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from database.base import Base


logger = logging.getLogger(__name__)

_settings = get_settings()

engine = create_engine(
    _settings.database_url,
    echo=_settings.echo_sql,
    pool_pre_ping=True,  # drops stale connections instead of raising on first use
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    future=True,
)

@contextmanager
def get_conn():
    conn = psycopg2.connect(_settings.database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db() -> None:
    """Create any tables that don't exist yet. First-time-deploy only —
    it never alters an existing table, so once real data is in Postgres,
    switch to Alembic migrations instead of relying on this."""
    Base.metadata.create_all(bind=engine)
    logger.info("tables ready")

def get_session_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a request-scoped SQLAlchemy session.

    Always closed after the request, even on error, via the ``finally``.
    """
    session_db = SessionLocal()
    try:
        yield session_db
    finally:
        session_db.close()