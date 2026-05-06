import logging
import os
import sys
import warnings


def _should_patch_eventlet() -> bool:
    """Skip monkey patching for Flask CLI commands (e.g., flask db upgrade)."""
    argv0 = os.path.basename(sys.argv[0]) if sys.argv else ''
    is_flask_cli = argv0 == 'flask' or argv0.endswith('/flask')
    return not is_flask_cli


if _should_patch_eventlet():
    # eventlet's greendns can cause intermittent DNS timeouts (especially with systemd-resolved / 127.0.0.53).
    # Disable it so requests/urllib3 use the system resolver normally.
    os.environ.setdefault("EVENTLET_NO_GREENDNS", "yes")
    import eventlet
    eventlet.monkey_patch()

# Suppress eventlet patcher warnings during monkey patching
warnings.filterwarnings('ignore', category=RuntimeWarning, message='.*monkey.patch.*')
logging.getLogger('eventlet.patcher').setLevel(logging.ERROR)

from flask import Flask, jsonify
from flask_cors import CORS
from flasgger import Swagger
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_session import Session
from flask_wtf.csrf import CSRFProtect
from flask_smorest import Api

logger = logging.getLogger(__name__)

def _parse_allowed_origins() -> list[str]:
    """
    Parse comma-separated allowed origins from env.

    NOTE: Browsers reject `Access-Control-Allow-Origin: *` when credentials are enabled.
    """
    raw = (os.getenv("ALLOWED_ORIGINS") or os.getenv("FRONTEND_URL") or "").strip()
    if not raw:
        return ["*"]
    origins = [o.strip() for o in raw.split(",") if o and o.strip()]
    return origins or ["*"]



