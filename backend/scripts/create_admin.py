"""Seed an admin user.

Usage:
    python -m scripts.create_admin --name "Ops" --email ops@example.com --password secret123

Promotes the account to admin if the email already exists.
"""
import argparse

from sqlalchemy import select

from app.auth import hash_password
from app.database import SessionLocal
from app.models import User, UserRole


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or promote an admin user")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == args.email))
        if user is not None:
            user.role = UserRole.admin
            user.password_hash = hash_password(args.password)
            db.commit()
            print(f"Promoted existing user to admin: {user.email} (id={user.id})")
            return

        user = User(
            name=args.name,
            email=args.email,
            password_hash=hash_password(args.password),
            role=UserRole.admin,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created admin: {user.email} (id={user.id})")


if __name__ == "__main__":
    main()
