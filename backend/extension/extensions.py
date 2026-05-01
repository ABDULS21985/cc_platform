import os
from flask_mail import Mail
import redis
from flask import current_app
import cloudinary
from flask_socketio import SocketIO
from socketio import RedisManager as SocketIORedisManager

# Initialize Mail
mail = Mail()

# Redis client for general caching
redis_client = None

# Socket.IO instance with lazy initialization
_socketio_instance = None
_redis_initialized = False


def init_redis(app):
    """Initialize Redis connection with fallback logic"""
    global redis_client, _socketio_instance, _redis_initialized

    urls_to_try = [
        os.getenv("REDIS_URL"),  # Production Redis from environment
        os.getenv("REDIS_FALLBACK_URL"),  # Optional fallback URL
        None,  # Don't fallback to localhost in production
    ]

    active_redis_url = None

    for url in urls_to_try:
        if not url:
            continue

        try:
            app.logger.debug(f"Attempting Redis connection to {url}")
            test_client = redis.StrictRedis.from_url(url, socket_connect_timeout=3)
            test_client.ping()

            # Must declare global again to modify the global variable
            redis_client = test_client
            active_redis_url = url
            app.logger.info(f"Connected to Redis at {url}")
            break

        except (redis.ConnectionError, redis.TimeoutError) as e:
            app.logger.warning(f"Redis connection failed to {url}: {str(e)}")
            continue

    if not redis_client:
        app.logger.warning("All Redis connection attempts failed - using Socket.IO without Redis message queue")
        # Create SocketIO without Redis (single-server mode with eventlet)
        _socketio_instance = SocketIO(
            async_mode="eventlet",
            logger=app.logger,
            engineio_logger=False,
            cors_allowed_origins="*",
        )
        _redis_initialized = True
        return

    # Initialize Socket.IO configuration with Redis (multi-server mode)
    try:
        app.logger.info(f"Configuring Socket.IO with Redis at {active_redis_url}")
        _socketio_instance = SocketIO(
            client_manager=SocketIORedisManager(active_redis_url),
            async_mode="eventlet",
            logger=app.logger,
            engineio_logger=app.logger,
            cors_allowed_origins="*",
        )
        _redis_initialized = True
    except Exception as e:
        app.logger.error(f"Socket.IO configuration failed: {str(e)}")
        raise


def get_socketio(app=None):
    """Get or initialize Socket.IO instance"""
    global _socketio_instance

    if not _redis_initialized:
        raise RuntimeError("Must call init_redis() first")

    if app and _socketio_instance and not _socketio_instance.server:
        _socketio_instance.init_app(app)

    return _socketio_instance


def init_cloudinary(app):
    """Initialize Cloudinary configuration"""
    try:
        cloudinary.config(
            cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
            api_key=app.config["CLOUDINARY_API_KEY"],
            api_secret=app.config["CLOUDINARY_API_SECRET"],
            secure=True,
        )
        app.logger.info("Cloudinary configured successfully")
    except Exception as e:
        app.logger.error(f"Cloudinary configuration failed: {str(e)}")
        raise