def create_app():
    """
    Application Factory - Create and configure Flask app
    
    Follows SOLID principles:
    - Single Responsibility: Initialize app and register extensions
    - Clean layers: Flask → Config → Extensions → Database → Cache → Blueprints
    - Dependency Injection: Extensions initialized via init_app()
    
    Layers:
    1. Initialize Flask instance
    2. Load configuration
    3. Setup extensions (mail, CORS, JWT, etc)
    4. Setup database (SQLAlchemy, Flask-Login, Flask-Migrate)
    5. Setup caching/sessions (Redis)
    6. Register WebSocket handlers
    7. Register Flask-Smorest resources
    8. Return configured app
    """
    try:
        # ========== LAYER 1: Initialize Flask ==========
        app = Flask(__name__)
        allowed_origins = _parse_allowed_origins()
        allow_all = len(allowed_origins) == 1 and allowed_origins[0] == "*"
        # Browsers reject `Access-Control-Allow-Origin: *` when credentials are enabled.
        # Default to localhost dev origins when ALLOWED_ORIGINS isn't set so the
        # frontend's `withCredentials: true` requests pass preflight.
        if allow_all:
            allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
        CORS(
            app,
            resources={r"/*": {"origins": allowed_origins}},
            supports_credentials=True,
            expose_headers=["Content-Type", "X-Request-ID"],
            allow_headers=["Content-Type", "Authorization", "X-Request-ID", "X-CSRF-Token"],
        )
        logger.info(f"✓ Flask app created and CORS configured for origins={allowed_origins}")
        
        # ========== LAYER 2: Load Configuration ==========
        from config import Config
        app.config.from_object(Config)
        logger.info(f"✓ Config loaded: ENV={app.config.get('ENV', 'development')}")
        if app.config.get('ENFORCE_PRODUCTION_READINESS'):
            from modules.core.production_readiness import assert_runtime_config_ready
            assert_runtime_config_ready(Config)
            logger.info("✓ Production readiness configuration checks passed")
        
        # ========== LAYER 3: Setup Extensions ==========
        # Initialize Swagger configuration (must be done before creating Swagger instance)
        from modules.config.swagger_config import get_swagger_template, get_swagger_config
        swagger_template = get_swagger_template(
            env=app.config.get('ENV', 'development'),
            api_host=app.config.get('API_HOST')
        )
        swagger_config = get_swagger_config()
        
        # Swagger API documentation
        Swagger(
            app,
            config=swagger_config,
            template=swagger_template
        )
        logger.info("✓ Swagger configured and initialized")
        
        # JWT authentication
        JWTManager(app)
        
        # Session management - Only use Flask-Session with Redis in production
        # For development on Windows without Redis, Flask's built-in cookie sessions are used
        redis_url = app.config.get('REDIS_URL')
        logger.info(f"REDIS_URL config: {redis_url[:50] if redis_url else 'NOT SET'}...")

        if app.config.get('PRODUCTION') or app.config.get('SESSION_TYPE') == 'redis':
            if not redis_url:
                if app.config.get('PRODUCTION'):
                    raise RuntimeError("REDIS_URL is required in production")
                logger.error("SESSION_TYPE=redis but REDIS_URL not set. Falling back to filesystem sessions.")
                app.config['SESSION_TYPE'] = 'filesystem'
            else:
                # Ensure Flask-Session uses the correct Redis URL.
                # IMPORTANT: If Redis is unreachable/misconfigured (TLS issues, wrong port, firewall),
                # Flask-Session can throw during request session open and break the entire app.
                # We proactively ping Redis here and fall back to filesystem sessions if it fails.
                import redis as redis_lib
                try:
                    session_redis = redis_lib.from_url(redis_url, socket_connect_timeout=3)
                    session_redis.ping()
                    app.config['SESSION_REDIS'] = session_redis
                    Session(app)
                    logger.info(f"✓ Flask-Session initialized with Redis: {redis_url[:50]}...")
                except Exception as e:
                    if app.config.get('PRODUCTION'):
                        raise RuntimeError(
                            f"Redis session backend unavailable in production: {type(e).__name__}: {e}"
                        ) from e
                    logger.error(
                        f"Redis session backend unavailable ({type(e).__name__}): {e}. "
                        "Falling back to filesystem sessions."
                    )
                    app.config['SESSION_TYPE'] = 'filesystem'
        else:
            logger.info("✓ Using Flask built-in cookie sessions (development mode)")
        
        # CSRF protection
        CSRFProtect(app)
        
        logger.info("✓ Extensions initialized: Swagger, JWT, Session, CSRF")
        
        # ========== LAYER 4: Setup Database ==========
        # Build database URI from individual environment variables
        db_host = os.getenv("DB_HOST", "localhost")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "")
        db_name = os.getenv("DB_NAME", "ccp_db")
        db_port = os.getenv("DB_PORT", "5432")
        db_sslmode = os.getenv("DB_SSLMODE", "prefer")
        
        database_uri = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?sslmode={db_sslmode}"
        app.config["SQLALCHEMY_DATABASE_URI"] = database_uri
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_pre_ping": True,
            "pool_size": 10,
            "max_overflow": 20
        }
        
        from modules.auth_v2.extensions import db, login_manager
        db.init_app(app)
        login_manager.init_app(app)
        Migrate(app, db, directory='flask_migrations')
        
        logger.info("✓ Database configured: SQLAlchemy, Flask-Login, Flask-Migrate")
        
        # IMPORTANT: Import all models BEFORE creating migrations
        # This allows Flask-Migrate to detect all table changes
        try:
            from modules.auth_v2.models.user import User
            from modules.verification.models.verification import UserVerification
            from modules.wallet.models.wallet import Wallet
            from modules.wallet.models.wallet_transaction import WalletTransaction
            from modules.wallet.models.wallet_beneficiary import WalletBeneficiary
            from modules.community.models import (
                Community,
                CommunityMember,
                CommunityWallet,
                Interest,
                community_interests,
                Bill,
                BillSession,
                CommunityPost,
                CommunityPostMention,
                CommunityPostComment,
                CommunityPostReaction,
                Institution,
                Organization,
                InstitutionMember,
            )
            from modules.notifications.models import Notification, NotificationPreference, CommunityMute
            from modules.bookmarks.models import Bookmark
            from modules.events.models import Event, EventAttendee
            from modules.audit.models import AuditEvent
            logger.info("✓ All models imported for migration detection")
        except ImportError as e:
            logger.error(f"✗ Failed to import models: {str(e)}")
            raise
        
        # ========== LAYER 5: Setup Caching & Sessions ==========
        from extension.extensions import mail, init_redis, init_cloudinary, get_socketio
        
        # Email service
        mail.init_app(app)
        
        # Redis/caching
        init_redis(app)
        init_cloudinary(app)
        socketio = get_socketio(app)
        
        logger.info("✓ Caching and sessions configured: Redis, Cloudinary, Mail, SocketIO")
        
        # ========== LAYER 6: Register WebSocket Handlers ==========
        from socket_events import register_socket_events
        register_socket_events(socketio)
        logger.info("✓ WebSocket handlers registered")
        
        # ========== LAYER 7: Register Flask-Smorest API ==========
        # Configure Flask-Smorest for REST API endpoints
        app.config['API_TITLE'] = 'CCP Backend API'
        app.config['API_VERSION'] = 'v2'
        app.config['OPENAPI_VERSION'] = '3.0.3'
        app.config['OPENAPI_URL_PREFIX'] = '/api/docs'
        app.config['OPENAPI_SWAGGER_UI_PATH'] = '/swagger-ui'
        app.config['OPENAPI_SWAGGER_UI_URL'] = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist/'
        app.config['OPENAPI_REDOC_PATH'] = '/redoc'
        app.config['OPENAPI_REDOC_URL'] = 'https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js'
        
        # Initialize Flask-Smorest API
        api = Api(app)
        
        # Register Flask-Smorest blueprints
        from modules.core.api_registry import register_api_blueprints
        register_api_blueprints(api)
        logger.info("✓ Flask-Smorest API configured with OpenAPI docs")

        # Register admin CLI commands (bootstrap super admin)
        from modules.admin.commands import register_admin_commands
        register_admin_commands(app)
        logger.info("✓ Admin CLI commands registered")

        # ========== Presence: bump User.last_seen_at on each authed request ==========
        # Debounced to once per minute so the hot path stays cheap. Failures
        # never bubble up — presence is best-effort.
        from datetime import datetime as _dt, timedelta as _td
        from flask import request as _request
        from flask_login import current_user as _current_user
        from modules.auth_v2.extensions import db as _db

        @app.before_request
        def _bump_last_seen():
            try:
                # Skip OPTIONS preflights and Socket.IO polling — they fire constantly.
                if _request.method == 'OPTIONS':
                    return
                if not getattr(_current_user, 'is_authenticated', False):
                    return
                user = _current_user
                last = getattr(user, 'last_seen_at', None)
                if last is not None and (_dt.utcnow() - last) < _td(seconds=60):
                    return
                user.last_seen_at = _dt.utcnow()
                _db.session.commit()
            except Exception:
                # Roll back so the rest of the request still runs cleanly.
                try:
                    _db.session.rollback()
                except Exception:
                    pass

        logger.info("✓ Presence middleware installed")

        # ========== LAYER 8: Start Background Services ==========
        # Start transaction polling service to auto-verify pending payments
        try:
            from modules.wallet.services.transaction_polling_service import start_polling_service
            start_polling_service(app)
            logger.info("✓ Transaction polling service started")
        except Exception as e:
            logger.warning(f"⚠ Could not start polling service: {e}")

        # Email digest sweeper — opt-in per user via NotificationPreference.digest_frequency.
        try:
            from modules.notifications.services import start_digest_scheduler
            start_digest_scheduler(app)
        except Exception as e:
            logger.warning(f"⚠ Could not start digest scheduler: {e}")

        # ========== LAYER 9: Return Configured App ==========
        logger.info("Application initialized successfully")
        return app
        
    except Exception as e:
        logger.critical(f"✗ Application initialization failed: {str(e)}")
        raise


# WSGI entry point
application = create_app()


# Production and local development
if __name__ == "__main__":
    socketio = application.extensions.get('socketio')
    if not socketio:
        socketio = application.config.get('SOCKETIO')
    
    port = int(os.environ.get("PORT", 8080))
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    
    logger.info(f"Starting server on 0.0.0.0:{port} (debug={debug})")
    
    # Use eventlet WSGI server for production-safe deployment
    socketio.run(
        application, 
        host="0.0.0.0", 
        port=port, 
        debug=debug,
        use_reloader=False,
        log_output=True
    )
