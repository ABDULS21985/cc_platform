"""
Celery Tasks for Verification Processing
Handles BVN/NIN verification as background jobs
"""
import logging
from typing import Dict, Any
from modules.tasks.celery_app import celery
from modules.tasks.app_context import get_flask_app
from datetime import datetime

logger = logging.getLogger(__name__)


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def process_bvn_verification(
    self,
    user_id: int,
    bvn: str,
    date_of_birth: str,
    verification_id: int
) -> Dict[str, Any]:
    """
    Background task to process BVN verification

    After successful verification, triggers wallet creation task

    Args:
        self: Celery task instance for retry control
        user_id: ID of user requesting verification
        bvn: BVN number to be encrypted
        date_of_birth: Date of birth in YYYY-MM-DD format
        verification_id: ID of verification record to update

    Returns:
        Dictionary with verification result

    Retry Strategy:
        - Max 3 retries with exponential backoff (1min, 2min, 4min)
        - Sends failure notification only after final retry
    """
    app = get_flask_app()

    with app.app_context():
        try:
            logger.info(f"Starting BVN verification for user {user_id}")

            from modules.verification.services.verification_service import VerificationService
            from modules.verification.repositories.verification_repository import VerificationRepository

            service = VerificationService()
            repo = VerificationRepository()

            # ✅ IDEMPOTENCY CHECK: Skip if already verified
            verification = repo.find_by_id(verification_id)
            if verification and verification.status == 'verified':
                logger.info(f"⏭️ Skipping BVN verification - user {user_id} already verified")
                return {
                    'success': True,
                    'verification_id': verification_id,
                    'verification_type': 'bvn',
                    'message': 'Already verified (skipped duplicate task)',
                    'skipped': True
                }

            repo.update_status(verification_id, 'processing')

            result = service.verify_bvn(
                user_id=user_id,
                bvn=bvn,
                date_of_birth=date_of_birth,
                verification_id=verification_id
            )

            logger.info(f"BVN verification completed for user {user_id}")

            # Trigger wallet creation as separate task
            process_wallet_creation.delay(user_id=user_id)

            # Send notification
            from modules.tasks.notification_tasks import send_verification_notification
            send_verification_notification.delay(
                user_id=user_id,
                verification_type='bvn',
                status='verified'
            )

            return result

        except Exception as e:
            logger.error(f"BVN verification failed for user {user_id}: {str(e)}", exc_info=True)

            from modules.verification.repositories.verification_repository import VerificationRepository
            repo = VerificationRepository()

            repo.update_status(
                verification_id,
                'failed',
                error_message=str(e)
            )

            if self.request.retries >= self.max_retries:
                from modules.tasks.notification_tasks import send_verification_notification
                send_verification_notification.delay(
                    user_id=user_id,
                    verification_type='bvn',
                    status='failed'
                )

            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=countdown)


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def process_nin_verification(
    self,
    user_id: int,
    nin: str,
    date_of_birth: str,
    verification_id: int
) -> Dict[str, Any]:
    """
    Background task to process NIN verification

    After successful verification, triggers wallet creation task

    Args:
        self: Celery task instance for retry control
        user_id: ID of user requesting verification
        nin: NIN number to be encrypted
        date_of_birth: Date of birth in YYYY-MM-DD format
        verification_id: ID of verification record to update

    Returns:
        Dictionary with verification result

    Retry Strategy:
        - Max 3 retries with exponential backoff (1min, 2min, 4min)
        - Sends failure notification only after final retry
    """
    app = get_flask_app()

    with app.app_context():
        try:
            logger.info(f"Starting NIN verification for user {user_id}")

            from modules.verification.services.verification_service import VerificationService
            from modules.verification.repositories.verification_repository import VerificationRepository

            service = VerificationService()
            repo = VerificationRepository()

            # ✅ IDEMPOTENCY CHECK: Skip if already verified
            verification = repo.find_by_id(verification_id)
            if verification and verification.status == 'verified':
                logger.info(f"⏭️ Skipping NIN verification - user {user_id} already verified")
                return {
                    'success': True,
                    'verification_id': verification_id,
                    'verification_type': 'nin',
                    'message': 'Already verified (skipped duplicate task)',
                    'skipped': True
                }

            repo.update_status(verification_id, 'processing')

            result = service.verify_nin(
                user_id=user_id,
                nin=nin,
                date_of_birth=date_of_birth,
                verification_id=verification_id
            )
            logger.info(f"NIN verification completed for user {user_id}")

            # Trigger wallet creation as separate task
            process_wallet_creation.delay(user_id=user_id)

            # Send notification
            from modules.tasks.notification_tasks import send_verification_notification
            send_verification_notification.delay(
                user_id=user_id,
                verification_type='nin',
                status='verified'
            )

            return result

        except Exception as e:
            logger.error(f"NIN verification failed for user {user_id}: {str(e)}", exc_info=True)

            from modules.verification.repositories.verification_repository import VerificationRepository
            repo = VerificationRepository()

            repo.update_status(
                verification_id,
                'failed',
                error_message=str(e)
            )

            if self.request.retries >= self.max_retries:
                from modules.tasks.notification_tasks import send_verification_notification
                send_verification_notification.delay(
                    user_id=user_id,
                    verification_type='nin',
                    status='failed'
                )

            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=countdown)


