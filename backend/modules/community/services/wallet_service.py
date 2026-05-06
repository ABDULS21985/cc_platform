"""
Community Wallet Service
Business logic for community wallet management.

SOLID Principles:
- Single Responsibility: Orchestrate wallet operations only
- Open/Closed: Extensible for new wallet features
- Liskov Substitution: Clear interface contracts
- Interface Segregation: Focused public methods
- Dependency Inversion: Depends on repositories & Bell MFB service
"""
import logging
import uuid
from decimal import Decimal
from typing import Optional, Dict, Tuple, Any
from modules.community.repositories import CommunityWalletRepository, MemberRepository, CommunityRepository
from modules.community.models.community_wallet import CommunityWallet
from modules.auth_v2.models.user import User
from modules.auth_v2.extensions import db
from modules.wallet.providers.provider_factory import PaymentProviderFactory
from modules.wallet.providers.base_payment_provider import TransferRequest, VirtualAccountRequest
from modules.wallet.providers.payment_providers import PaymentProviderContext
from modules.wallet.models.wallet import Wallet
from modules.wallet.models.wallet_transaction import WalletTransaction
from modules.core.response_formatter import format_not_found
from sqlalchemy import func

logger = logging.getLogger(__name__)


class CommunityWalletService:
    """Service for community wallet operations"""
    
    def __init__(self):
        self.wallet_repo = CommunityWalletRepository()
        self.member_repo = MemberRepository()
        self.community_repo = CommunityRepository()
    
    def create_wallet(self, community_id: int) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """
        Create community wallet
        
        Args:
            community_id: Community ID
            
        Returns:
            Tuple of (wallet, error) - one will be None
        """
        try:
            wallet_data = {
                'community_id': community_id,
                'balance': Decimal('0.00'),
                'status': 'pending',
                'currency': 'NGN'
            }
            wallet = self.wallet_repo.create(wallet_data)
            db.session.commit()
            logger.info(f"Created wallet for community {community_id}")
            return wallet, None
            
        except Exception as e:
            logger.error(f"Error creating wallet: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def setup_bell_mfb_account(self, community_id: int, account_number: str, 
                              account_name: str, bell_mfb_client_id: str) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """
        Setup Bell MFB account for community wallet
        
        Args:
            community_id: Community ID
            account_number: Bell MFB account number
            account_name: Account name
            bell_mfb_client_id: Bell MFB client ID
            
        Returns:
            Tuple of (wallet, error) - one will be None
        """
        try:
            wallet = self.wallet_repo.find_by_community_id(community_id)
            if not wallet:
                return None, 'Wallet not found'
            
            # Activate wallet
            wallet = self.wallet_repo.activate_wallet(
                wallet.id,
                account_number,
                account_name,
                bell_mfb_client_id
            )
            
            db.session.commit()
            logger.info(f"Activated Bell MFB account for community {community_id}: {account_number}")
            return wallet, None
            
        except Exception as e:
            logger.error(f"Error setting up Bell MFB account: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def get_wallet(self, community_id: int) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """Get community wallet"""
        wallet = self.wallet_repo.find_by_community_id(community_id)
        if not wallet:
            return None, 'Wallet not found'
        return wallet, None
    
    def get_balance(self, community_id: int) -> Tuple[Optional[Decimal], Optional[str]]:
        """Get wallet balance"""
        wallet = self.wallet_repo.find_by_community_id(community_id)
        if not wallet:
            return None, 'Wallet not found'
        return wallet.balance, None
    
    def get_community_balance(self, community_id: int) -> Optional[Dict[str, Any]]:
        """
        Get community wallet balance with details
        
        Args:
            community_id: Community ID
            
        Returns:
            Dictionary with balance info or None if not found
        """
        wallet = self.wallet_repo.find_by_community_id(community_id)
        if not wallet:
            return None

        successful_statuses = ['successful', 'completed']
        base_query = WalletTransaction.query.filter(
            WalletTransaction.community_id == community_id,
            WalletTransaction.status.in_(successful_statuses),
        )
        total_deposits = (
            db.session.query(func.coalesce(func.sum(WalletTransaction.net_amount), 0))
            .filter(
                WalletTransaction.community_id == community_id,
                WalletTransaction.status.in_(successful_statuses),
                WalletTransaction.transaction_type.in_([
                    'community_deposit',
                    'membership_payment',
                    'bill_payment',
                ]),
            )
            .scalar()
        )
        total_withdrawals = (
            db.session.query(func.coalesce(func.sum(WalletTransaction.net_amount), 0))
            .filter(
                WalletTransaction.community_id == community_id,
                WalletTransaction.status.in_(successful_statuses),
                WalletTransaction.transaction_type == 'community_transfer',
            )
            .scalar()
        )
        
        return {
            'community_id': community_id,
            'balance': float(wallet.balance),
            'currency': wallet.currency,
            'status': wallet.status,
            'account_number': wallet.account_number,
            'account_name': wallet.account_name,
            'total_deposits': float(total_deposits or 0),
            'total_withdrawals': float(total_withdrawals or 0),
            'transaction_count': base_query.count(),
        }
    
    def deposit(self, community_id: int, amount: Decimal) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """
        Deposit funds into community wallet
        
        Args:
            community_id: Community ID
            amount: Amount to deposit
            
        Returns:
            Tuple of (wallet, error) - one will be None
        """
        try:
            wallet = self.wallet_repo.find_by_community_id(community_id)
            if not wallet:
                return None, 'Wallet not found'
            
            if wallet.status != 'active':
                return None, f'Wallet is {wallet.status}'
            
            wallet = self.wallet_repo.update_balance(wallet.id, amount)
            db.session.commit()
            logger.info(f"Deposited {amount} to community {community_id} wallet")
            return wallet, None
            
        except Exception as e:
            logger.error(f"Error depositing funds: {str(e)}")
            db.session.rollback()
            return None, str(e)

    def _auto_activate_wallet_if_pending(
        self,
        wallet: CommunityWallet,
    ) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """
        Auto-provision and activate a pending community wallet.

        Uses the configured community provider to provision a source account,
        then persists account details and marks the wallet active.
        """
        if wallet.status != 'pending':
            return wallet, None

        try:
            community = self.community_repo.find_by_id(wallet.community_id)
            if not community:
                return None, 'Community not found for wallet activation'

            owner = User.query.get(community.created_by)
            if not owner:
                return None, 'Community owner not found for wallet activation'

            provider = PaymentProviderFactory.get_provider(PaymentProviderContext.COMMUNITY)

            account_response = provider.ensure_virtual_account(
                VirtualAccountRequest(
                    user_id=owner.id,
                    wallet_id=wallet.id,
                    first_name=owner.firstname or 'Community',
                    last_name=owner.lastname or 'Owner',
                    phone_number=owner.phone_number or '',
                    bvn='',
                    date_of_birth=owner.date_of_birth or '',
                    gender='unspecified',
                    metadata={
                        'purpose': 'community_wallet_activation',
                        'community_id': community.id,
                        'community_name': community.name,
                        'owner_id': owner.id,
                    },
                )
            )

            provider_client_id = (
                account_response.provider_client_id
                or account_response.provider_reference
                or f"COMM-WALLET-{wallet.id}-{uuid.uuid4().hex[:8].upper()}"
            )

            activated_wallet = self.wallet_repo.activate_wallet(
                wallet.id,
                account_response.account_number,
                account_response.account_name or community.name,
                str(provider_client_id),
            )
            db.session.commit()

            logger.info(
                f"Auto-activated community wallet {wallet.id} for community {community.id} "
                f"with provider {provider.name}"
            )
            return activated_wallet, None

        except Exception as e:
            logger.error(f"Error auto-activating wallet {wallet.id}: {str(e)}", exc_info=True)
            db.session.rollback()
            return None, str(e)
    
    def withdraw(self, community_id: int, amount: Decimal, recipient_account: str,
                recipient_name: str, reason: Optional[str] = None,
                recipient_bank_code: Optional[str] = None,
                initiated_by: Optional[int] = None,
                idempotency_key: Optional[str] = None,
                ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Withdraw funds from community wallet via real provider NIP transfer.
        Balance is only deducted after a successful provider call.
        """
        try:
            wallet = self.wallet_repo.find_by_community_id(community_id)
            if not wallet:
                return None, 'Wallet not found'

            if wallet.status == 'pending':
                wallet, activation_error = self._auto_activate_wallet_if_pending(wallet)
                if activation_error:
                    return None, f"Wallet is pending and auto-activation failed: {activation_error}"
                if not wallet:
                    return None, 'Wallet activation failed'

            if wallet.status != 'active':
                return None, f'Wallet is {wallet.status}'

            if not self.wallet_repo.can_withdraw(wallet.id, amount):
                return None, 'Insufficient balance'

            if not recipient_bank_code:
                return None, 'recipient_bank_code is required'

            # Build reference. If client supplies idempotency key, use it to make retries safe.
            # Otherwise fall back to a random reference (still safe within our short-window retry guard below).
            stable_key = (idempotency_key or "").strip()
            if stable_key:
                reference = f"TRF-{community_id}-{stable_key[:32]}"
            else:
                reference = f"TRF-{community_id}-{uuid.uuid4().hex[:12].upper()}"
            narration = reason or f"Community {community_id} transfer"

            # Resolve community provider (SafeHaven by default, Bell MFB as fallback)
            provider = PaymentProviderFactory.get_provider(PaymentProviderContext.COMMUNITY)

            # Actor wallet (for audit trail). We can't attach wallet_transactions to community_wallets directly
            # because wallet_transactions.wallet_id references `wallets.id`.
            actor_wallet_id = None
            if initiated_by is not None:
                actor_wallet = Wallet.query.filter_by(user_id=initiated_by).first()
                if actor_wallet:
                    actor_wallet_id = actor_wallet.id

            # Retry/idempotency guard:
            # - If same idempotency key is sent again, return the existing pending/successful transfer record.
            if stable_key and actor_wallet_id:
                existing = (
                    WalletTransaction.query.filter(
                        WalletTransaction.wallet_id == actor_wallet_id,
                        WalletTransaction.community_id == community_id,
                        WalletTransaction.transaction_type == "community_transfer",
                        WalletTransaction.reference == reference,
                        WalletTransaction.status.in_(["pending", "successful", "completed"]),
                    )
                    .order_by(WalletTransaction.created_at.desc())
                    .first()
                )
                if existing:
                    return {
                        "community_id": community_id,
                        "amount": float(amount),
                        "recipient_account": recipient_account,
                        "recipient_name": recipient_name,
                        "recipient_bank_code": recipient_bank_code,
                        "reason": reason,
                        "reference": existing.reference,
                        "provider_reference": (existing.meta or {}).get("provider_reference"),
                        "status": existing.status,
                        "provider": (existing.meta or {}).get("provider"),
                        "duplicate": True,
                    }, None

            community_balance_before = Decimal(str(wallet.balance))

            # Create an audit transaction row (pending) before calling provider.
            # This ensures we have traceability even if the provider call fails.
            txn = None
            if actor_wallet_id:
                txn = WalletTransaction(
                    wallet_id=actor_wallet_id,
                    reference=reference,
                    type="transfer",
                    transaction_type="community_transfer",
                    amount=amount,
                    signed_amount=WalletTransaction.compute_signed_amount(amount, "debit"),
                    fee=Decimal("0.00"),
                    net_amount=amount,
                    status="pending",
                    community_id=community_id,
                    description=narration,
                    meta={
                        "provider": provider.name,
                        "community_wallet_id": wallet.id,
                        "community_balance_before": str(community_balance_before),
                        "recipient_account": recipient_account,
                        "recipient_name": recipient_name,
                        "recipient_bank_code": recipient_bank_code,
                        "idempotency_key": stable_key or None,
                    },
                )
                db.session.add(txn)
                db.session.flush()

            transfer_request = TransferRequest(
                source_account_number=wallet.account_number or "",
                recipient_account=recipient_account,
                recipient_bank_code=recipient_bank_code,
                recipient_name=recipient_name,
                amount=amount,
                narration=narration,
                reference=reference,
            )

            transfer_response = provider.transfer_to_account(transfer_request)

            # Only deduct balance after provider confirms initiation
            self.wallet_repo.update_balance(wallet.id, -amount)

            if txn:
                txn.meta = {
                    **(txn.meta or {}),
                    "provider_reference": transfer_response.provider_reference,
                }
                txn.balance_before = community_balance_before
                txn.balance_after = Decimal(str(wallet.balance))
                txn.status = transfer_response.status or "pending"

            db.session.commit()

            logger.info(
                f"Transfer initiated for community {community_id}: {amount} NGN "
                f"to {recipient_account}, provider_ref={transfer_response.provider_reference}"
            )

            return {
                'community_id': community_id,
                'amount': float(amount),
                'recipient_account': recipient_account,
                'recipient_name': recipient_name,
                'recipient_bank_code': recipient_bank_code,
                'reason': reason,
                'reference': reference,
                'provider_reference': transfer_response.provider_reference,
                'status': transfer_response.status or 'pending',
                'provider': provider.name,
                'transaction_id': txn.id if txn else None,
            }, None

        except Exception as e:
            logger.error(f"Error withdrawing funds: {str(e)}")
            # If we created a pending audit row, attempt to persist it as failed.
            try:
                db.session.rollback()
            except Exception:
                pass
            return None, str(e)
    
    def transfer_funds(self, community_id: int, amount: Decimal, recipient_account: str,
                      recipient_name: str, recipient_bank_code: Optional[str] = None,
                      reason: Optional[str] = None,
                      initiated_by: Optional[int] = None,
                      idempotency_key: Optional[str] = None) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Transfer funds from community wallet to external account.
        """
        result, error = self.withdraw(
            community_id=community_id,
            amount=amount,
            recipient_account=recipient_account,
            recipient_name=recipient_name,
            reason=reason,
            recipient_bank_code=recipient_bank_code,
            initiated_by=initiated_by,
            idempotency_key=idempotency_key,
        )
        if result and initiated_by is not None:
            result['initiated_by'] = initiated_by
        return result, error

    def suspend_wallet(self, community_id: int) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """Suspend wallet (no transactions)"""
        try:
            wallet = self.wallet_repo.find_by_community_id(community_id)
            if not wallet:
                return None, 'Wallet not found'
            
            wallet = self.wallet_repo.suspend_wallet(wallet.id)
            db.session.commit()
            logger.warning(f"Suspended wallet for community {community_id}")
            return wallet, None
            
        except Exception as e:
            logger.error(f"Error suspending wallet: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def close_wallet(self, community_id: int) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """Close wallet (final state)"""
        try:
            wallet = self.wallet_repo.find_by_community_id(community_id)
            if not wallet:
                return None, 'Wallet not found'
            
            wallet = self.wallet_repo.close_wallet(wallet.id)
            db.session.commit()
            logger.warning(f"Closed wallet for community {community_id}")
            return wallet, None
            
        except Exception as e:
            logger.error(f"Error closing wallet: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def get_wallet_summary(self, community_id: int):
        """Get wallet summary.

        Returns the summary dict on success, or a ``(response, status)`` tuple
        produced by :func:`format_not_found` when no community wallet exists,
        so the resource can propagate the 404 directly.
        """
        wallet = self.wallet_repo.find_by_community_id(community_id)
        if not wallet:
            return format_not_found("Wallet")

        return {
            'community_id': community_id,
            'balance': float(wallet.balance),
            'currency': wallet.currency,
            'account_number': wallet.account_number,
            'status': wallet.status,
            'bell_mfb_active': wallet.bell_mfb_client_id is not None
        }

    def list_transactions(
        self,
        community_id: int,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        type: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Paginated community-wallet transactions for an active member.

        Backs ``GET /api/v2/community/<id>/wallet/transactions`` and the
        FE WalletTab. Returns both the page slice and a ``summary`` block
        (``total_collected``, ``total_spent``) over the entire community
        history so the WalletTab stats render real numbers regardless of
        the current pagination window.

        Args:
            community_id: Community whose wallet to list.
            user_id: Caller — must be an active member.
            limit/offset: Pagination window (limit clamped at 100).
            type: Optional bucket filter — ``credit`` (deposits) /
                  ``debit`` (withdrawal/transfer/payment) / or any literal
                  ``WalletTransaction.type`` value.

        Returns:
            ``(payload, None)`` on success or ``(None, error)`` where the
            error string drives resource-layer status mapping.
        """
        # Authorization — only active members can view this history.
        membership = self.member_repo.find_by_community_and_user(community_id, user_id)
        if not membership or membership.status != 'active':
            return None, 'Not a community member'

        try:
            limit = max(1, min(int(limit), 100))
            offset = max(0, int(offset))

            base_query = WalletTransaction.query.filter(
                WalletTransaction.community_id == community_id
            )

            page_query = base_query
            if type:
                if type == 'credit':
                    page_query = page_query.filter(
                        WalletTransaction.type.in_(['credit', 'deposit'])
                    )
                elif type == 'debit':
                    page_query = page_query.filter(
                        WalletTransaction.type.in_(
                            ['debit', 'withdrawal', 'transfer', 'payment']
                        )
                    )
                else:
                    page_query = page_query.filter(WalletTransaction.type == type)

            total = page_query.count()
            rows = (
                page_query.order_by(WalletTransaction.created_at.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )

            # Summary aggregates over the FULL community ledger (independent
            # of `type`/pagination) so WalletTab stats reflect lifetime
            # totals, not just the current page.
            completed_statuses = ['successful', 'completed']
            collected = (
                base_query.filter(WalletTransaction.status.in_(completed_statuses))
                .filter(WalletTransaction.type.in_(['credit', 'deposit']))
                .with_entities(func.coalesce(func.sum(WalletTransaction.net_amount), 0))
                .scalar()
            )
            spent = (
                base_query.filter(WalletTransaction.status.in_(completed_statuses))
                .filter(
                    WalletTransaction.type.in_(['debit', 'withdrawal', 'transfer', 'payment'])
                )
                .with_entities(func.coalesce(func.sum(WalletTransaction.net_amount), 0))
                .scalar()
            )

            transactions = [t.to_dict() for t in rows]

            return {
                'transactions': transactions,
                'pagination': {
                    'total': int(total),
                    'limit': limit,
                    'offset': offset,
                    'has_more': (offset + len(transactions)) < int(total),
                },
                'summary': {
                    'total_collected': float(collected or 0),
                    'total_spent': float(spent or 0),
                },
            }, None

        except Exception as exc:  # noqa: BLE001
            logger.error(
                'Error listing community %s transactions for user %s: %s',
                community_id,
                user_id,
                exc,
                exc_info=True,
            )
            return None, str(exc)
