"""
Swagger/Flasgger Configuration Module

Centralized API documentation setup
Environment-aware Swagger configuration
"""
import os


def get_swagger_template(env='development', api_host=None):
    """
    Generate Swagger template based on environment

    Args:
        env: Environment name ('development' or 'production')
        api_host: API hostname (defaults based on env)

    Returns:
        dict: Swagger 2.0 template
    """
    if api_host is None:
        # Check environment variable first, then fallback to defaults
        api_host = os.getenv('API_HOST')
        if not api_host:
            api_host = "0.0.0.0:8080" if env != "production" else "cc-pay-666057252406.europe-west1.run.app"

    schemes = ["https"] if env == "production" else ["http"]
    
    return {
        "swagger": "2.0",
        "info": {
            "title": "CCPay API",
            "description": "API documentation for CCPay backend services including WebSocket endpoints.",
            "version": "1.0.0",
            "contact": {
                "name": "Paradox",
                "url": "https://github.com/edwardndiyo",
                "email": "ndiyoedward@gmail.com",
            },
        },
        "host": api_host,
        "schemes": schemes,
        "definitions": {
            "CommunityPost": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer", "example": 1},
                    "user_id": {"type": "integer", "example": 123},
                    "community_id": {"type": "integer", "example": 1},
                    "text": {"type": "string", "example": "Hello community!"},
                    "image_url": {"type": "string", "example": "https://res.cloudinary.com/example.jpg"},
                    "timestamp": {"type": "string", "format": "date-time"},
                    "author_name": {"type": "string", "example": "John Doe"},
                    "author_profile_pic": {"type": "string", "example": "/static/profiles/1.jpg"},
                    "like_count": {"type": "integer", "example": 5},
                    "comment_count": {"type": "integer", "example": 2},
                    "liked_by_user": {"type": "boolean", "example": False}
                }
            },
            "Pagination": {
                "type": "object",
                "properties": {
                    "page": {"type": "integer", "example": 1},
                    "per_page": {"type": "integer", "example": 10},
                    "total": {"type": "integer", "example": 100},
                    "pages": {"type": "integer", "example": 10}
                }
            }
        },
        "tags": [
            {
                "name": "Auth V2",
                "description": "User authentication and session management"
            },
            {
                "name": "Verification",
                "description": "BVN/NIN verification with async processing (Celery)"
            },
            {
                "name": "Wallet",
                "description": "Wallet management, transactions, and Bell MFB webhooks"
            },
            {
                "name": "Community",
                "description": "Community post management"
            },
            {
                "name": "Realtime",
                "description": "WebSocket real-time events (connect via ws://ccpay.ng/backend/socket.io)"
            }
        ]
    }


def get_swagger_config():
    """
    Get Swagger UI configuration
    
    Returns:
        dict: Flasgger configuration
    """
    return {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec_1",
                "route": "/apidocs/swagger.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs/",
        "uiversion": 3
    }
