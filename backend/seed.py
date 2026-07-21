"""Seed a demo admin + user so you can log in immediately.

Run:  python seed.py
Creates (verified) accounts:
  admin@aitradingmaster.com / Admin@12345  (role=admin)
  demo@aitradingmaster.com  / Demo@12345   (role=user)
"""
from app.database import SessionLocal, init_db
from app.models import User
from app.security import hash_password
from sqlalchemy import select

SEED = [
    ("Admin", "admin@aitradingmaster.com", "Admin@12345", "admin"),
    ("Demo User", "demo@aitradingmaster.com", "Demo@12345", "user"),
]


def run() -> None:
    init_db()
    db = SessionLocal()
    try:
        for name, email, password, role in SEED:
            if db.scalar(select(User).where(User.email == email)):
                print(f"• {email} already exists — skipped")
                continue
            db.add(
                User(
                    name=name,
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                    is_verified=True,
                )
            )
            print(f"✓ created {email} ({role}) — password: {password}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
