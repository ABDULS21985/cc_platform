"""Shared Flask app context utilities for Celery tasks."""
import logging
import os
import sys

logger = logging.getLogger(__name__)

_flask_app = None


def get_flask_app():
    """Get cached Flask app instance for Celery task contexts."""
    global _flask_app

    if _flask_app is None:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)

        from app import create_app

        _flask_app = create_app()
        logger.info("Flask app created and cached for Celery tasks")

    return _flask_app
