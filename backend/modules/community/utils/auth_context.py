"""Helpers for community resource auth context resolution."""

from flask import request
from flask_login import current_user as flask_current_user

from modules.auth_v2.services.token_service import TokenService


def resolve_optional_user_id():
    """Resolve user ID from session/JWT without requiring authentication."""
    if flask_current_user.is_authenticated:
        return flask_current_user.id

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    try:
        token = auth_header.split(" ")[1]
    except IndexError:
        return None

    user, error = TokenService().validate_token(token)
    if error or not user:
        return None

    return user.id