@celery.task
def check_pending_verifications() -> Dict[str, Any]:
    """
    Periodic task to check and retry stale pending verifications

    Should be run via celery beat scheduler (cron-like)

    Returns:
        Summary of processed verifications
    """
    try:
        logger.info("Checking for pending verifications...")

        from modules.verification.repositories.verification_repository import VerificationRepository

        repo = VerificationRepository()
        pending = repo.get_pending_verifications(limit=10)

        processed = 0
        for verification in pending:
            if verification.verification_type == 'bvn':
                logger.warning(f"Cannot retry verification {verification.id} - BVN encrypted")
            elif verification.verification_type == 'nin':
                logger.warning(f"Cannot retry verification {verification.id} - NIN encrypted")

            processed += 1

        logger.info(f"Checked {len(pending)} pending verifications, processed {processed}")
        return {
            'success': True,
            'pending_count': len(pending),
            'processed': processed
        }

    except Exception as e:
        logger.error(f"Failed to check pending verifications: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }


@celery.task(bind=True, max_retries=2, default_retry_delay=30)
def process_wallet_creation(self, user_id: int) -> Dict[str, Any]:
    """
    Background task to create wallet after successful verification
    
    Creates simple wallet record for tracking user balance.
    Bell MFB accounts are created on-demand during deposit/withdrawal.

    Args:
        self: Celery task instance for retry control
        user_id: ID of verified user

    Returns:
        Dictionary with wallet creation result

    Retry Strategy:
        - Max 2 retries with exponential backoff (30s, 60s)
    """
    app = get_flask_app()

    with app.app_context():
        try:
            logger.info(f"Creating wallet for verified user {user_id}")

            from modules.wallet.services.wallet_creation_service import WalletCreationService

            # Create wallet record (no Bell MFB call here)
            service = WalletCreationService()
            result = service.create_wallet(user_id=user_id)

            logger.info(f"Wallet created for user {user_id}")

            return result

        except Exception as e:
            logger.error(f"Wallet creation failed for user {user_id}: {str(e)}", exc_info=True)

            # Non-retriable: wallet already exists, treat as idempotent success.
            if isinstance(e, ValueError) and "already has an active wallet" in str(e).lower():
                logger.info(f"Skipping wallet creation retry for user {user_id}: wallet already exists")
                return {
                    'success': True,
                    'skipped': True,
                    'message': 'Wallet already exists'
                }

            if self.request.retries >= self.max_retries:
                # Final failure - log and continue
                logger.error(f"Final wallet creation failure for user {user_id}")

            countdown = 30 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=countdown)
