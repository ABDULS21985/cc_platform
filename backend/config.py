import os
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env only when not in production. This avoids accidental .env use on Cloud.
FLASK_ENV = os.getenv("FLASK_ENV", "development")
if FLASK_ENV != "production":
    # Project layout (after the monorepo move) is:
    #   /cc_platform/backend/.env   ← dev-only defaults (Redis URL, session config, dummy secrets)
    #   /cc_platform/.ENV           ← shared canonical secrets (Neon DB, ENCRYPTION_KEY, BellMFB, ...)
    # Why .ENV must win: Flask CLI auto-loads backend/.env from CWD before our code runs,
    # which means by the time config.py is imported the backend/.env values are already
    # in os.environ. We need .ENV to override them so DB_HOST etc. point at Neon.
    backend_root = Path(__file__).resolve().parent
    project_root = backend_root.parent
    # Load backend/.env first as a baseline, then .ENV with override=True so the
    # canonical secrets always win — but exclude operational keys that PM2 sets
    # explicitly (PORT, PYTHONUNBUFFERED, NODE_ENV) so the orchestrator stays
    # authoritative for runtime config.
    if (backend_root / ".env").exists():
        load_dotenv(backend_root / ".env", override=False)
    if (project_root / ".env").exists():
        load_dotenv(project_root / ".env", override=False)
    canonical_env = project_root / ".ENV"
    if canonical_env.exists():
        from dotenv import dotenv_values
        _orchestrator_keys = {"PORT", "PYTHONUNBUFFERED", "NODE_ENV"}
        for key, value in dotenv_values(canonical_env).items():
            if value is None:
                continue
            if key in _orchestrator_keys and os.environ.get(key) is not None:
                continue
            os.environ[key] = value


def _bool(value, default=False):
    if value is None:
        return default
    return str(value).lower() in ("1", "true", "yes", "on")


