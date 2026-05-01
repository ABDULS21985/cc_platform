"""
User Repository - Database Access Layer with Flask-SQLAlchemy

Handles ALL database operations for users using Flask-SQLAlchemy.
Uses db.session (Flask-native) instead of manual session management.
"""
import logging
from typing import Optional
from modules.auth_v2.extensions import db
from modules.auth_v2.models.user import User

logger = logging.getLogger(__name__)


class UserRepository:
    """
    Handles all user database operations using Flask-SQLAlchemy
    
    Uses db.session - Flask's native session management!
    """
    
    @staticmethod
    def find_by_email(email: str) -> Optional[User]:
        """
        Find user by email address
        
        Flask-SQLAlchemy way:
            User.query.filter_by(email=email).first()
        """
        try:
            return User.query.filter(
                User.email == email.lower().strip()
            ).first()
        except Exception as e:
            logger.error(f"Error finding user by email: {e}")
            raise
    
    @staticmethod
    def find_by_id(user_id: int) -> Optional[User]:
        """Find user by ID using Flask-SQLAlchemy"""
        try:
            return User.query.get(user_id)
        except Exception as e:
            logger.error(f"Error finding user by ID: {e}")
            raise
    
    @staticmethod
    def find_by_firebase_uid(firebase_uid: str) -> Optional[User]:
        """Find user by Firebase UID"""
        try:
            return User.query.filter_by(firebase_uid=firebase_uid).first()
        except Exception as e:
            logger.error(f"Error finding user by Firebase UID: {e}")
            raise
    
    @staticmethod
    def create_user(
        email: str,
        firstname: str,
        lastname: str,
        password_hash: str,
        date_of_birth: Optional[str] = None,
        phone_number: Optional[str] = None,
        nin: Optional[str] = None,
        role: str = 'user',
        firebase_uid: Optional[str] = None
    ) -> User:
        """
        Create a new user with Flask-SQLAlchemy
        
        Uses db.session.add() and db.session.commit()
        """
        try:
            user = User(
                email=email.lower().strip(),
                firstname=firstname,
                lastname=lastname,
                password_hash=password_hash,
                date_of_birth=date_of_birth,
                phone_number=phone_number,
                nin=nin,
                role=role,
                firebase_uid=firebase_uid,
                email_verified=False
            )
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"Created user with ID: {user.id}")
            return user
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user: {e}")
            raise
    
    @staticmethod
    def update_user(user_id: int, **kwargs) -> bool:
        """
        Update user fields with Flask-SQLAlchemy
        
        Changes are tracked automatically, just commit!
        """
        if not kwargs:
            return True
            
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            for key, value in kwargs.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            
            db.session.commit()
            logger.info(f"Updated user {user_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user: {e}")
            raise
    
    @staticmethod
    def verify_email(user_id: int) -> bool:
        """Mark user email as verified"""
        return UserRepository.update_user(user_id, email_verified=True)
    
    @staticmethod
    def update_firebase_uid(user_id: int, firebase_uid: str) -> bool:
        """Update user's Firebase UID"""
        return UserRepository.update_user(user_id, firebase_uid=firebase_uid)
    
    @staticmethod
    def delete_user(user_id: int) -> bool:
        """Delete a user with Flask-SQLAlchemy"""
        try:
            user = User.query.get(user_id)
            if user:
                db.session.delete(user)
                db.session.commit()
                logger.info(f"Deleted user {user_id}")
                return True
            return False
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting user: {e}")
            raise
