"""
Payment Intent Service
Business logic for processing payments.

SOLID Principles:
- Single Responsibility: Orchestrate payment operations only
- Open/Closed: Extensible for new payment methods
- Liskov Substitution: Clear interface contracts
- Interface Segregation: Focused public methods
- Dependency Inversion: Depends on repositories & external services
"""
import logging
from decimal import Decimal
from typing import Optional, Dict, Tuple, Any
from datetime import datetime
from modules.community.repositories import (
    BillRepository,
    BillSessionRepository,
    CommunityWalletRepository,
    MemberRepository,
)
from modules.auth_v2.extensions import db
from modules.wallet.models.wallet import Wallet
from modules.wallet.models.wallet_transaction import WalletTransaction

logger = logging.getLogger(__name__)


class PaymentIntentService:
    """Service for payment operations"""
    
    def __init__(self):
        self.bill_repo = BillRepository()
        self.session_repo = BillSessionRepository()
        self.wallet_repo = CommunityWalletRepository()
        self.member_repo = MemberRepository()
    
    def pay_bill_from_wallet(
        self,
        bill_id: int,
        user_id: int,
        amount: Decimal,
        *,
        pin: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Pay bill using user's wallet
        
        Args:
            bill_id: Bill ID
            user_id: User paying
            amount: Payment amount
            
        Returns:
            Tuple of (transaction_data, error) - one will be None
        """
        try:
            # Enforce transaction PIN for wallet debits
            try:
                from modules.wallet.services.pin_service import TransactionPinService

                TransactionPinService().verify_pin(user_id=user_id, pin=str(pin))
            except ValueError as pin_err:
                return None, str(pin_err)

            # Validate bill
            bill = self.bill_repo.find_by_id(bill_id)
            if not bill:
                return None, 'Bill not found'
            
            # Validate community membership
            if not self.member_repo.is_member(bill.community_id, user_id):
                return None, 'Not a community member'
            
            # Get user wallet
            user_wallet = Wallet.query.filter_by(user_id=user_id).first()
            if not user_wallet:
                return None, 'Wallet not found'
            
            # Check balance
            if user_wallet.balance < amount:
                return None, 'Insufficient wallet balance'
            
            # Get community wallet
            community_wallet = self.wallet_repo.find_by_community_id(bill.community_id)
            if not community_wallet:
                return None, 'Community wallet not found'

            # Idempotency: if we already processed a successful payment for this bill by this user,
            # do not debit again (common on retries / double-clicks).
            existing_success = (
                WalletTransaction.query.filter(
                    WalletTransaction.wallet_id == user_wallet.id,
                    WalletTransaction.bill_id == bill_id,
                    WalletTransaction.community_id == bill.community_id,
                    WalletTransaction.transaction_type == 'bill_payment',
                    WalletTransaction.status.in_(["successful", "completed"]),
                )
                .order_by(WalletTransaction.created_at.desc())
                .first()
            )
            if existing_success and (existing_success.meta or {}).get("user_id") == user_id:
                return {
                    'transaction_id': existing_success.id,
                    'bill_id': bill_id,
                    'amount': float(amount),
                    'status': existing_success.status,
                    'timestamp': (existing_success.created_at or datetime.utcnow()).isoformat(),
                    'duplicate': True,
                }, None
            
            # Capture balance before for tracking
            user_balance_before = user_wallet.balance
            community_balance_before = community_wallet.balance
            
            # Deduct from user wallet
            user_wallet.balance -= amount
            
            # Add to community wallet
            community_wallet.balance += amount
            
            # Calculate signed amount (negative for debit)
            signed_amount = WalletTransaction.compute_signed_amount(amount, 'debit')
            
            # Record transaction with proper fields
            transaction = WalletTransaction(
                wallet_id=user_wallet.id,
                reference=WalletTransaction.generate_reference('BIL'),
                # DB constraint expects business types (deposit/withdrawal/transfer/payment),
                # not accounting directions (credit/debit).
                type='payment',
                transaction_type='bill_payment',
                amount=amount,
                signed_amount=signed_amount,
                fee=Decimal('0.00'),
                net_amount=amount,
                balance_before=user_balance_before,
                balance_after=user_wallet.balance,
                status='successful',
                bill_id=bill_id,
                community_id=bill.community_id,
                description=f'Payment for bill: {bill.title}',
                meta={
                    'user_id': user_id,
                    'bill_title': bill.title,
                    'community_wallet_credited': str(amount),
                    'community_wallet_balance_before': str(community_balance_before),
                    'community_wallet_balance_after': str(community_wallet.balance),
                }
            )
            db.session.add(transaction)
            
            # Update bill & (if recurring) the current bill session collection.
            # This mirrors the behavior in BillService.record_payment(), but
            # keeps this method focused on the wallet->bill payment orchestration.
            self.bill_repo.update_collected_amount(bill_id, amount)
            if bill.is_recurring:
                session = self.session_repo.find_current_session(bill_id)
                if session:
                    self.session_repo.update_collected_amount(session.id, amount)
            
            db.session.commit()
            logger.info(f"User {user_id} paid {amount} toward bill {bill_id}")

            # Best-effort: notify the bill creator + audit the payer.
            try:
                from modules.notifications.services.notification_service import NotificationService
                from modules.audit.services.audit_service import AuditService
                from modules.community.repositories.community_repository import CommunityRepository
                community = CommunityRepository().find_by_id(bill.community_id)
                community_name = community.name if community else 'Community'
                notif_service = NotificationService()
                if bill.creator_id and bill.creator_id != user_id:
                    notif_service.create_for_user(
                        user_id=bill.creator_id,
                        title=f"Payment received: {bill.title}",
                        body=f"A member paid ₦{amount:,.2f} toward your bill.",
                        category='money',
                        source=community_name,
                        amount_value=f"{amount:,.2f}",
                        amount_direction='in',
                        action_href='/dashboard/bills',
                    )
                AuditService().record(
                    user_id=user_id,
                    action='Bill paid',
                    details=f"Paid ₦{amount:,.2f} toward '{bill.title}' from your wallet",
                    category='money',
                    severity='info',
                    actor='You',
                    target=community_name,
                )
            except Exception as exc:
                logger.warning('post-payment notify/audit failed: %s', exc)

            return {
                'transaction_id': transaction.id,
                'bill_id': bill_id,
                'amount': float(amount),
                'status': transaction.status,
                'timestamp': datetime.utcnow().isoformat()
            }, None

        except Exception as e:
            logger.error(f"Error processing bill payment: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def pay_community_bill(
        self,
        bill_id: int,
        user_id: int,
        amount: Decimal,
        payment_method: str = 'wallet',
        *,
        pin: Optional[str] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Process community bill payment
        
        Args:
            bill_id: Bill ID
            user_id: User paying
            amount: Payment amount
            payment_method: wallet/transfer/card
            
        Returns:
            Tuple of (payment_info, error) - one will be None
        """
        if payment_method == 'wallet':
            if not pin:
                return None, "PIN is required for wallet payments"
            return self.pay_bill_from_wallet(bill_id, user_id, amount, pin=str(pin))
        elif payment_method == 'transfer':
            return None, 'Direct transfer not yet implemented'
        elif payment_method == 'card':
            return None, 'Card payments not yet implemented'
        else:
            return None, 'Invalid payment method'
    
    def validate_payment(self, bill_id: int, user_id: int, amount: Decimal) -> Tuple[bool, Optional[str]]:
        """
        Validate payment before processing
        
        Returns:
            Tuple of (valid, error) - one will be None/False
        """
        # Check bill exists
        bill = self.bill_repo.find_by_id(bill_id)
        if not bill:
            return False, 'Bill not found'
        
        # Check amount
        if amount <= 0:
            return False, 'Amount must be positive'
        
        # Check bill type
        if bill.type == 'fixed' and amount != bill.amount:
            return False, f'Fixed bill requires exact amount: {bill.amount}'
        elif bill.type == 'free_will' and amount < bill.min_amount:
            return False, f'Minimum amount is {bill.min_amount}'
        
        # Check user is member
        if not self.member_repo.is_member(bill.community_id, user_id):
            return False, 'Not a community member'
        
        # Check bill status
        if bill.status in ['closed', 'cancelled']:
            return False, f'Bill is {bill.status}'
        
        return True, None
    
    def get_payment_status(self, bill_id: int) -> Dict[str, Any]:
        """Get payment status for bill"""
        bill = self.bill_repo.find_by_id(bill_id)
        if not bill:
            return {}
        
        return {
            'bill_id': bill_id,
            'total_amount': float(bill.amount),
            'collected_amount': float(bill.collected_amount),
            'remaining_amount': float(bill.amount - bill.collected_amount),
            'percentage_paid': int((bill.collected_amount / bill.amount * 100)) if bill.amount > 0 else 0,
            'status': bill.status
        }
