"""
Auth Service - Core Authentication Business Logic

This is where the magic happens. All auth logic lives here.
Routes call this service, service calls repository.
"""
import logging
from typing import Dict, Any, Tuple
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService
from modules.auth_v2.services.token_service import TokenService

logger = logging.getLogger(__name__)


class AuthService:
    """Core authentication business logic"""
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.password_service = PasswordService()
        self.token_service = TokenService()
    
    def signup(self, user_data: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
        """
        Register a new user
        
        Args:
            user_data: Validated user signup data
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        try:
            existing_user = self.user_repo.find_by_email(user_data['email'])
            if existing_user:
                return {
                    "error": "User with this email already exists",
                    "code": "EMAIL_EXISTS"
                }, 409
            
            password_hash = self.password_service.hash_password(user_data['password'])
            user = self.user_repo.create_user(
                email=user_data['email'],
                firstname=user_data['firstname'],
                lastname=user_data['lastname'],
                password_hash=password_hash,
                date_of_birth=user_data.get('date_of_birth'),
                phone_number=user_data.get('phone_number'),
                nin=user_data.get('nin'),
                role=user_data.get('role', 'user')
            )
            
            logger.info(f"User created successfully: {user.id}")
            
            return {
                "message": "User registered successfully",
                "user_id": user.id,
                "email": user.email,
                "next_step": "Please verify your email"
            }, 201
            
        except Exception as e:
            logger.error(f"Signup error: {e}")
            return {
                "error": "Failed to create user",
                "details": str(e)
            }, 500
    
    def login(self, email: str, password: str) -> Tuple[Dict[str, Any], int]:
        """
        Authenticate user and generate tokens
        
        Args:
            email: User's email
            password: User's password
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        try:
            # Find user (returns ORM object)
            user = self.user_repo.find_by_email(email)
            if not user:
                return {
                    "error": "Invalid email or password",
                    "code": "INVALID_CREDENTIALS"
                }, 401
            
            # Verify password (access ORM attributes directly)
            if not self.password_service.verify_password(password, user.password_hash):
                return {
                    "error": "Invalid email or password",
                    "code": "INVALID_CREDENTIALS"
                }, 401
            
            # Check if email is verified (clean Python property access)
            if not user.email_verified:
                return {
                    "error": "Please verify your email before logging in",
                    "code": "EMAIL_NOT_VERIFIED"
                }, 403
            
            # Generate tokens
            tokens = self.token_service.generate_tokens(user.id, user.email)
            
            logger.info(f"User logged in successfully: {user.id}")
            
            return {
                "message": "Login successful",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "firstname": user.firstname,
                    "lastname": user.lastname,
                    "full_name": user.full_name,
                    "role": user.role,
                },
                **tokens
            }, 200
            
        except Exception as e:
            logger.error(f"Login error: {e}")
            return {
                "error": "Login failed",
                "details": str(e)
            }, 500
    
    def get_user_by_id(self, user_id: int) -> Tuple[Dict[str, Any], int]:
        """
        Get user details by ID
        
        Args:
            user_id: User's ID
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        try:
            user = self.user_repo.find_by_id(user_id)
            if not user:
                return {
                    "error": "User not found",
                    "code": "USER_NOT_FOUND"
                }, 404
            
            # Use ORM's to_dict method (excludes password by default)
            return {"user": user.to_dict()}, 200
            
        except Exception as e:
            logger.error(f"Get user error: {e}")
            return {
                "error": "Failed to retrieve user",
                "details": str(e)
            }, 500
