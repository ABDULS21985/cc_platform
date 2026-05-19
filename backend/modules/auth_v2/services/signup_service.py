"""
Signup Service - Handles user registration

Single Responsibility: User signup only
"""

from typing import Tuple, Dict
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService


class SignupService:
    """Handles user registration logic"""
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.password_service = PasswordService()
    
    def signup(self, user_data: Dict) -> Tuple[Dict, int]:
        """
        Register a new user
        
        Args:
            user_data: Dictionary with firstname, lastname, phone_number, password, etc.
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        phone_number = self.user_repo.normalize_phone_number(user_data.get('phone_number'))
        if not phone_number:
            return {
                "error": "Phone number is required",
                "code": "PHONE_REQUIRED"
            }, 400
        
        existing_phone_user = self.user_repo.find_by_phone_number(phone_number)
        if existing_phone_user:
            return {
                "error": "User with this phone number already exists",
                "code": "PHONE_EXISTS"
            }, 409
        
        email = user_data.get('email')
        if email:
            existing_user = self.user_repo.find_by_email(email)
            if existing_user:
                return {
                    "error": "User with this email already exists",
                    "code": "EMAIL_EXISTS"
                }, 409
        
        # Hash password
        password_hash = self.password_service.hash_password(user_data['password'])
        
        # Create user. Email verification no longer blocks first login; identity
        # verification is handled after login from the dashboard.
        user = self.user_repo.create_user(
            email=email,
            firstname=user_data['firstname'],
            lastname=user_data['lastname'],
            password_hash=password_hash,
            date_of_birth=user_data.get('date_of_birth'),
            phone_number=phone_number,
            nin=user_data.get('nin'),
            email_verified=False
        )
        
        if not user:
            return {
                "error": "Failed to create user",
                "code": "CREATION_FAILED"
            }, 500
        
        return {
            "message": "User registered successfully. Please sign in to continue.",
            "user_id": user.id,
            "email": user.email,
            "phone_number": user.phone_number,
            "next_step": "login"
        }, 201
