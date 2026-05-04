"""
Webhook handler service for payment provider webhooks.
Routes webhooks to appropriate handlers based on provider.
"""
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime

from modules.wallet.providers import PaymentProviderFactory, PaymentProviderContext
from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
from modules.community.repositories.wallet_repository import CommunityWalletRepository
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


class WebhookService:
    """Handles incoming webhooks from payment providers."""
    
    def __init__(self):
        self.transaction_repo = WalletTransactionRepository()
        self.community_wallet_repo = CommunityWalletRepository()
    
    def handle_safehaven_webhook(
        self,
        payload: Dict[str, Any],
        signature: str,
        raw_body: str
    ) -> Dict[str, Any]:
        """
        Process SafeHaven payment confirmation webhook.
        
        Args:
            payload: Parsed webhook JSON payload
            signature: Webhook signature header
            raw_body: Raw request body string
            
        Returns:
            Dictionary with processing result
            
        Raises:
            ValueError: If signature invalid or transaction not found
        """
        logger.info(
            "Processing SafeHaven webhook",
            extra={"session_id": payload.get("sessionId")}
        )
        
        # Verify signature
        provider = PaymentProviderFactory.get_provider(PaymentProviderContext.COMMUNITY)
        if not provider.verify_webhook_signature(raw_body, signature):
            logger.error("SafeHaven webhook signature verification failed")
            raise ValueError("Invalid webhook signature")
        
        # Extract webhook data
        session_id = payload.get("sessionId")
        amount = Decimal(str(payload.get("amount", 0)))
        status = payload.get("status", "").lower()
        provider_reference = payload.get("transactionRef") or payload.get("reference")
        source_account = payload.get("sourceAccount")
        source_bank = payload.get("sourceBank")
        
        if not session_id:
            raise ValueError("Missing sessionId in webhook payload")
        
        # Find pending transaction by session ID
        transaction = self.transaction_repo.find_by_bell_mfb_session_id(session_id)
        if not transaction:
            logger.warning(f"Transaction not found for session: {session_id}")
            raise ValueError(f"Transaction not found: {session_id}")
        
        # Validate amount matches
        if transaction.amount != amount:
            logger.error(
                f"Amount mismatch: expected {transaction.amount}, got {amount}",
                extra={"transaction_id": transaction.id, "session_id": session_id}
            )
            raise ValueError(f"Amount mismatch: expected {transaction.amount}, received {amount}")
        
        # Process based on status
        if status == "successful" or status == "success":
            return self._process_successful_payment(
                transaction=transaction,
                provider_reference=provider_reference,
                source_account=source_account,
                source_bank=source_bank
            )
        elif status == "failed" or status == "failure":
            return self._process_failed_payment(transaction, payload.get("message"))
        else:
            logger.warning(f"Unknown webhook status: {status}")
            return {"success": False, "message": f"Unknown status: {status}"}
    
    def _process_successful_payment(
        self,
        transaction,
        provider_reference: str,
        source_account: Optional[str],
        source_bank: Optional[str]
    ) -> Dict[str, Any]:
        """Process successful payment confirmation."""
        try:
            # Update transaction
            transaction.status = 'successful'
            transaction.bell_mfb_reference = provider_reference
            transaction.source_account_number = source_account
            transaction.source_bank_name = source_bank
            transaction.webhook_received_at = datetime.utcnow()
            transaction.completed_at = datetime.utcnow()
            
            # Credit community wallet if this is a community deposit
            if transaction.community_id:
                wallet = self.community_wallet_repo.find_by_community_id(transaction.community_id)
                if wallet:
                    # Capture balance before for tracking
                    balance_before = wallet.balance
                    wallet.balance += transaction.net_amount
                    
                    # Update balance tracking on transaction
                    transaction.balance_before = balance_before
                    transaction.balance_after = wallet.balance
                    
                    logger.info(
                        f"Credited community wallet: +₦{transaction.net_amount}",
                        extra={
                            "community_id": transaction.community_id,
                            "wallet_id": wallet.id,
                            "balance_before": str(balance_before),
                            "new_balance": str(wallet.balance)
                        }
                    )
            
            db.session.commit()

            logger.info(
                f"Payment processed successfully: {transaction.reference}",
                extra={"transaction_id": transaction.id, "amount": str(transaction.amount)}
            )

            # Best-effort notification + audit (non-blocking, never raises).
            try:
                from modules.notifications.services.notification_service import NotificationService
                from modules.audit.services.audit_service import AuditService
                if transaction.user_id and not transaction.community_id:
                    NotificationService().create_for_user(
                        user_id=transaction.user_id,
                        title="Wallet funded",
                        body=f"Your wallet was credited with ₦{transaction.net_amount:,.2f}.",
                        category='money',
                        source=source_bank or 'Bank',
                        amount_value=f"{transaction.net_amount:,.2f}",
                        amount_direction='in',
                        action_href='/dashboard/activity',
                    )
                    AuditService().record(
                        user_id=transaction.user_id,
                        action='Wallet funded',
                        details=f"Top-up of ₦{transaction.net_amount:,.2f} from {source_bank or 'Bank'}",
                        category='money',
                        severity='info',
                        actor='System',
                        target='CCPay wallet',
                    )
            except Exception:
                pass

            return {
                "success": True,
                "message": "Payment processed successfully",
                "transaction_id": transaction.id,
                "reference": transaction.reference
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(
                f"Error processing successful payment",
                exc_info=True,
                extra={"transaction_id": transaction.id}
            )
            raise
    
    def _process_failed_payment(self, transaction, error_message: Optional[str]) -> Dict[str, Any]:
        """Process failed payment notification."""
        try:
            transaction.status = 'failed'
            transaction.description = f"{transaction.description} [Failed: {error_message}]"
            transaction.webhook_received_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.warning(
                f"Payment failed: {transaction.reference}",
                extra={"transaction_id": transaction.id, "error": error_message}
            )
            
            return {
                "success": True,
                "message": "Payment failure recorded",
                "transaction_id": transaction.id,
                "reference": transaction.reference
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(
                f"Error processing failed payment",
                exc_info=True,
                extra={"transaction_id": transaction.id}
            )
            raise
