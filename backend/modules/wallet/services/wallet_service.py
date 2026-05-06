"""
Wallet Service - Business logic for wallet operations
Orchestrates wallet and transaction operations
"""
import logging
from typing import Dict, Any, List, Optional
from decimal import Decimal
from modules.wallet.repositories.wallet_repository import WalletRepository
from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository

logger = logging.getLogger(__name__)


class WalletService:
    """
    Service for wallet operations
    
    Responsibilities:
    - Get wallet information
    - Get transaction history
    - Calculate balances
    
    Business Logic Layer: Orchestrates repositories
    """
    
    def __init__(self):
        """Initialize service with dependencies"""
        self.wallet_repo = WalletRepository()
        self.transaction_repo = WalletTransactionRepository()
    
    def get_user_wallet(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get wallet information for a user
        
        Args:
            user_id: ID of user
            
        Returns:
            Dictionary with wallet info or None if not found
        """
        wallet = self.wallet_repo.find_by_user_id(user_id)
        
        if not wallet:
            return None
        
        return wallet.to_dict()
    
    def get_wallet_transactions(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        transaction_type: Optional[str] = None,
        args: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Get transaction history for user's wallet.

        Args:
            user_id:          ID of user.
            limit:            Maximum transactions to return (default 50).
            offset:           Pagination offset (default 0).
            transaction_type: Legacy shorthand — filter by 'credit' or 'debit'.
                              Superseded by ``args['type']`` when ``args`` is
                              provided.
            args:             Validated Marshmallow args dict from
                              ``TransactionQuerySchema``.  Merged with
                              ``transaction_type`` for backward compatibility.

        Returns:
            Dictionary with transactions and pagination info.
        """
        from modules.wallet.filters import TransactionFilter
        from modules.wallet.models.wallet_transaction import WalletTransaction

        wallet = self.wallet_repo.find_by_user_id(user_id)

        if not wallet:
            return {
                'transactions': [],
                'pagination': {
                    'total': 0,
                    'limit': limit,
                    'offset': offset,
                    'has_more': False,
                }
            }

        # Build filter args — args dict takes precedence; transaction_type is
        # kept for backward compatibility with callers that still use it.
        filter_args: Dict[str, Any] = dict(args or {})
        if transaction_type and 'type' not in filter_args:
            filter_args['type'] = transaction_type

        base_query = WalletTransaction.query.filter_by(wallet_id=wallet.id)
        f = TransactionFilter(base_query, filter_args)
        transactions, total_count = (
            f.apply()
             .order(WalletTransaction.created_at.desc())
             .paginate(limit=limit, offset=offset)
        )

        # Enrich transactions for UI:
        # - payer_name (owner of the wallet)
        # - provider (from metadata/source)
        # - virtual_account details (account used for funding/collections)
        payer_name = None
        try:
            payer_name = wallet.user.full_name  # relationship
        except Exception:
            payer_name = None

        def _provider_from_meta(meta: dict | None) -> str | None:
            m = meta or {}
            # Normalize common sources across flows
            if m.get("provider"):
                return str(m["provider"])
            src = (m.get("source") or "").lower()
            if "safehaven" in src:
                return "safehaven"
            if "bell" in src:
                return "bell_mfb"
            return None

        def _bank_name_for_provider(provider: str | None) -> str | None:
            if not provider:
                return None
            p = provider.lower()
            if p in {"safehaven", "safe_haven"}:
                return "SafeHaven MFB"
            if p in {"bell", "bell_mfb"}:
                return "Bell MFB"
            return provider

        return {
            'transactions': [
                {
                    **txn.to_dict(),
                    "payer_name": payer_name,
                    "provider": _provider_from_meta(txn.meta),
                    "virtual_account": {
                        "account_number": wallet.account_number,
                        "account_name": wallet.account_name,
                        "bank_name": _bank_name_for_provider(_provider_from_meta(txn.meta)),
                    },
                }
                for txn in transactions
            ],
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + len(transactions)) < total_count,
            }
        }
    
    def get_wallet_summary(self, user_id: int) -> Dict[str, Any]:
        """
        Get wallet summary with balance and recent transactions
        
        Args:
            user_id: ID of user
            
        Returns:
            Dictionary with wallet summary
        """
        wallet = self.wallet_repo.find_by_user_id(user_id)
        
        if not wallet:
            return {
                'success': False,
                'error': 'not_found',
                'message': 'Wallet not found',
                'wallet': None,
                'recent_transactions': [],
                'summary': {
                    'total_credits': '0.00',
                    'total_debits': '0.00',
                    'transaction_count': 0
                }
            }
        
        # Get recent transactions (last 10)
        recent_transactions = self.transaction_repo.get_wallet_transactions(
            wallet.id,
            limit=10,
            offset=0
        )
        
        # Get successful transactions for summary
        all_successful = self.transaction_repo.get_successful_transactions(
            wallet.id,
            limit=1000  # Get all for calculation
        )
        
        total_credits, total_debits = self._aggregate_credit_debit_totals(all_successful)
        
        return {
            'wallet': wallet.to_dict(),
            'recent_transactions': [txn.to_dict() for txn in recent_transactions],
            'summary': {
                'total_credits': str(total_credits),
                'total_debits': str(total_debits),
                'transaction_count': len(all_successful)
            }
        }

    def _aggregate_credit_debit_totals(self, transactions: List[Any]) -> tuple[Decimal, Decimal]:
        """
        Aggregate wallet totals across legacy accounting and current business types.

        Older rows used ``credit``/``debit`` in ``type``. Current rows use
        business values such as ``deposit``, ``withdrawal`` and ``payment`` and
        carry the accounting direction in ``signed_amount``.
        """
        credit_types = {'credit', 'deposit'}
        debit_types = {
            'debit',
            'withdrawal',
            'transfer',
            'payment',
            'bill_payment',
            'membership_payment',
            'community_payment',
        }
        total_credits = Decimal('0.00')
        total_debits = Decimal('0.00')

        for txn in transactions:
            signed_amount = getattr(txn, 'signed_amount', None)
            if signed_amount is not None:
                signed = Decimal(signed_amount)
                if signed > 0:
                    total_credits += signed
                elif signed < 0:
                    total_debits += abs(signed)
                continue

            txn_type = str(getattr(txn, 'type', '') or '').lower()
            business_type = str(getattr(txn, 'transaction_type', '') or '').lower()
            amount = Decimal(getattr(txn, 'net_amount', None) or getattr(txn, 'amount', 0) or 0)

            if txn_type in credit_types or business_type in credit_types:
                total_credits += amount
            elif txn_type in debit_types or business_type in debit_types:
                total_debits += amount

        return total_credits, total_debits
    
    def check_wallet_exists(self, user_id: int) -> bool:
        """
        Check if user has a wallet
        
        Args:
            user_id: ID of user
            
        Returns:
            True if wallet exists, False otherwise
        """
        wallet = self.wallet_repo.find_by_user_id(user_id)
        return wallet is not None

    def get_wallet_transaction(self, user_id: int, transaction_id: int) -> Optional[Dict[str, Any]]:
        """Return one transaction only when it belongs to the user's wallet."""
        wallet = self.wallet_repo.find_by_user_id(user_id)
        if not wallet:
            return None
        txn = self.transaction_repo.find_by_id(transaction_id)
        if not txn or txn.wallet_id != wallet.id:
            return None
        return txn.to_dict()
