"""One-off script: create the first admin user.

Run manually from the `backend/` directory (needs DATABASE_URL in the
environment, same as the API): `python seed_admin.py`
"""
import sys
from getpass import getpass

from database.db import SessionLocal, init_db
from services import user_store
from services.auth import hash_password


def main() -> None:
    init_db()  
    email = input("Admin email: ").strip()
    name = input("Admin name: ").strip()
    password = getpass("Admin password: ")
    if len(password.encode("utf-8")) > 72:
        print("Password too long — bcrypt supports at most 72 bytes.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        user = user_store.create_user(
            db, email=email, password_hash=hash_password(password), name=name, role="admin"
        )
        print(f"Created admin user id={user.id} email={user.email}")
    except user_store.EmailAlreadyExistsError:
        print(f"User with email {email} already exists", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
