"""
Background polling service to automatically verify pending transactions.
"""
import logging
import time
from threading import Thread
from datetime import datetime
from typing import Optional

from modules.wallet.services.payment_verification_service import PaymentVerificationService

logger = logging.getLogger(__name__)

# Store app reference for context
_app = None


def set_app(app):
    """Set the Flask app reference for context management."""
    global _app
    _app = app


class TransactionPollingService:
    """
    Background service that periodically checks pending transactions
    and verifies them with payment providers.
    """

    def __init__(
        self,
        poll_interval_seconds: int = 300,  # Default: 5 minutes
        older_than_minutes: int = 2,  # Only check transactions older than 2 minutes
        max_transactions_per_poll: int = 50
    ):
        """
        Initialize the polling service.
        
        Args:
            poll_interval_seconds: How often to poll (in seconds)
            older_than_minutes: Only verify transactions older than this (in minutes)
            max_transactions_per_poll: Maximum number of transactions to check per poll
        """
        self.poll_interval = poll_interval_seconds
        self.older_than_minutes = older_than_minutes
        self.max_transactions = max_transactions_per_poll
        self.verification_service = PaymentVerificationService()
        self.is_running = False
        self.thread: Optional[Thread] = None

    def start(self):
        """Start the polling service in a background thread."""
        if self.is_running:
            logger.warning("Polling service is already running")
            return
        
        self.is_running = True
        self.thread = Thread(target=self._poll_loop, daemon=True)
        self.thread.start()
        logger.info(
            f"Transaction polling service started (interval: {self.poll_interval}s, "
            f"older_than: {self.older_than_minutes}min)"
        )

    def stop(self):
        """Stop the polling service."""
        if not self.is_running:
            logger.warning("Polling service is not running")
            return
        
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=10)
        logger.info("Transaction polling service stopped")

    def _poll_loop(self):
        """Main polling loop that runs in background thread."""
        global _app
        
        while self.is_running:
            try:
                # Must run inside app context for Flask-SQLAlchemy
                if _app is None:
                    logger.warning("No Flask app set, skipping poll cycle")
                    time.sleep(self.poll_interval)
                    continue
                
                with _app.app_context():
                    logger.debug("Starting transaction verification poll")
                    self._poll_once()
                    logger.debug(f"Poll completed, sleeping for {self.poll_interval}s")
                
            except Exception as e:
                logger.error(f"Error in polling loop: {e}", exc_info=True)
            
            # Sleep in small increments to allow quick shutdown
            sleep_time = 0
            while sleep_time < self.poll_interval and self.is_running:
                time.sleep(1)
                sleep_time += 1

    def _poll_once(self):
        """Execute one polling cycle."""
        from modules.wallet.repositories import WalletTransactionRepository
        
        transaction_repo = WalletTransactionRepository()
        
        # Get pending transactions
        pending_transactions = transaction_repo.get_pending_transactions(
            older_than_minutes=self.older_than_minutes,
            limit=self.max_transactions
        )
        
        if not pending_transactions:
            logger.debug("No pending transactions to verify")
            return
        
        logger.info(f"Found {len(pending_transactions)} pending transactions to verify")
        
        verified_count = 0
        failed_count = 0
        still_pending_count = 0
        
        for transaction in pending_transactions:
            try:
                # Only verify if transaction has a provider reference
                if not transaction.bell_mfb_session_id and not transaction.bell_mfb_reference:
                    logger.debug(f"Skipping transaction {transaction.id} (no provider reference)")
                    continue
                
                result = self.verification_service.verify_transaction(
                    transaction_id=transaction.id,
                    user_id=None,  # System/admin access
                    force_update=False
                )
                
                if result.get('verified'):
                    verified_count += 1
                    logger.info(
                        f"Transaction {transaction.id} verified successfully",
                        extra={'transaction_id': transaction.id, 'reference': transaction.reference}
                    )
                elif result.get('status') == 'pending':
                    still_pending_count += 1
                else:
                    failed_count += 1
                    logger.warning(
                        f"Transaction {transaction.id} verification failed: {result.get('message')}",
                        extra={'transaction_id': transaction.id}
                    )
                
            except Exception as e:
                failed_count += 1
                logger.error(
                    f"Error verifying transaction {transaction.id}: {e}",
                    exc_info=True
                )
        
        logger.info(
            f"Poll completed: {verified_count} verified, {still_pending_count} still pending, "
            f"{failed_count} failed"
        )


# Global instance for easy access
_polling_service: Optional[TransactionPollingService] = None


def get_polling_service() -> TransactionPollingService:
    """Get or create the global polling service instance."""
    global _polling_service
    if _polling_service is None:
        _polling_service = TransactionPollingService()
    return _polling_service


def start_polling_service(app=None):
    """Start the global polling service."""
    if app is not None:
        set_app(app)
    service = get_polling_service()
    service.start()


def stop_polling_service():
    """Stop the global polling service."""
    service = get_polling_service()
    service.stop()
