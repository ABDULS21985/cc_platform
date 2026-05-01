"""
Quick cleanup script for stuck verifications
Runs directly without Flask shell
"""
import os
os.environ['FLASK_APP'] = 'app.py'

from app import create_app
from modules.auth_v2.extensions import db
from modules.verification.repositories.verification_repository import VerificationRepository

def cleanup_stuck_verification(user_id):
    """Delete stuck verification for a user"""
    app = create_app()

    with app.app_context():
        repo = VerificationRepository()
        verification = repo.find_by_user_id(user_id)

        if verification:
            print(f"Found verification ID {verification.id}")
            print(f"  Status: {verification.status}")
            print(f"  Type: {verification.verification_type}")
            print(f"  User ID: {verification.user_id}")

            # Delete it
            db.session.delete(verification)
            db.session.commit()
            print(f"✓ Deleted verification {verification.id}")
        else:
            print(f"No verification found for user {user_id}")

if __name__ == "__main__":
    # User ID 3 from your logs
    cleanup_stuck_verification(3)
