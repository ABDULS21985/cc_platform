"""
Token Service - JWT token generation and management

Handles access and refresh tokens.
"""
import logging
from datetime import timedelta
from typing import Tuple, Optional
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from jwt.exceptions import ExpiredSignatureError, DecodeError, InvalidTokenError
from modules.auth_v2.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


class TokenService:
    """Handles JWT token operations"""

    def __init__(self):
        self.user_repo = UserRepository()

    @staticmethod
    def generate_tokens(user_id: int, email: str) -> dict:
        """
        Generate access and refresh tokens for a user
        
        Args:
            user_id: User's ID
            email: User's email
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        identity = str(user_id)
        additional_claims = {
            "user_id": user_id,
            "email": email
        }
        
        access_token = create_access_token(
            identity=identity,
            additional_claims=additional_claims,
            expires_delta=timedelta(hours=1)  # 1 hour
        )
        
        refresh_token = create_refresh_token(
            identity=identity,
            additional_claims=additional_claims,
            expires_delta=timedelta(days=30)  # 30 days
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 3600  # 1 hour in seconds
        }

    def validate_token(self, token: str) -> Tuple[Optional[object], Optional[str]]:
        """
        Validate JWT token and return user object

        Args:
            token: JWT access token string

        Returns:
            Tuple of (User object or None, error message or None)
        """
        try:
            # Decode and verify token
            decoded = decode_token(token)

            identity = decoded.get('sub')
            user_id = None
            
            if isinstance(identity, dict):
                user_id = identity.get('user_id')
            elif isinstance(identity, str):
                try:
                    user_id = int(identity)
                except (ValueError, TypeError):
                    user_id = decoded.get('user_id')
            
            if not user_id:
                logger.warning(f"Token missing user_id. Identity: {identity}")
                return None, "Invalid token: missing user_id"

            # Fetch user from database
            user = self.user_repo.find_by_id(user_id)
            if not user:
                logger.warning(f"User {user_id} not found from token")
                return None, "User not found"

            return user, None

        except ExpiredSignatureError:
            logger.info("Token expired")
            return None, "Token has expired"
        except (DecodeError, InvalidTokenError) as e:
            logger.warning(f"Token decode error: {str(e)}")
            return None, "Invalid token"
        except Exception as e:
            logger.error(f"Unexpected error validating token: {str(e)}", exc_info=True)
            return None, "Token validation failed"
