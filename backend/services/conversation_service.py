from sqlalchemy.orm import Session

from database.models import Conversation, Message


def create_session(db: Session, user_id: int) -> Conversation:
    conversation = Conversation(user_id=user_id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def list_sessions_for_user(db: Session, user_id: int) -> list[Conversation]:
    return db.query(Conversation).filter(Conversation.user_id == user_id).all()


def get_session_for_user(db: Session, conversation_id: int, user_id: int) -> Conversation | None:
    return (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .one_or_none()
    )


def delete_session(db: Session, conversation_id: int, user_id: int) -> bool:
    conversation = get_session_for_user(db, conversation_id, user_id)
    if conversation is None:
        return False
    db.delete(conversation)
    db.commit()
    return True


def add_message(db: Session, conversation_id: int, role: str, content: str, intent=None) -> Message:
    if role == "user":
        conversation = db.get(Conversation, conversation_id)
        if conversation is not None and not conversation.title:
            conversation.title = content.strip()[:60]

    message = Message(conversation_id=conversation_id, role=role, content=content, intent=intent)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_messages(db: Session, conversation_id: int) -> list[Message]:
    return db.query(Message).filter(Message.conversation_id == conversation_id).all()
