"""
SQLAlchemy ORM models.

Import every model module here so that ``database.base.Base.metadata``
is fully populated as soon as ``app.models`` is imported — this is what
Alembic's ``env.py`` relies on for autogenerate, and it's also what
guarantees relationships (foreign keys) resolve correctly no matter which
module gets imported first.
"""
from database.models.conversation import Conversation, Message
from database.models.restaurant import Restaurant
from database.models.recipe import Recipe
from database.models.user import User
from database.models.user_review import UserReview
from database.models.user_profile import UserProfile

__all__ = ["Conversation", "Message", "Restaurant", "Recipe", "User", "UserReview", "UserProfile"]
