"""
Logout Service - Handles user logout

Single Responsibility: User logout only
"""

from typing import Tuple, Dict
from flask_login import logout_user, current_user


class LogoutService:
    """Handles user logout logic"""
    
    @staticmethod
    def logout() -> Tuple[Dict, int]:
        """
        Log out current user and destroy session
        
        Returns:
            Tuple of (response_dict, status_code)
        """
        if not current_user.is_authenticated:
            return {
                "error": "No user is currently logged in",
                "code": "NOT_AUTHENTICATED"
            }, 401
        
        # Get user info before logout
        user_email = current_user.email
        
        # Destroy Flask-Login session
        logout_user()
        
        return {
            "message": "Logout successful",
            "email": user_email
        }, 200
