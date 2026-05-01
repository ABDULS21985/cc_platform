"""
Payment verification service for manual and automatic transaction verification.
"""
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from database.connection import db
from modules.wallet.models.wallet_transaction import WalletTransaction
from modules.wallet.providers.provider_factory import PaymentProviderFactory
from modules.wallet.repositories import WalletRepository, WalletTransactionRepository

logger = logging.getLogger(__name__)


class PaymentVerificationService:
    """Service to verify payment transactions manually or automatically."""

    def __init__(self):
        self.wallet_repo = WalletRepository()
        self.transaction_repo = WalletTransactionRepository()
        self.provider_factory = PaymentProviderFactory()

    def verify_transaction(
        self,
        transaction_id: int,
        user_id: Optional[int] = None,
        force_update: bool = False
    ) -> Dict[str, Any]:
        """
        Verify a transaction with the payment provider.
        
        Args:
            transaction_id: ID of the transaction to verify
            user_id: Optional user ID for ownership check (None for admin access)
            force_update: Force verification even if already completed
            
        Returns:
            Dict with verification result and updated transaction data
        """
        try:
            # Get transaction
            transaction = self.transaction_repo.find_by_id(transaction_id)
            if not transaction:
                return {
                    "success": False,
                    "message": "Transaction not found",
                    "error_code": "TRANSACTION_NOT_FOUND"
                }
            
            # Check ownership if user_id provided (non-admin request)
            if user_id is not None:
                wallet = self.wallet_repo.find_by_id(transaction.wallet_id)
                if not wallet or wallet.user_id != user_id:
                    return {
                        "success": False,
                        "message": "Unauthorized: Transaction does not belong to you",
                        "error_code": "UNAUTHORIZED"
                    }
            
            # Skip verification if already completed (unless forced)
            if transaction.status == "successful" and not force_update:
                logger.info(f"Transaction {transaction_id} already completed, skipping verification")
                return {
                    "success": True,
                    "already_completed": True,
                    "message": "Transaction was already verified",
                    "transaction": self._transaction_to_dict(transaction)
                }
            
            # Get provider reference (session_id for SafeHaven, bell_mfb_session_id for Bell)
            provider_reference = transaction.bell_mfb_session_id or transaction.bell_mfb_reference
            if not provider_reference:
                return {
                    "success": False,
                    "message": "Transaction has no provider reference (cannot verify)",
                    "error_code": "NO_PROVIDER_REFERENCE"
                }
            
            # Get wallet to determine provider context
            wallet = self.wallet_repo.find_by_id(transaction.wallet_id)
            if not wallet:
                return {
                    "success": False,
                    "message": "Wallet not found",
                    "error_code": "WALLET_NOT_FOUND"
                }
            
            # Get appropriate payment provider (personal vs community)
            # Use transaction.community_id to determine context since Wallet model has no 'type' field
            from modules.wallet.providers.payment_providers import PaymentProviderContext
            context = PaymentProviderContext.COMMUNITY if transaction.community_id else PaymentProviderContext.PERSONAL
            provider = self.provider_factory.get_provider(context)
            
            # Verify payment with provider
            verification_result = provider.verify_payment(
                session_id=provider_reference,
                expected_amount=abs(transaction.amount) * 100  # Convert to kobo
            )
            
            # Update transaction status if verified
            if verification_result.get("verified"):
                self._update_transaction_as_completed(
                    transaction,
                    verification_result,
                    wallet
                )
                
                return {
                    "success": True,
                    "verified": True,
                    "message": "Payment verified successfully",
                    "transaction": self._transaction_to_dict(transaction),
                    "verification_details": {
                        "amount_received": verification_result.get("amount"),
                        "payment_reference": verification_result.get("payment_reference"),
                        "paid_at": verification_result.get("paid_at")
                    }
                }
            else:
                # Payment not yet completed
                return {
                    "success": True,
                    "verified": False,
                    "message": verification_result.get("message", "Payment not yet completed"),
                    "status": verification_result.get("status"),
                    "transaction": self._transaction_to_dict(transaction)
                }
                
        except Exception as e:
            logger.error(f"Error verifying transaction {transaction_id}: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Verification error: {str(e)}",
                "error_code": "VERIFICATION_ERROR"
            }

    def _update_transaction_as_completed(
        self,
        transaction: WalletTransaction,
        verification_result: Dict[str, Any],
        wallet: Any
    ) -> None:
        """Update transaction and wallet balance when payment is verified."""
        try:
            # Capture balance before update
            balance_before = wallet.balance
            
            # Update transaction status
            transaction.status = "successful"
            transaction.completed_at = datetime.utcnow()
            if verification_result.get("payment_reference"):
                transaction.bell_mfb_reference = verification_result.get("payment_reference")
            
            # Update metadata with verification info
            if not transaction.meta:
                transaction.meta = {}
            transaction.meta["verified_at"] = datetime.utcnow().isoformat()
            transaction.meta["verification_details"] = {
                "amount_received": verification_result.get("amount"),
                "paid_at": verification_result.get("paid_at")
            }
            
            # Update wallet balance (amount is already in Naira)
            wallet.balance += abs(transaction.amount)
            
            # Update balance tracking on transaction
            transaction.balance_before = balance_before
            transaction.balance_after = wallet.balance
            
            db.session.commit()
            logger.info(
                f"Transaction {transaction.id} verified and completed",
                extra={
                    "transaction_id": transaction.id,
                    "wallet_id": wallet.id,
                    "amount": transaction.amount,
                    "balance_before": str(balance_before),
                    "balance_after": str(wallet.balance)
                }
            )
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating transaction {transaction.id}: {e}", exc_info=True)
            raise

    def verify_pending_transactions(
        self,
        wallet_id: Optional[int] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Bulk verify pending transactions (used by polling service).
        
        Args:
            wallet_id: Optional wallet ID to filter by
            limit: Maximum number of transactions to check
            
        Returns:
            Dict with verification summary
        """
        try:
            # Get pending transactions
            pending = self.transaction_repo.get_pending_transactions(
                wallet_id=wallet_id,
                limit=limit
            )
            
            if not pending:
                return {
                    "success": True,
                    "checked": 0,
                    "verified": 0,
                    "message": "No pending transactions to verify"
                }
            
            verified_count = 0
            failed_count = 0
            
            for transaction in pending:
                try:
                    result = self.verify_transaction(
                        transaction_id=transaction.id,
                        user_id=None,  # Admin/system access
                        force_update=False
                    )
                    
                    if result.get("verified"):
                        verified_count += 1
                    elif not result.get("success"):
                        failed_count += 1
                        
                except Exception as e:
                    logger.error(f"Error verifying transaction {transaction.id}: {e}")
                    failed_count += 1
            
            return {
                "success": True,
                "checked": len(pending),
                "verified": verified_count,
                "failed": failed_count,
                "message": f"Verified {verified_count} of {len(pending)} pending transactions"
            }
            
        except Exception as e:
            logger.error(f"Error in bulk verification: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Bulk verification error: {str(e)}"
            }

    def _transaction_to_dict(self, transaction: WalletTransaction) -> Dict[str, Any]:
        """Convert transaction to dictionary for API response."""
        return {
            "id": transaction.id,
            "wallet_id": transaction.wallet_id,
            "reference": transaction.reference,
            "amount": float(transaction.amount),
            "type": transaction.type,
            "status": transaction.status,
            "description": transaction.description,
            "bell_mfb_reference": transaction.bell_mfb_reference,
            "bell_mfb_session_id": transaction.bell_mfb_session_id,
            "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
            "completed_at": transaction.completed_at.isoformat() if transaction.completed_at else None,
            "meta": transaction.meta
        }
