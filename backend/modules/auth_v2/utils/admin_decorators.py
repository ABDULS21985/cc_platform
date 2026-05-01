"""
Admin Authorization Decorators

Provides decorators for platform admin/staff access control.

Design goals:
- Reuse existing hybrid auth approach (session OR JWT bearer token)
- Keep resources thin: decorators should attach `current_user`
"""

import logging
from functools import wraps
from typing import Iterable, Optional

from flask import request
from flask_login import current_user as flask_current_user

from modules.auth_v2.services.token_service import TokenService
from modules.core.response_formatter import format_error, format_forbidden

logger = logging.getLogger(__name__)


def _resolve_authenticated_user():
    """Resolve user from session or Authorization bearer token."""
    if flask_current_user.is_authenticated:
        return flask_current_user, None

    if "Authorization" not in request.headers:
        return None, "Authentication required"

    auth_header = request.headers.get("Authorization", "")
    try:
        token = auth_header.split(" ")[1]
    except IndexError:
        return None, "Invalid authorization header format"

    try:
        token_service = TokenService()
        user, error = token_service.validate_token(token)
        if error or not user:
            return None, error or "Invalid or expired token"
        return user, None
    except Exception as e:
        logger.error("Token validation exception", exc_info=True)
        return None, f"Token validation failed: {str(e)}"


def platform_admin_required(allowed_roles: Optional[Iterable[str]] = None):
    """
    Require an authenticated platform admin/staff user.

    Args:
        allowed_roles: roles allowed for access. If None, defaults to ('super_admin',).

    Notes:
        - Uses User.role for platform roles.
        - Passes authenticated user as kwarg `current_user` for MethodViews.
    """

    allowed = tuple(allowed_roles) if allowed_roles is not None else ("super_admin",)

    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user, error = _resolve_authenticated_user()
            if not user:
                return format_error("unauthorized", error, 401)

            if getattr(user, "role", None) not in allowed:
                return format_forbidden("Admin access required")

            if hasattr(user, "is_active") and not user.is_active:
                return format_forbidden("Account is inactive")

            kwargs["current_user"] = user
            return f(*args, **kwargs)

        return wrapped

    return decorator

