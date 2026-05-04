"""
Seed a local dev user for login.

Usage:
    python scripts/seed_dev_user.py [email] [password]

Defaults: dev@local.test / Password123!
The user is created with email_verified=True and is_active=True so it can log in
through POST /api/v2/auth/login without going through the OTP/verify flow.
"""
import os
import sys

os.environ['FLASK_APP'] = 'app.py'

# Ensure project root is importable when run from anywhere
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from modules.auth_v2.extensions import db
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService


def seed(email: str, password: str, firstname: str, lastname: str, role: str) -> None:
    app = create_app()
    with app.app_context():
        repo = UserRepository()
        existing = repo.find_by_email(email)
        password_hash = PasswordService.hash_password(password)

        if existing:
            existing.password_hash = password_hash
            existing.email_verified = True
            existing.is_active = True
            existing.firstname = existing.firstname or firstname
            existing.lastname = existing.lastname or lastname
            existing.role = existing.role or role
            db.session.commit()
            print(f"Updated existing user: id={existing.id} email={existing.email} role={existing.role}")
            return

        from modules.auth_v2.models.user import User
        user = User(
            email=email,
            password_hash=password_hash,
            firstname=firstname,
            lastname=lastname,
            role=role,
            is_active=True,
            email_verified=True,
        )
        db.session.add(user)
        db.session.commit()
        print(f"Created user: id={user.id} email={user.email} role={user.role}")


if __name__ == '__main__':
    email = sys.argv[1] if len(sys.argv) > 1 else 'dev@local.test'
    password = sys.argv[2] if len(sys.argv) > 2 else 'Password123!'
    firstname = sys.argv[3] if len(sys.argv) > 3 else 'Dev'
    lastname = sys.argv[4] if len(sys.argv) > 4 else 'User'
    role = sys.argv[5] if len(sys.argv) > 5 else 'user'
    seed(email, password, firstname, lastname, role)
    print(f"\nLogin with:")
    print(f"  email:    {email}")
    print(f"  password: {password}")
    print(f"  endpoint: POST http://localhost:8080/api/v2/auth/login")