def _int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class Config:
    """
    Base Application Configuration
    
    Centralized settings for all environments
    Organized by concern:
    - Environment detection
    - Database
    - Authentication
    - Sessions
    - Logging
    - Mail
    - Swagger/API
    - Security
    - Third-party services
    """
    
    # === ENVIRONMENT ===
    ENV = os.getenv('ENV', 'development')
    DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
    PRODUCTION = ENV == 'production'
    TESTING = False
    
    # === FLASK ===
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    FLASK_ENV = FLASK_ENV
    
    # === DATABASE ===
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20
    }
    DB_HOST = os.getenv("DB_HOST")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_NAME = os.getenv("DB_NAME")
    DB_PORT = 5432
    DB_SSLMODE = os.getenv("DB_SSLMODE", "prefer")
    
    # === AUTHENTICATION ===
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-dev")
    JWT_ACCESS_TOKEN_EXPIRES = _int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES"), 3600)
    JWT_REFRESH_TOKEN_EXPIRES = _int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES"), 86400)
    JWT_TOKEN_LOCATION = ["headers"]
    
    # Google OAuth
    GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    GOOGLE_OAUTH_REDIRECT_URI = os.getenv(
        "GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/google/callback"
    )
    
    # === SESSIONS ===
    # Production: Use Redis sessions (via Flask-Session)
    # Development: Use Flask's built-in signed cookie sessions (no backend needed)
    SESSION_TYPE = os.getenv("SESSION_TYPE", "redis" if PRODUCTION else "cookies")
    SESSION_PERMANENT = _bool(os.getenv("SESSION_PERMANENT"), True)
    SESSION_USE_SIGNER = _bool(os.getenv("SESSION_USE_SIGNER"), True)
    SESSION_COOKIE_HTTPONLY = _bool(os.getenv("SESSION_COOKIE_HTTPONLY"), True)
    SESSION_COOKIE_SECURE = _bool(
        os.getenv("SESSION_COOKIE_SECURE"), PRODUCTION
    )
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    PERMANENT_SESSION_LIFETIME = _int(os.getenv("SESSION_LIFETIME"), 604800)
    SESSION_FILE_DIR = os.path.join(os.path.dirname(__file__), 'flask_session')
    
    # === REDIS / CACHING ===
    # In production, REDIS_URL MUST be set as environment variable
    # In development, it's optional (will use cookie sessions if not set)
    REDIS_URL = os.getenv("REDIS_URL")
    SESSION_REDIS = REDIS_URL
    SOCKETIO_MESSAGE_QUEUE = REDIS_URL
    
    # === LOGGING ===
    LOG_LEVEL = logging.DEBUG if DEBUG else logging.INFO
    LOG_FORMAT = "%(asctime)s %(levelname)s %(message)s"
    
    # === MAIL ===
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = _int(os.getenv("MAIL_PORT"), 587)
    MAIL_USE_TLS = _bool(os.getenv("MAIL_USE_TLS"), True)
    MAIL_USE_SSL = _bool(os.getenv("MAIL_USE_SSL"), False)
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_NAME", "no-reply@ccpay.ng")
    
    # === SECURITY ===
    WTF_CSRF_ENABLED = True
    WTF_CSRF_SSL_STRICT = PRODUCTION
    WTF_CSRF_CHECK_DEFAULT = False  # Don't check CSRF by default, only on forms
    CORS_ORIGINS = ["*"]
    
    # === API / SWAGGER ===
    API_HOST = os.getenv("API_HOST")
    if PRODUCTION and not API_HOST:
        # Production should have explicit host
        API_HOST = os.getenv('API_HOST', 'cc-pay-api.example.com')
    else:
        API_HOST = API_HOST or "0.0.0.0:8080"
    
    SWAGGER_SCHEMES = ["https"] if PRODUCTION else ["http"]
    
    # Swagger configuration (generated dynamically)
    SWAGGER_TEMPLATE = None  # Set in __init__
    SWAGGER_CONFIG = None     # Set in __init__
    
    # === CLOUDINARY ===
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
    CLOUDINARY_UPLOAD_FOLDER = os.getenv("CLOUDINARY_UPLOAD_FOLDER", "community_posts")
    COMMUNITY_MEDIA_PROVIDER = os.getenv("COMMUNITY_MEDIA_PROVIDER", "cloudinary")
    COMMUNITY_POST_MEDIA_MAX_FILES = _int(os.getenv("COMMUNITY_POST_MEDIA_MAX_FILES"), 10)
    COMMUNITY_POST_MEDIA_MAX_FILE_SIZE_MB = _int(os.getenv("COMMUNITY_POST_MEDIA_MAX_FILE_SIZE_MB"), 10)
    
    # === SMS (Termii) ===
    TERMII_API_KEY = os.getenv("TERMII_API_KEY")
    TERMII_SENDER_ID = os.getenv("TERMII_SENDER_ID", "CCPay")
    SMS_ENABLED = os.getenv("SMS_ENABLED", "false").lower() == "true"
    MAX_DAILY_SMS_NAIRA = _int(os.getenv("MAX_DAILY_SMS_NAIRA"), 5000)

    # === FIREBASE ===
    FIREBASE_CREDENTIALS = os.getenv(
        "FIREBASE_CREDENTIALS", "/secrets/firebase_credentials.json"
    )
    ENABLE_PUSH_NOTIFICATIONS = _bool(os.getenv("ENABLE_PUSH_NOTIFICATIONS"), False)
    
    # === MISC ===
    MESSAGES_PER_PAGE = _int(os.getenv("MESSAGES_PER_PAGE"), 20)
    
    def __init__(self):
        """Initialize config with environment-aware values"""
        from modules.config.swagger_config import get_swagger_template, get_swagger_config
        
        self.SWAGGER_TEMPLATE = get_swagger_template(
            env=self.ENV,
            api_host=self.API_HOST
        )
        self.SWAGGER_CONFIG = get_swagger_config()
    
    @classmethod
    def setup_logging(cls):
        """Initialize logging configuration"""
        logging.basicConfig(
            stream=sys.stdout,
            level=cls.LOG_LEVEL,
            format=cls.LOG_FORMAT,
        )
        return logging.getLogger(__name__)


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    TESTING = False
    SESSION_COOKIE_SECURE = False


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True


class TestingConfig(Config):
    """Testing environment configuration"""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SESSION_TYPE = "filesystem"
    REDIS_URL = None  # No Redis in tests


@classmethod
def from_env(cls):
    """Factory method to create appropriate config from environment"""
    env = os.getenv('ENV', 'development')
    if env == 'production':
        return ProductionConfig()
    elif env == 'testing':
        return TestingConfig()
    else:
        return DevelopmentConfig()



