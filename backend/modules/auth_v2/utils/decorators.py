"""
Authentication Decorators
Provides decorators for token-based authentication.
"""
import logging
from functools import wraps
from flask import request, jsonify
from flask_login import current_user
from modules.auth_v2.services.token_service import TokenService
from modules.core.response_formatter import format_error

logger = logging.getLogger(__name__)


def token_required(f):
    """
    Unified authentication decorator - supports BOTH session and JWT auth.

    Priority:
    1. Check Flask-Login session (for web users)
    2. Check JWT token in Authorization header (for mobile users)

    Usage: Works for web (session cookies) AND mobile (JWT tokens)
    
    Note: Passes user as keyword argument 'current_user' to support Flask-Smorest MethodViews
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user = None

        # Priority 1: Check if user is authenticated via Flask-Login session (web)
        if current_user.is_authenticated:
            user = current_user

        # Priority 2: Check for JWT token in Authorization header (mobile)
        elif 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return format_error('unauthorized', 'Invalid authorization header format', 401)

            try:
                # Validate JWT token
                token_service = TokenService()
                user, error = token_service.validate_token(token)

                if error or not user:
                    logger.warning(f"Token validation failed: {error}")
                    return format_error('unauthorized', error or 'Invalid or expired token', 401)

            except Exception as e:
                logger.error(f"Token validation exception: {str(e)}", exc_info=True)
                return format_error('unauthorized', f'Token validation failed: {str(e)}', 401)

        # No valid authentication found
        if not user:
            return format_error('unauthorized', 'Authentication required. Please login or provide a valid token.', 401)

        # Pass authenticated user as keyword argument to endpoint
        kwargs['current_user'] = user
        return f(*args, **kwargs)

    return decorated
