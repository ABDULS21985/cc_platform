"""
UserVerification Model
Stores identity verification records (BVN/NIN) for users.

SOLID Principles:
- Single Responsibility: Only handles verification data persistence
- Open/Closed: Extensible for new verification types
- Liskov Substitution: Can be substituted wherever db.Model is expected
- Interface Segregation: Clean interface with only needed methods
- Dependency Inversion: Depends on SQLAlchemy abstraction, not concrete DB
"""
from datetime import datetime
from typing import Optional
from modules.auth_v2.extensions import db
from sqlalchemy import func


class UserVerification(db.Model):
    """
    Stores user identity verification records.
    
    Attributes:
        id: Primary key
        user_id: Foreign key to users table (one-to-one)
        verification_type: 'bvn' or 'nin'
        verification_number_encrypted: Encrypted BVN/NIN (Fernet)
        verification_number_hash: SHA256 hash for duplicate detection
        status: 'pending', 'processing', 'verified', 'failed'
        bell_mfb_client_id: Bell MFB client ID (after account creation)
        bell_mfb_external_reference: Our reference sent to Bell MFB
        error_message: Error details if verification failed
        verified_at: Timestamp when verification completed successfully
        created_at: Record creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = 'user_verifications'
    
    # Primary key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign key (one-to-one with User)
    user_id = db.Column(
        db.Integer, 
        db.ForeignKey('users.id', ondelete='CASCADE'), 
        unique=True, 
        nullable=False, 
        index=True
    )
    
    # Verification details
    verification_type = db.Column(db.String(10), nullable=False)  # 'bvn' or 'nin'
    verification_number_encrypted = db.Column(db.Text, nullable=False)  # Fernet encrypted
    verification_number_hash = db.Column(db.String(64), nullable=False, index=True)  # SHA256 for duplicates
    
    # Status tracking
    status = db.Column(
        db.String(20), 
        default='pending', 
        nullable=False,
        index=True
    )  # pending, processing, verified, failed

    # Bell MFB Integration
    bell_mfb_client_id = db.Column(db.String(100), unique=True, nullable=True)
    bell_mfb_external_reference = db.Column(db.String(100), unique=True, nullable=True)
    
    # Celery task tracking
    task_id = db.Column(db.String(255), nullable=True, index=True)  # Celery task UUID
    
    # Error handling
    error_message = db.Column(db.Text, nullable=True)
    
    # Timestamps
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship (one-to-one with User)
    user = db.relationship(
        'User', 
        backref=db.backref('verification', uselist=False, cascade='all, delete-orphan')
    )
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<UserVerification(id={self.id}, user_id={self.user_id}, "
            f"type='{self.verification_type}', status='{self.status}')>"
        )
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """
        Convert to dictionary (for API responses).
        
        Args:
            include_sensitive: Include encrypted verification number (default: False)
            
        Returns:
            Dictionary representation
        """
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "verification_type": self.verification_type,
            "status": self.status,
            "task_id": self.task_id,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data["verification_number_encrypted"] = self.verification_number_encrypted
            data["verification_number_hash"] = self.verification_number_hash
            
        if self.error_message:
            data["error_message"] = self.error_message
            
        return data
    
    def mark_as_processing(self) -> None:
        """Update status to processing (DRY principle)."""
        self.status = 'processing'
        self.updated_at = datetime.utcnow()
    
    def mark_as_verified(self) -> None:
        """Mark verification as successful."""
        self.status = 'verified'
        self.verified_at = datetime.utcnow()
        self.error_message = None
        self.updated_at = datetime.utcnow()
    
    def mark_as_failed(self, error_message: str) -> None:
        """
        Mark verification as failed.
        
        Args:
            error_message: Error description
        """
        self.status = 'failed'
        self.error_message = error_message
        self.updated_at = datetime.utcnow()
    
    @property
    def is_verified(self) -> bool:
        """Check if verification is complete."""
        return self.status == 'verified'
    
    @property
    def is_pending(self) -> bool:
        """Check if verification is pending."""
        return self.status == 'pending'
    
    @property
    def is_processing(self) -> bool:
        """Check if verification is being processed."""
        return self.status == 'processing'
