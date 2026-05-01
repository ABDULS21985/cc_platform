"""
Signup Service - Handles user registration

Single Responsibility: User signup only
"""

from typing import Tuple, Dict
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService
from modules.auth_v2.services.otp_service import OTPService
from modules.auth_v2.services.email_service import EmailService


class SignupService:
    """Handles user registration logic"""
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.password_service = PasswordService()
        self.otp_service = OTPService()
        self.email_service = EmailService()
    
    def signup(self, user_data: Dict) -> Tuple[Dict, int]:
        """
        Register a new user
        
        Args:
            user_data: Dictionary with firstname, lastname, email, password, etc.
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        # Check if email already exists
        existing_user = self.user_repo.find_by_email(user_data['email'])
        if existing_user:
            # Option B: if the user exists but hasn't verified email yet,
            # treat signup as an OTP resend flow (do not create a new account).
            if not getattr(existing_user, "email_verified", False):
                otp = self.otp_service.resend_otp(existing_user.email, otp_type="signup")
                if not otp:
                    return {
                        "error": "Please wait at least 1 minute before requesting a new code",
                        "code": "TOO_SOON",
                    }, 429

                email_sent = self.email_service.send_signup_otp(
                    existing_user.email,
                    existing_user.firstname,
                    existing_user.lastname,
                    otp,
                )

                return {
                    "message": "Account already exists but email is not verified. Verification code resent.",
                    "user_id": existing_user.id,
                    "email": existing_user.email,
                    "email_sent": email_sent,
                    "next_step": "verify_email",
                }, 200

            return {
                "error": "User with this email already exists",
                "code": "EMAIL_EXISTS"
            }, 409
        
        # Hash password
        password_hash = self.password_service.hash_password(user_data['password'])
        
        # Create user (email not verified yet)
        user = self.user_repo.create_user(
            email=user_data['email'],
            firstname=user_data['firstname'],
            lastname=user_data['lastname'],
            password_hash=password_hash,
            date_of_birth=user_data.get('date_of_birth'),
            phone_number=user_data.get('phone_number'),
            nin=user_data.get('nin')
        )
        
        if not user:
            return {
                "error": "Failed to create user",
                "code": "CREATION_FAILED"
            }, 500
        
        # Generate and send OTP
        otp = self.otp_service.create_otp(user.email, otp_type="signup", expiry_minutes=10)
        email_sent = self.email_service.send_signup_otp(
            user.email,
            user.firstname,
            user.lastname,
            otp
        )
        
        return {
            "message": "User registered successfully. Please check your email for verification code.",
            "user_id": user.id,
            "email": user.email,
            "email_sent": email_sent,
            "next_step": "verify_email"
        }, 201
