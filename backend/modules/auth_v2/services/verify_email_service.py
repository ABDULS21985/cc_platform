"""
Verify Email Service - Handles email verification with OTP

Single Responsibility: Email verification only
"""

from typing import Tuple, Dict
from datetime import datetime
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.otp_service import OTPService
from modules.auth_v2.services.email_service import EmailService


class VerifyEmailService:
    """Handles email verification logic"""
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.otp_service = OTPService()
        self.email_service = EmailService()
    
    def verify_email(self, email: str, otp: str) -> Tuple[Dict, int]:
        """
        Verify email with OTP
        
        Args:
            email: User's email
            otp: 6-digit OTP
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        # Find user
        user = self.user_repo.find_by_email(email)
        if not user:
            return {
                "error": "User not found",
                "code": "USER_NOT_FOUND"
            }, 404
        
        # Check if already verified
        if user.email_verified:
            return {
                "message": "Email already verified",
                "code": "ALREADY_VERIFIED"
            }, 200
        
        # Verify OTP
        is_valid, message = self.otp_service.verify_otp(email, otp, otp_type="signup")
        
        if not is_valid:
            return {
                "error": message,
                "code": "INVALID_OTP"
            }, 400
        
        # Mark email as verified
        success = self.user_repo.verify_email(user.id)
        if not success:
            return {
                "error": "Failed to verify email",
                "code": "VERIFICATION_FAILED"
            }, 500
        
        # Send welcome email
        created_at = user.created_at.strftime("%B %d, %Y at %I:%M %p") if user.created_at else "Recently"
        self.email_service.send_welcome_email(
            user.email,
            user.firstname,
            user.lastname,
            created_at
        )

        # Best-effort: drop a welcome notification + audit row for the new user.
        try:
            from modules.notifications.services.notification_service import NotificationService
            from modules.audit.services.audit_service import AuditService
            NotificationService().create_for_user(
                user_id=user.id,
                title=f"Welcome, {user.firstname}!",
                body="Verify your identity to unlock the wallet, then join a community to start collecting bills together.",
                category='system',
                source='CCPay',
                action_href='/dashboard/wallet',
                action_label='Verify identity',
            )
            AuditService().record(
                user_id=user.id,
                action='Account verified',
                details='Email confirmed via OTP',
                category='security',
                severity='info',
                actor='You',
            )
        except Exception:
            pass

        return {
            "message": "Email verified successfully! Welcome to CCPay.",
            "user": {
                "id": user.id,
                "email": user.email,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "email_verified": True
            }
        }, 200
    
    def resend_otp(self, email: str) -> Tuple[Dict, int]:
        """
        Resend verification OTP
        
        Args:
            email: User's email
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        # Find user
        user = self.user_repo.find_by_email(email)
        if not user:
            return {
                "error": "User not found",
                "code": "USER_NOT_FOUND"
            }, 404
        
        # Check if already verified
        if user.email_verified:
            return {
                "message": "Email already verified",
                "code": "ALREADY_VERIFIED"
            }, 200
        
        # Generate new OTP
        otp = self.otp_service.resend_otp(email, otp_type="signup")
        
        if not otp:
            return {
                "error": "Please wait at least 1 minute before requesting a new code",
                "code": "TOO_SOON"
            }, 429
        
        # Send OTP email
        email_sent = self.email_service.send_signup_otp(
            user.email,
            user.firstname,
            user.lastname,
            otp
        )
        
        if not email_sent:
            return {
                "error": "Failed to send verification email",
                "code": "EMAIL_FAILED"
            }, 500
        
        return {
            "message": "Verification code resent successfully",
            "email": user.email
        }, 200
