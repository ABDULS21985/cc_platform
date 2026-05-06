"""
Verification Repository - Data Access Layer
Follows Repository Pattern for separation of concerns and testability
"""
from typing import Optional, List
from sqlalchemy.exc import IntegrityError
from modules.verification.models.verification import UserVerification
from modules.auth_v2.extensions import db


class VerificationRepository:
    """
    Repository for UserVerification entity
    Encapsulates all database operations for verifications
    Follows Single Responsibility Principle
    """
    
    def create(self, verification_data: dict) -> UserVerification:
        """
        Create a new verification record
        
        Args:
            verification_data: Dictionary containing verification fields
            
        Returns:
            UserVerification: Created verification instance
            
        Raises:
            IntegrityError: If duplicate user_id or unique constraint violated
        """
        verification = UserVerification(**verification_data)
        db.session.add(verification)
        db.session.commit()
        return verification
    
    def find_by_id(self, verification_id: int) -> Optional[UserVerification]:
        """Find verification by ID"""
        return UserVerification.query.filter_by(id=verification_id).first()
    
    def find_by_user_id(self, user_id: int) -> Optional[UserVerification]:
        """Find verification by user ID"""
        return UserVerification.query.filter_by(user_id=user_id).first()

    def find_by_task_id_for_user(self, task_id: str, user_id: int) -> Optional[UserVerification]:
        """Find a verification task owned by the user."""
        return UserVerification.query.filter_by(
            task_id=task_id,
            user_id=user_id,
        ).first()
    
    def find_by_hash(self, verification_hash: str) -> Optional[UserVerification]:
        """
        Find verification by hash (for duplicate detection)
        Used to prevent same BVN/NIN being used twice
        """
        return UserVerification.query.filter_by(
            verification_number_hash=verification_hash
        ).first()
    
    def find_by_bell_mfb_client_id(self, client_id: str) -> Optional[UserVerification]:
        """Find verification by Bell MFB client ID"""
        return UserVerification.query.filter_by(bell_mfb_client_id=client_id).first()
    
    def update(self, verification: UserVerification, update_data: dict) -> UserVerification:
        """
        Update verification record
        
        Args:
            verification: UserVerification instance to update
            update_data: Dictionary of fields to update
            
        Returns:
            UserVerification: Updated instance
        """
        for key, value in update_data.items():
            if hasattr(verification, key):
                setattr(verification, key, value)
        
        db.session.commit()
        db.session.refresh(verification)
        return verification
    
    def update_status(
        self, 
        verification_id: int, 
        status: str, 
        **kwargs
    ) -> Optional[UserVerification]:
        """
        Update verification status with optional additional fields
        
        Args:
            verification_id: ID of verification to update
            status: New status ('pending', 'processing', 'verified', 'failed')
            **kwargs: Additional fields to update (e.g., error_message, verified_at)
            
        Returns:
            Updated UserVerification or None if not found
        """
        verification = self.find_by_id(verification_id)
        if not verification:
            return None
        
        update_data = {'status': status, **kwargs}
        return self.update(verification, update_data)
    
    def get_pending_verifications(self, limit: int = 10) -> List[UserVerification]:
        """Get pending verifications for retry processing"""
        return UserVerification.query.filter_by(
            status='pending'
        ).limit(limit).all()
    
    def delete(self, verification: UserVerification) -> None:
        """
        Delete verification record (rarely used - prefer status updates)
        """
        db.session.delete(verification)
        db.session.commit()
