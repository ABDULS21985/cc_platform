"""User Model - Flask-SQLAlchemy + Flask-Login"""
from datetime import datetime
from typing import Optional
from modules.auth_v2.extensions import db
from flask_login import UserMixin
from sqlalchemy import func


class User(db.Model, UserMixin):
    """
    User Model with Flask-SQLAlchemy and Flask-Login
    
    - Inherits from db.Model for Flask-SQLAlchemy ORM
    - Inherits from UserMixin for Flask-Login session management
    - Provides: is_authenticated, is_active, is_anonymous, get_id()
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    firebase_uid = db.Column(db.String(255), unique=True, nullable=True, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    firstname = db.Column(db.String(100), nullable=False)
    lastname = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.String(50), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    nin = db.Column(db.String(50), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    profile_photo = db.Column(db.String(500), nullable=True)  # Cloudinary URL
    header_image = db.Column(db.String(500), nullable=True)   # Cloudinary URL
    role = db.Column(db.String(20), default='user', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    bvn_verified = db.Column(db.Boolean, default=False, nullable=False)
    nin_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_status = db.Column(db.String(20), default='unverified', nullable=False)

    # Transaction PIN (for money-moving actions)
    transaction_pin_hash = db.Column(db.String(255), nullable=True)
    pin_failed_attempts = db.Column(db.Integer, nullable=False, default=0)
    pin_locked_until = db.Column(db.DateTime, nullable=True)
    pin_updated_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        """String representation"""
        return f"<User(id={self.id}, email='{self.email}', name='{self.full_name}')>"
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.firstname} {self.lastname}".strip()
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """
        Convert user to dictionary
        
        Args:
            include_sensitive: Include password_hash (default: False)
        """
        data = {
            "id": self.id,
            "firebase_uid": self.firebase_uid,
            "email": self.email,
            "firstname": self.firstname,
            "lastname": self.lastname,
            "full_name": self.full_name,
            "date_of_birth": self.date_of_birth,
            "phone_number": self.phone_number,
            "nin": self.nin,
            "bio": self.bio,
            "profile_photo": self.profile_photo,
            "header_image": self.header_image,
            "role": self.role,
            "is_active": self.is_active,
            "email_verified": self.email_verified,
            "bvn_verified": self.bvn_verified,
            "nin_verified": self.nin_verified,
            "verification_status": self.verification_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data["password_hash"] = self.password_hash
            
        return data
