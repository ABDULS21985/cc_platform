"""
Celery Tasks for Notifications
Handles asynchronous notification delivery
"""
import logging
from typing import Dict, Any
from modules.tasks.celery_app import celery
from modules.tasks.app_context import get_flask_app

logger = logging.getLogger(__name__)


@celery.task(bind=True, max_retries=3, default_retry_delay=30)
def send_verification_notification(
    self,
    user_id: int,
    verification_type: str,
    status: str
) -> Dict[str, Any]:
    """
    Send notification about verification status

    Args:
        self: Celery task instance
        user_id: ID of user to notify
        verification_type: 'bvn' or 'nin'
        status: 'verified' or 'failed'

    Returns:
        Dictionary with notification delivery results
    """
    try:
        from modules.verification.services.notification_service import NotificationService

        logger.info(f"Sending verification notification to user {user_id} (status: {status})")

        app = get_flask_app()
        with app.app_context():
            service = NotificationService()
            result = service.send_verification_complete(
                user_id=user_id,
                verification_type=verification_type,
                status=status
            )

        logger.info(f"Verification notification sent to user {user_id}: {result}")
        return result

    except Exception as e:
        logger.error(f"Verification notification failed for user {user_id}: {str(e)}", exc_info=True)

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=30 * (2 ** self.request.retries))
        else:
            logger.error(f"Verification notification permanently failed after {self.max_retries} retries")
            return {'success': False, 'error': str(e)}


@celery.task(bind=True, max_retries=3, default_retry_delay=30)
def send_transaction_notification(
    self,
    user_id: int,
    transaction_id: int
) -> Dict[str, Any]:
    """
    Send notification about new transaction

    Args:
        self: Celery task instance
        user_id: ID of user to notify
        transaction_id: ID of transaction

    Returns:
        Dictionary with notification delivery results
    """
    try:
        from modules.verification.services.notification_service import NotificationService

        logger.info(f"Sending transaction notification to user {user_id} (txn: {transaction_id})")

        app = get_flask_app()
        with app.app_context():
            service = NotificationService()
            result = service.send_transaction_notification(
                user_id=user_id,
                transaction_id=transaction_id
            )

        logger.info(f"Transaction notification sent to user {user_id}: {result}")
        return result

    except Exception as e:
        logger.error(f"Transaction notification failed: {str(e)}", exc_info=True)

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=30 * (2 ** self.request.retries))
        else:
            logger.error(f"Transaction notification permanently failed after {self.max_retries} retries")
            return {'success': False, 'error': str(e)}
