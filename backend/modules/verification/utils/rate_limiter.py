"""
Rate Limiter - Prevent abuse of verification endpoints
Uses Redis for distributed rate limiting across multiple servers
"""
from functools import wraps
from flask import request, jsonify
from flask_login import current_user
import os
import extension.extensions as ext
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)


def rate_limit(max_requests: int, window_minutes: int = 60, key_prefix: str = "rate_limit"):
    """
    Rate limit decorator using Redis for distributed rate limiting

    Tracks requests per user (if authenticated) or IP address and enforces limits
    using Redis with automatic expiration.

    Args:
        max_requests: Maximum requests allowed in the time window
        window_minutes: Time window duration in minutes
        key_prefix: Redis key prefix for namespacing different rate limits

    Usage:
        @rate_limit(max_requests=3, window_minutes=1440, key_prefix="bvn_verify")
        def verify_bvn():
            pass

    Returns:
        429 Too Many Requests if limit exceeded
        Proceeds to wrapped function if within limit

    Features:
        - Per-user rate limiting (user_id or IP address)
        - Automatic key expiration
        - Graceful degradation if Redis unavailable
        - Detailed logging for monitoring
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # In local development, rate limiting makes iterative testing painful.
            # Keep it enabled in production, but bypass in non-production.
            # NOTE: `ENV` defaults to "development" in config.py if not provided.
            if str(os.getenv("ENV", "development")).lower() != "production":
                return f(*args, **kwargs)

            if not ext.redis_client:
                logger.warning("Rate limiting skipped - Redis not available")
                return f(*args, **kwargs)

            injected_user = kwargs.get('current_user')
            if injected_user is not None:
                user_id = injected_user.id
            elif current_user.is_authenticated:
                user_id = current_user.id
            else:
                user_id = request.remote_addr

            rate_key = f"{key_prefix}:{user_id}:{f.__name__}"

            try:
                current_count = ext.redis_client.get(rate_key)

                if current_count is None:
                    ext.redis_client.setex(
                        rate_key,
                        timedelta(minutes=window_minutes),
                        1
                    )
                    logger.debug(f"Rate limit started for {rate_key}: 1/{max_requests}")
                    return f(*args, **kwargs)

                current_count = int(current_count)

                if current_count >= max_requests:
                    ttl = ext.redis_client.ttl(rate_key)
                    logger.warning(
                        f"Rate limit exceeded for {rate_key}: "
                        f"{current_count}/{max_requests}. "
                        f"Resets in {ttl}s"
                    )
                    return jsonify({
                        'success': False,
                        'error': 'rate_limit_exceeded',
                        'message': f'Too many requests. Please try again in {ttl // 60} minutes.',
                        'retry_after_seconds': ttl
                    }), 429

                ext.redis_client.incr(rate_key)
                logger.debug(f"Rate limit count for {rate_key}: {current_count + 1}/{max_requests}")

                return f(*args, **kwargs)

            except Exception as e:
                logger.error(f"Rate limiting error: {str(e)}")
                return f(*args, **kwargs)

        return wrapped
    return decorator
