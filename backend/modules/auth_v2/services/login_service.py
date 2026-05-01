"""
Login Service - Handles user authentication

Single Responsibility: User login only
"""

from typing import Tuple, Dict
from datetime import datetime
from flask import request
from flask_login import login_user
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService
from modules.auth_v2.services.otp_service import OTPService
from modules.auth_v2.services.email_service import EmailService
from modules.auth_v2.services.token_service import TokenService


class LoginService:
    """Handles user login logic"""

    PLATFORM_STAFF_ROLES = {"super_admin", "support", "moderator", "finance", "ops"}
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.password_service = PasswordService()
        self.otp_service = OTPService()
        self.email_service = EmailService()
        self.token_service = TokenService()

    def _build_portal_access(self, user) -> Dict:
        """Build portal routing metadata from platform role."""
        role = getattr(user, "role", None)
        is_platform_staff = role in self.PLATFORM_STAFF_ROLES
        return {
            "platform_admin": is_platform_staff,
            "platform_role": role if is_platform_staff else None,
            "recommended_portal": "admin" if is_platform_staff else "app",
        }
    
    def login(self, email: str, password: str, remember: bool = False) -> Tuple[Dict, int]:
        """
        Authenticate user and create session
        
        Args:
            email: User's email
            password: User's password
            remember: Keep user logged in (default: False)
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        # Find user by email
        user = self.user_repo.find_by_email(email)
        
        if not user:
            return {
                "error": "Invalid email or password",
                "code": "INVALID_CREDENTIALS"
            }, 401
        
        # Verify password
        if not self.password_service.verify_password(password, user.password_hash):
            return {
                "error": "Invalid email or password",
                "code": "INVALID_CREDENTIALS"
            }, 401

        # Block inactive users
        if hasattr(user, "is_active") and not user.is_active:
            return {
                "error": "Account is inactive. Please contact support.",
                "code": "ACCOUNT_INACTIVE",
            }, 403
        
        # Check if email is verified
        if not user.email_verified:
            return {
                "error": "Please verify your email before logging in",
                "code": "EMAIL_NOT_VERIFIED",
                "user_id": user.id
            }, 403
        
        # Create Flask-Login session directly (no OTP required)
        login_user(user, remember=remember)
        
        # Generate tokens for mobile/API access
        tokens = self.token_service.generate_tokens(user.id, user.email)
        
        return {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "full_name": user.full_name,
                "role": user.role,
                "email_verified": user.email_verified
            },
            "verification": {
                "bvn_verified": user.bvn_verified,
                "nin_verified": user.nin_verified,
                "verification_status": user.verification_status
            },
            "portal_access": self._build_portal_access(user),
            "tokens": tokens
        }, 200
    
    def verify_login_otp(self, email: str, otp: str, remember: bool = False) -> Tuple[Dict, int]:
        """
        Verify login OTP and create session
        
        Args:
            email: User's email
            otp: 6-digit OTP
            remember: Keep user logged in
            
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
        
        # Verify OTP
        is_valid, message = self.otp_service.verify_otp(email, otp, otp_type="login")
        
        if not is_valid:
            return {
                "error": message,
                "code": "INVALID_OTP"
            }, 400
        
        # Create Flask-Login session
        login_user(user, remember=remember)
        
        # Generate tokens for mobile/API access
        tokens = self.token_service.generate_tokens(user.id, user.email)
        
        return {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "full_name": user.full_name,
                "role": user.role,
                "email_verified": user.email_verified
            },
            "verification": {
                "bvn_verified": user.bvn_verified,
                "nin_verified": user.nin_verified,
                "verification_status": user.verification_status
            },
            "portal_access": self._build_portal_access(user),
            "tokens": tokens
        }, 200
