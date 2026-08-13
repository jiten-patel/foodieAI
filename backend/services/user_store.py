from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.models.user import User
from database.models.conversation import Conversation


class EmailAlreadyExistsError(Exception):
    """Raised when registering with an email that's already taken."""


def create_user(db: Session, email: str, password_hash: str, name: str, role: str = "user") -> User:
    user = User(email=email, password_hash=password_hash, name=name, role=role)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise EmailAlreadyExistsError(f"Email already registered: {email}")
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).one_or_none()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)

def list_users_with_session_counts(db: Session) -> list[dict]:
    """Admin user list: email/role/created_at + session count only.
    Never joins Message — no message content, no per-session detail."""
    rows = (
        db.query(User, func.count(Conversation.id).label("session_count"))
        .outerjoin(Conversation, Conversation.user_id == User.id)
        .group_by(User.id)
        .all()
    )
    return [
        {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
            "session_count": session_count,
        }
        for user, session_count in rows
    ]