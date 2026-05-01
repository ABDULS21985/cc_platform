"""
Wallet Transaction Repository - Data Access Layer
Handles transaction history and idempotency
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from modules.wallet.models.wallet_transaction import WalletTransaction
from modules.auth_v2.extensions import db
from sqlalchemy import desc


class WalletTransactionRepository:
    """
    Repository for WalletTransaction entity
    Ensures idempotency and transaction integrity
    """
    
    def create(self, transaction_data: dict) -> WalletTransaction:
        """
        Create a new transaction record
        
        Args:
            transaction_data: Dictionary containing transaction fields
            
        Returns:
            WalletTransaction: Created transaction instance
            
        Raises:
            IntegrityError: If duplicate reference or bell_mfb_reference
        """
        transaction = WalletTransaction(**transaction_data)
        db.session.add(transaction)
        db.session.commit()
        return transaction
    
    def create_with_balance_tracking(
        self,
        wallet_id: int,
        wallet_balance: Decimal,
        direction: str,
        amount: Decimal,
        fee: Decimal = Decimal('0.00'),
        stamp_duty: Decimal = Decimal('0.00'),
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        reference_prefix: str = "TXN",
        **kwargs
    ) -> WalletTransaction:
        """
        Create a transaction with proper balance tracking and signed amount.
        
        This is the preferred method for creating transactions as it ensures:
        - ULID-based unique reference
        - Signed amount (positive for credit, negative for debit)
        - Balance before/after tracking
        - Metadata support
        
        Args:
            wallet_id: ID of the wallet
            wallet_balance: Current wallet balance BEFORE this transaction
            direction: 'credit' or 'debit' (stored in 'type' column)
            amount: Transaction amount (always positive)
            fee: Transaction fee (default: 0)
            stamp_duty: Stamp duty amount (default: 0)
            description: Transaction description
            metadata: Additional transaction context
            reference_prefix: Prefix for ULID reference (e.g., 'DEP', 'WTH', 'BIL')
            **kwargs: Additional fields (community_id, bill_id, transaction_type, status, etc.)
            
        Returns:
            WalletTransaction: Created transaction with all tracking fields
        """
        # Calculate net amount
        net_amount = amount - fee - stamp_duty
        
        # Calculate signed amount (positive for credit, negative for debit)
        signed_amount = WalletTransaction.compute_signed_amount(net_amount, direction)
        
        # Calculate balance after
        balance_after = wallet_balance + signed_amount
        
        # Generate ULID-based reference
        reference = WalletTransaction.generate_reference(reference_prefix)
        
        transaction_data = {
            'wallet_id': wallet_id,
            'reference': reference,
            'type': direction,
            'amount': amount,
            'signed_amount': signed_amount,
            'fee': fee,
            'stamp_duty': stamp_duty,
            'net_amount': net_amount,
            'balance_before': wallet_balance,
            'balance_after': balance_after,
            'description': description,
            'meta': metadata or {},
            **kwargs
        }
        
        transaction = WalletTransaction(**transaction_data)
        db.session.add(transaction)
        db.session.commit()
        return transaction
    
    def find_filtered(
        self,
        transaction_filter,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple:
        """
        Find transactions using a TransactionFilter.

        The filter's initial query must already be scoped to a wallet.
        Applies filter conditions, orders by ``created_at DESC``, and returns
        ``(transactions, total_count)``.
        """
        transaction_filter.apply().order(WalletTransaction.created_at.desc())
        return transaction_filter.paginate(limit=limit, offset=offset)

    def find_by_id(self, transaction_id: int) -> Optional[WalletTransaction]:
        """Find transaction by ID"""
        return WalletTransaction.query.filter_by(id=transaction_id).first()
    
    def find_by_reference(self, reference: str) -> Optional[WalletTransaction]:
        """
        Find transaction by internal reference
        Used for idempotency checks
        """
        return WalletTransaction.query.filter_by(reference=reference).first()
    
    def find_by_bell_mfb_reference(self, bell_reference: str) -> Optional[WalletTransaction]:
        """
        Find transaction by Bell MFB reference
        Prevents duplicate webhook processing
        """
        return WalletTransaction.query.filter_by(bell_mfb_reference=bell_reference).first()
    
    def find_by_session_id(self, session_id: str) -> Optional[WalletTransaction]:
        """Find transaction by Bell MFB session ID"""
        return WalletTransaction.query.filter_by(bell_mfb_session_id=session_id).first()

    def find_latest_pending_deposit(
        self,
        wallet_id: int,
        amount: Decimal,
        *,
        within_minutes: int = 180,
    ) -> Optional[WalletTransaction]:
        """
        Find the most recent pending deposit transaction matching an amount.

        Used for provider callbacks where we only have account + amount, not our internal reference.
        """
        cutoff = datetime.utcnow() - timedelta(minutes=within_minutes)
        return (
            WalletTransaction.query.filter(
                WalletTransaction.wallet_id == wallet_id,
                WalletTransaction.status == "pending",
                WalletTransaction.type == "deposit",
                WalletTransaction.amount == amount,
                WalletTransaction.created_at >= cutoff,
            )
            .order_by(desc(WalletTransaction.created_at))
            .first()
        )

    def exists_processed_safehaven_event(self, session_id: str | None, provider_reference: str | None) -> bool:
        """
        Idempotency helper for SafeHaven callbacks.

        We store SafeHaven ids in `metadata` when processing a callback.
        """
        if not session_id and not provider_reference:
            return False
        q = WalletTransaction.query
        if session_id:
            q = q.filter(WalletTransaction.meta["safehaven_session_id"].astext == str(session_id))
        if provider_reference:
            q = q.filter(WalletTransaction.meta["safehaven_reference"].astext == str(provider_reference))
        return q.first() is not None
    
    def get_wallet_transactions(
        self, 
        wallet_id: int, 
        limit: int = 50,
        offset: int = 0,
        transaction_type: Optional[str] = None
    ) -> List[WalletTransaction]:
        """
        Get transactions for a specific wallet
        
        Args:
            wallet_id: ID of wallet
            limit: Maximum number of transactions to return
            offset: Number of transactions to skip (for pagination)
            transaction_type: Filter by type ('credit' or 'debit'), None for all
            
        Returns:
            List of WalletTransaction instances
        """
        query = WalletTransaction.query.filter_by(wallet_id=wallet_id)
        
        if transaction_type:
            query = query.filter_by(type=transaction_type)
        
        return query.order_by(
            WalletTransaction.created_at.desc()
        ).limit(limit).offset(offset).all()
    
    def get_successful_transactions(
        self, 
        wallet_id: int, 
        limit: int = 50
    ) -> List[WalletTransaction]:
        """Get successful transactions for a wallet"""
        return WalletTransaction.query.filter_by(
            wallet_id=wallet_id,
            status='successful'
        ).order_by(
            WalletTransaction.created_at.desc()
        ).limit(limit).all()
    
    def get_pending_transactions(
        self, 
        older_than_minutes: int = 5,
        limit: int = 10,
        wallet_id: Optional[int] = None
    ) -> List[WalletTransaction]:
        """
        Get pending transactions older than specified minutes
        Used for retry/timeout handling and verification polling
        
        Args:
            older_than_minutes: Get transactions pending for this many minutes
            limit: Maximum number to return
            wallet_id: Optional wallet_id to filter by specific wallet
            
        Returns:
            List of pending WalletTransaction instances
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=older_than_minutes)
        
        query = WalletTransaction.query.filter(
            WalletTransaction.status == 'pending',
            WalletTransaction.created_at < cutoff_time
        )
        
        if wallet_id:
            query = query.filter_by(wallet_id=wallet_id)
        
        return query.limit(limit).all()
    
    def update_status(
        self, 
        transaction_id: int, 
        status: str,
        **kwargs
    ) -> Optional[WalletTransaction]:
        """
        Update transaction status with optional fields
        
        Args:
            transaction_id: ID of transaction
            status: New status ('pending', 'successful', 'failed')
            **kwargs: Additional fields (webhook_received_at, completed_at, etc.)
            
        Returns:
            Updated WalletTransaction or None if not found
        """
        transaction = self.find_by_id(transaction_id)
        if not transaction:
            return None
        
        transaction.status = status
        
        for key, value in kwargs.items():
            if hasattr(transaction, key):
                setattr(transaction, key, value)
        
        db.session.commit()
        db.session.refresh(transaction)
        return transaction
    
    def mark_as_successful(
        self, 
        transaction_id: int,
        completed_at: Optional[datetime] = None
    ) -> Optional[WalletTransaction]:
        """Mark transaction as successful"""
        if not completed_at:
            completed_at = datetime.utcnow()
        
        return self.update_status(
            transaction_id,
            'successful',
            completed_at=completed_at
        )
    
    def mark_as_failed(
        self, 
        transaction_id: int
    ) -> Optional[WalletTransaction]:
        """Mark transaction as failed"""
        return self.update_status(
            transaction_id,
            'failed',
            completed_at=datetime.utcnow()
        )
    
    def count_wallet_transactions(
        self, 
        wallet_id: int,
        transaction_type: Optional[str] = None
    ) -> int:
        """Count total transactions for a wallet"""
        query = WalletTransaction.query.filter_by(wallet_id=wallet_id)
        
        if transaction_type:
            query = query.filter_by(type=transaction_type)
        
        return query.count()
    
    def find_latest_membership_payment(
        self,
        community_id: int,
        user_id: int
    ) -> Optional[WalletTransaction]:
        """
        Find the latest membership payment transaction for a user in a community.
        
        Args:
            community_id: The community ID
            user_id: The user ID
            
        Returns:
            The latest membership payment transaction or None
        """
        from modules.wallet.models import Wallet
        
        # First find the user's wallet
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            return None
        
        # Find the latest membership payment for this community
        return WalletTransaction.query.filter_by(
            wallet_id=wallet.id,
            community_id=community_id,
            transaction_type='membership_payment'
        ).order_by(WalletTransaction.created_at.desc()).first()
