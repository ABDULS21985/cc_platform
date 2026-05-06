"""
Wallet withdrawal service.

Records personal wallet withdrawals through the existing ledger model. Provider
transfer execution is not wired for this flow yet, so responses are explicit
about the pending/provider-unavailable state.
"""
import logging
from decimal import Decimal
from typing import Any, Dict, Optional

from modules.auth_v2.extensions import db
from modules.wallet.models.wallet import Wallet
from modules.wallet.models.wallet_transaction import WalletTransaction
from modules.wallet.services.pin_service import TransactionPinService

logger = logging.getLogger(__name__)


class WalletWithdrawalError(ValueError):
    """Typed withdrawal failure that resources can map to API errors."""

    def __init__(
        self,
        error_code: str,
        message: str,
        *,
        status_code: int = 400,
        data: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code
        self.data = data


class WithdrawalService:
    """Business logic for personal wallet withdrawals/send-to-bank flows."""

    FEE_RATE = Decimal('0.02')
    MIN_FEE = Decimal('50.00')

    def __init__(self, pin_service: Optional[TransactionPinService] = None):
        self.pin_service = pin_service or TransactionPinService()

    def initiate_withdrawal(
        self,
        *,
        user_id: int,
        amount: Decimal,
        bank_code: str,
        account_number: str,
        pin: str,
        account_name: Optional[str] = None,
        bank_name: Optional[str] = None,
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a pending withdrawal and reserve funds from the wallet balance."""
        try:
            self.pin_service.verify_pin(user_id=user_id, pin=str(pin or ""))
        except ValueError as exc:
            raise WalletWithdrawalError("invalid_pin", str(exc), status_code=400) from exc

        bank_code = str(bank_code).strip()[:20]
        account_number = str(account_number).strip()[:20]
        account_name = (account_name or 'N/A').strip()[:255]
        bank_name = (bank_name or bank_code).strip()[:100]
        note = (note or '').strip()[:255]

        wallet = (
            Wallet.query.filter_by(user_id=user_id)
            .with_for_update()
            .first()
        )
        if not wallet:
            raise WalletWithdrawalError(
                "wallet_not_found",
                "Wallet not found. Please complete identity verification first.",
                status_code=404,
            )

        balance_before = Decimal(wallet.balance)
        if balance_before < amount:
            raise WalletWithdrawalError(
                "insufficient_balance",
                f"Insufficient balance. Available: ₦{balance_before:,.2f}",
                data={"available_balance": str(balance_before)},
            )

        fee = self.calculate_fee(amount)
        net_amount = amount - fee
        reference = WalletTransaction.generate_reference('WTH')

        wallet.balance = balance_before - amount
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type='withdrawal',
            transaction_type='withdrawal',
            reference=reference,
            amount=amount,
            signed_amount=WalletTransaction.compute_signed_amount(amount, 'withdrawal'),
            fee=fee,
            net_amount=net_amount,
            balance_before=balance_before,
            balance_after=wallet.balance,
            description=self._description(account_number, bank_code, note),
            status='pending',
            destination_account_number=account_number,
            destination_account_name=account_name,
            meta={
                'user_id': user_id,
                'bank_code': bank_code,
                'bank_name': bank_name,
                'destination_bank_name': bank_name,
                'note': note or None,
                'provider_status': 'provider_unavailable',
            },
        )
        db.session.add(transaction)

        try:
            db.session.commit()
            db.session.refresh(transaction)
            db.session.refresh(wallet)
        except Exception:
            db.session.rollback()
            logger.error("Withdrawal ledger transaction failed", exc_info=True)
            raise

        self._notify_and_audit(
            user_id=user_id,
            amount=amount,
            fee=fee,
            bank_code=bank_code,
            account_number=account_number,
            account_name=account_name,
        )

        logger.info(
            "Withdrawal recorded pending provider execution",
            extra={
                "user_id": user_id,
                "wallet_id": wallet.id,
                "transaction_id": transaction.id,
                "reference": transaction.reference,
            },
        )

        return {
            'transaction_id': transaction.id,
            'reference': transaction.reference,
            'amount': str(amount),
            'fee': str(fee),
            'net_amount': str(net_amount),
            'status': 'pending',
            'provider_status': 'provider_unavailable',
            'destination_bank': bank_name,
            'destination_bank_code': bank_code,
            'destination_account': account_number,
            'message': (
                'Withdrawal request recorded and pending provider processing. '
                'Provider transfer is currently unavailable.'
            ),
        }

    def calculate_fee(self, amount: Decimal) -> Decimal:
        """Withdrawal fee: 2% or minimum ₦50."""
        return max(amount * self.FEE_RATE, self.MIN_FEE)

    def _description(self, account_number: str, bank_code: str, note: str) -> str:
        base = f'Withdrawal to {account_number} ({bank_code})'
        return f'{base}: {note}' if note else base

    def _notify_and_audit(
        self,
        *,
        user_id: int,
        amount: Decimal,
        fee: Decimal,
        bank_code: str,
        account_number: str,
        account_name: str,
    ) -> None:
        """Best-effort side effects. Failures must not roll back withdrawal."""
        try:
            from modules.notifications.services.notification_service import NotificationService
            from modules.audit.services.audit_service import AuditService

            NotificationService().create_for_user(
                user_id=user_id,
                title="Withdrawal pending",
                body=(
                    f"₦{amount:,.2f} to {account_name or account_number} is pending "
                    "provider processing."
                ),
                category='money',
                source='Wallet',
                amount_value=f"{amount:,.2f}",
                amount_direction='out',
                action_href='/dashboard/activity',
            )
            AuditService().record(
                user_id=user_id,
                action='Withdrawal pending',
                details=(
                    f"Requested ₦{amount:,.2f} to {account_number} "
                    f"({bank_code}); fee ₦{fee:,.2f}; provider unavailable"
                ),
                category='money',
                severity='info',
                actor='You',
                target=account_name or account_number,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning('post-withdraw notify/audit failed: %s', exc)
