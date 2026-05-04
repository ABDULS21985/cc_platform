"""
Profile Service - Business logic for profile operations

Single Responsibility: Handle profile-related business logic
"""
import logging
from typing import Dict, Any, Tuple
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService

logger = logging.getLogger(__name__)


class ProfileService:
    """
    Service class for profile business logic.
    
    Responsibilities:
    - Get user profile
    - Update user profile
    - Change password
    """
    
    def __init__(self):
        """Initialize service with dependencies."""
        self.user_repo = UserRepository()
        self.password_service = PasswordService()
    
    def get_profile(self, user_id: int) -> Tuple[Dict[str, Any], int]:
        """
        Get user profile by ID.
        
        Args:
            user_id: ID of authenticated user
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        try:
            user = self.user_repo.find_by_id(user_id)
            
            if not user:
                return {
                    "success": False,
                    "error": "user_not_found",
                    "message": "User not found"
                }, 404
            
            return {
                "success": True,
                "message": "Profile retrieved successfully",
                "data": user.to_dict()
            }, 200
            
        except Exception as e:
            logger.error(f"Error getting profile for user {user_id}: {e}")
            return {
                "success": False,
                "error": "internal_error",
                "message": "Failed to retrieve profile"
            }, 500
    
    def update_profile(
        self,
        user_id: int,
        data: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], int]:
        """
        Update user profile.
        
        Args:
            user_id: ID of authenticated user
            data: Validated profile update payload
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        try:
            # Check user exists
            user = self.user_repo.find_by_id(user_id)
            if not user:
                return {
                    "success": False,
                    "error": "user_not_found",
                    "message": "User not found"
                }, 404
            
            # Keep only provided non-null fields
            update_data = {k: v for k, v in data.items() if v is not None}
            
            if not update_data:
                return {
                    "success": False,
                    "error": "no_changes",
                    "message": "No fields to update"
                }, 400
            
            # Update user
            success = self.user_repo.update_user(user_id, **update_data)
            
            if not success:
                return {
                    "success": False,
                    "error": "update_failed",
                    "message": "Failed to update profile"
                }, 500
            
            # Get updated user
            updated_user = self.user_repo.find_by_id(user_id)
            
            logger.info(f"Profile updated for user {user_id}: {list(update_data.keys())}")
            
            return {
                "success": True,
                "message": "Profile updated successfully",
                "data": updated_user.to_dict()
            }, 200
            
        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {e}")
            return {
                "success": False,
                "error": "internal_error",
                "message": "Failed to update profile"
            }, 500
    
    def change_password(
        self,
        user_id: int,
        data: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], int]:
        """
        Change user password.
        
        Args:
            user_id: ID of authenticated user
            data: Validated password payload dict
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        try:
            # Get user
            user = self.user_repo.find_by_id(user_id)
            if not user:
                return {
                    "success": False,
                    "error": "user_not_found",
                    "message": "User not found"
                }, 404
            
            # Verify current password
            if not user.password_hash:
                return {
                    "success": False,
                    "error": "no_password",
                    "message": "Account uses social login, cannot change password"
                }, 400
            
            if not self.password_service.verify_password(
                data.get("current_password"),
                user.password_hash
            ):
                return {
                    "success": False,
                    "error": "invalid_password",
                    "message": "Current password is incorrect"
                }, 401
            
            # Check new password is different from current
            if self.password_service.verify_password(
                data.get("new_password"),
                user.password_hash
            ):
                return {
                    "success": False,
                    "error": "same_password",
                    "message": "New password must be different from current password"
                }, 400
            
            # Hash new password
            new_hash = self.password_service.hash_password(data.get("new_password"))
            
            # Update password
            success = self.user_repo.update_user(user_id, password_hash=new_hash)
            
            if not success:
                return {
                    "success": False,
                    "error": "update_failed",
                    "message": "Failed to change password"
                }, 500
            
            logger.info(f"Password changed for user {user_id}")

            # Best-effort: notify the user + audit the change.
            try:
                from flask import request
                from modules.notifications.services.notification_service import NotificationService
                from modules.audit.services.audit_service import AuditService
                ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip() if request else None
                device = request.headers.get('User-Agent') if request else None
                NotificationService().create_for_user(
                    user_id=user_id,
                    title="Password changed",
                    body="Your account password was just changed. If this wasn't you, secure your account immediately.",
                    category='security',
                    source='Security',
                    action_href='/dashboard/settings',
                    action_label='Review settings',
                )
                AuditService().record(
                    user_id=user_id,
                    action='Password changed',
                    details='Account password was updated',
                    category='security',
                    severity='warning',
                    actor='You',
                    ip=ip,
                    device=device,
                )
            except Exception:
                pass

            return {
                "success": True,
                "message": "Password changed successfully"
            }, 200
            
        except Exception as e:
            logger.error(f"Error changing password for user {user_id}: {e}")
            return {
                "success": False,
                "error": "internal_error",
                "message": "Failed to change password"
            }, 500

    def upload_profile_image(
        self,
        user_id: int,
        file
    ) -> Tuple[Dict[str, Any], int]:
        """
        Upload and update user profile image.
        
        Args:
            user_id: ID of authenticated user
            file: Uploaded file from request.files
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        from modules.auth_v2.utils.image_upload import upload_to_cloudinary
        
        try:
            # Check user exists
            user = self.user_repo.find_by_id(user_id)
            if not user:
                return {
                    "success": False,
                    "error": "user_not_found",
                    "message": "User not found"
                }, 404
            
            # Upload to Cloudinary
            image_url, error = upload_to_cloudinary(
                file,
                folder="profile_images",
                public_id=f"user_{user_id}_profile"
            )
            
            if error:
                return {
                    "success": False,
                    "error": "upload_failed",
                    "message": error
                }, 400
            
            # Update user profile_photo
            success = self.user_repo.update_user(user_id, profile_photo=image_url)
            
            if not success:
                return {
                    "success": False,
                    "error": "update_failed",
                    "message": "Failed to update profile photo"
                }, 500
            
            logger.info(f"Profile image updated for user {user_id}")
            
            return {
                "success": True,
                "message": "Profile image uploaded successfully",
                "data": {
                    "profile_photo": image_url
                }
            }, 200
            
        except Exception as e:
            logger.error(f"Error uploading profile image for user {user_id}: {e}")
            return {
                "success": False,
                "error": "internal_error",
                "message": "Failed to upload profile image"
            }, 500

    def upload_header_image(
        self,
        user_id: int,
        file
    ) -> Tuple[Dict[str, Any], int]:
        """
        Upload and update user header/cover image.
        
        Args:
            user_id: ID of authenticated user
            file: Uploaded file from request.files
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        from modules.auth_v2.utils.image_upload import upload_to_cloudinary
        
        try:
            # Check user exists
            user = self.user_repo.find_by_id(user_id)
            if not user:
                return {
                    "success": False,
                    "error": "user_not_found",
                    "message": "User not found"
                }, 404
            
            # Upload to Cloudinary
            image_url, error = upload_to_cloudinary(
                file,
                folder="header_images",
                public_id=f"user_{user_id}_header"
            )
            
            if error:
                return {
                    "success": False,
                    "error": "upload_failed",
                    "message": error
                }, 400
            
            # Update user header_image
            success = self.user_repo.update_user(user_id, header_image=image_url)
            
            if not success:
                return {
                    "success": False,
                    "error": "update_failed",
                    "message": "Failed to update header image"
                }, 500
            
            logger.info(f"Header image updated for user {user_id}")
            
            return {
                "success": True,
                "message": "Header image uploaded successfully",
                "data": {
                    "header_image": image_url
                }
            }, 200
            
        except Exception as e:
            logger.error(f"Error uploading header image for user {user_id}: {e}")
            return {
                "success": False,
                "error": "internal_error",
                "message": "Failed to upload header image"
            }, 500
