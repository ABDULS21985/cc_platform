"""
Run me with `python scripts/scrub_deactivated_users.py` (or schedule via cron
until modules/tasks exists). Scrubs PII for users whose deactivated_at is
older than the 30-day grace window.
"""
import logging
import sys

from app import create_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> int:
    app = create_app()
    with app.app_context():
        from modules.auth_v2.services.deactivation_service import DeactivationService

        summary = DeactivationService().scrub_eligible()
        logger.info(f"Scrub summary: {summary}")
        return 0 if not summary.get('errors') else 1


if __name__ == '__main__':
    sys.exit(main())
