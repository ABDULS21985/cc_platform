"""
Flask CLI Management Script
Similar to Django's manage.py

Usage:
    flask db migrate -m "description"
    flask db upgrade
    flask db downgrade

Or using this script as entry point:
    python manage.py
"""
import os
import sys
from app import create_app
from modules.auth_v2.extensions import db
from flask_migrate import Migrate

# Create app
app = create_app()

# Initialize Flask-Migrate
migrate = Migrate(app, db, directory='flask_migrations')

if __name__ == '__main__':
    app.cli()

