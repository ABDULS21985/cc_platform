from functools import wraps
from flask import session, jsonify, request, g
from datetime import datetime, timedelta
import uuid
import redis  # For rate limiting
from werkzeug.exceptions import TooManyRequests

# Initialize Redis connection (configure in your app factory)
redis_conn = None


def init_redis(app):
    """Initialize Redis connection for rate limiting"""
    global redis_conn
    redis_conn = redis.Redis(
        host=app.config.get("REDIS_HOST", "localhost"),
        port=app.config.get("REDIS_PORT", 6379),
        db=app.config.get("REDIS_DB", 0),
        decode_responses=True,
    )


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return decorated_function


def rate_limit(per_minute=30, scope=None):
    """Rate limiting decorator with Redis backend

    Args:
        per_minute (int): Maximum allowed requests per minute
        scope (str/callable): Key scope for rate limiting (defaults to endpoint)
    """

    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not redis_conn:
                raise RuntimeError("Redis not initialized for rate limiting")

            # Determine the rate limit key
            key = f"rate_limit:{request.endpoint}"
            if scope:
                key = f"rate_limit:{scope() if callable(scope) else scope}"

            # Get current count
            current = redis_conn.get(key)
            if current is None:
                redis_conn.setex(key, 60, 1)  # Expire in 60 seconds
            elif int(current) >= per_minute:
                raise TooManyRequests("Rate limit exceeded")
            else:
                redis_conn.incr(key)

            return f(*args, **kwargs)

        return wrapped

    return decorator


def validate_uuid(uuid_string):
    """Validate a UUID string

    Args:
        uuid_string (str): The UUID to validate

    Returns:
        bool: True if valid, False otherwise
    """
    try:
        uuid.UUID(str(uuid_string))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def jwt_required(f):
    """JWT authentication decorator (compatible with Flask-JWT-Extended)"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session and not getattr(g, "jwt_authenticated", False):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return decorated_function


def admin_required(f):
    """Require admin privileges"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("is_admin", False):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated_function

