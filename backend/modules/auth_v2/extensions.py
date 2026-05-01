"""
Auth V2 Extensions - Flask-SQLAlchemy and Flask-Login instances

This module creates the db and login_manager instances that will be
initialized with the Flask app in app.py.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from modules.core.response_formatter import format_unauthorized

# Create Flask-SQLAlchemy instance
db = SQLAlchemy()

# Create Flask-Login manager
login_manager = LoginManager()
login_manager.session_protection = 'strong'


@login_manager.unauthorized_handler
def unauthorized():
    """Return JSON 401 for API requests instead of redirecting to a login page."""
    return format_unauthorized("Authentication required")


@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login session management."""
    from modules.auth_v2.models.user import User
    return User.query.get(int(user_id))
