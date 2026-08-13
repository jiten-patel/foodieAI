from sqlalchemy.orm import Session

from database.models.user_profile import UserProfile


def get_user_profile(db: Session, user_id: int) -> UserProfile | None:
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).one_or_none()


def upsert_user_profile(db: Session, user_id: int, profile: dict) -> UserProfile:
    """
    profile is node_generate_profile's raw LLM output (agents.py) — treat it
    as untrusted-shape input (missing keys, wrong types) since it's coming
    from a JSON-parsed LLM response, not our own code.
    """
    row = get_user_profile(db, user_id)
    if row is None:
        row = UserProfile(user_id=user_id)
        db.add(row)

    row.favorite_cuisines = profile.get("favorite_cuisines") or []
    row.dietary_restrictions = profile.get("dietary_restrictions") or []
    row.dining_occasions = profile.get("dining_occasions") or []
    row.price_range = profile.get("price_range")
    row.flavor_preferences = profile.get("flavor_preferences") or []
    row.summary = profile.get("summary")

    score = profile.get("adventurousness_score")
    try:
        row.adventurousness_score = int(score) if score is not None else None
    except (TypeError, ValueError):
        row.adventurousness_score = None

    db.commit()
    db.refresh(row)
    return row
