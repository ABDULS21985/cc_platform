"""
WalletTransaction Model
Stores all wallet transactions (credits and debits).

SOLID Principles:
- Single Responsibility: Only handles transaction data persistence
- Open/Closed: Extensible for new transaction types
- Liskov Substitution: Standard SQLAlchemy model
- Interface Segregation: Clean interface with helper methods
- Dependency Inversion: Depends on SQLAlchemy abstraction
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from modules.auth_v2.extensions import db
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB
from ulid import ULID


class WalletTransaction(db.Model):
    """
    Wallet transaction record (credit or debit).
    
    Attributes:
        id: Primary key
        wallet_id: Foreign key to wallets table
        reference: Our unique transaction reference
        bell_mfb_reference: Bell MFB's transaction reference
        bell_mfb_session_id: Bell MFB session ID
        type: 'credit' or 'debit'
        amount: Transaction amount (before fees)
        fee: Transaction fee
        stamp_duty: Government stamp duty
        net_amount: Final amount (amount - fee - stamp_duty)
        description: Transaction description
        source_account_number: Source account (for credits)
        source_account_name: Source account holder name
        source_bank_code: Source bank code
        source_bank_name: Source bank name
        destination_account_number: Destination account (for debits)
        destination_account_name: Destination account holder name
        status: 'pending', 'successful', 'failed'
        webhook_received_at: When webhook was received
        completed_at: When transaction completed
        created_at: Transaction creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = 'wallet_transactions'
    
    # Primary key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign keys
    wallet_id = db.Column(
        db.Integer, 
        db.ForeignKey('wallets.id', ondelete='CASCADE'), 
        nullable=False, 
        index=True
    )
    
    # Community-related foreign keys (for community bill payments)
    community_id = db.Column(
        db.Integer, 
        db.ForeignKey('communities.id', ondelete='SET NULL'), 
        nullable=True,
        index=True
    )
    bill_id = db.Column(
        db.Integer, 
        db.ForeignKey('bills.id', ondelete='SET NULL'), 
        nullable=True,
        index=True
    )
    bill_session_id = db.Column(
        db.Integer, 
        db.ForeignKey('bill_sessions.id', ondelete='SET NULL'), 
        nullable=True,
        index=True
    )
    payment_intent_id = db.Column(db.String(100), nullable=True, index=True)
    transaction_type = db.Column(db.String(50), nullable=True)  # 'bill_payment', 'deposit', 'withdrawal', etc.

    # Optional navigation relationships (useful for admin/reporting)
    community = db.relationship("Community", foreign_keys=[community_id])
    bill = db.relationship("Bill", foreign_keys=[bill_id])
    bill_session = db.relationship("BillSession", foreign_keys=[bill_session_id])
    
    # Transaction references
    reference = db.Column(db.String(100), unique=True, nullable=False, index=True)
    bell_mfb_reference = db.Column(db.String(100), unique=True, nullable=True, index=True)
    bell_mfb_session_id = db.Column(db.String(100), nullable=True)
    
    # Transaction details
    type = db.Column(db.String(10), nullable=False)  # 'credit' or 'debit'
    amount = db.Column(db.Numeric(15, 2), nullable=False)  # Always positive
    signed_amount = db.Column(db.Numeric(15, 2), nullable=True)  # Positive for credit, negative for debit
    fee = db.Column(db.Numeric(15, 2), default=Decimal('0.00'), nullable=False)
    stamp_duty = db.Column(db.Numeric(15, 2), default=Decimal('0.00'), nullable=False)
    net_amount = db.Column(db.Numeric(15, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    balance_before = db.Column(db.Numeric(15, 2), nullable=True)
    balance_after = db.Column(db.Numeric(15, 2), nullable=True)
    meta = db.Column('metadata', JSONB, nullable=True, default=dict)
    source_account_number = db.Column(db.String(50), nullable=True)
    source_account_name = db.Column(db.String(255), nullable=True)
    source_bank_code = db.Column(db.String(10), nullable=True)
    source_bank_name = db.Column(db.String(100), nullable=True)
    destination_account_number = db.Column(db.String(50), nullable=True)
    destination_account_name = db.Column(db.String(255), nullable=True)
    
    status = db.Column(
        db.String(20), 
        default='pending', 
        nullable=False,
        index=True
    )
    
    webhook_received_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<WalletTransaction(id={self.id}, ref='{self.reference}', "
            f"type='{self.type}', amount={self.amount}, status='{self.status}')>"
        )
    
    def to_dict(self) -> dict:
        """
        Convert to dictionary (for API responses).
        
        Returns:
            Dictionary representation
        """
        meta = self.meta or {}
        destination_bank_name = (
            meta.get("destination_bank_name")
            or meta.get("bank_name")
            or meta.get("destination_bank")
        )
        # The frontend SDK declares `destination_bank_code` (api.ts:274) but
        # the column is not stored on the row directly — withdrawals stash it
        # in the `meta` JSONB under either `destination_bank_code` or
        # `bank_code`. Mirror the multi-key fallback used for bank name.
        destination_bank_code = (
            meta.get("destination_bank_code")
            or meta.get("bank_code")
        )

        return {
            "id": self.id,
            "reference": self.reference,
            "bell_mfb_reference": self.bell_mfb_reference,
            "type": self.type,
            "amount": str(self.amount),
            "signed_amount": str(self.signed_amount) if self.signed_amount is not None else None,
            "fee": str(self.fee),
            "stamp_duty": str(self.stamp_duty),
            "net_amount": str(self.net_amount),
            "balance_before": str(self.balance_before) if self.balance_before is not None else None,
            "balance_after": str(self.balance_after) if self.balance_after is not None else None,
            "description": self.description,
            "source_account_number": self.source_account_number,
            "source_account_name": self.source_account_name,
            "source_bank_code": self.source_bank_code,
            "source_bank_name": self.source_bank_name,
            "destination_account_number": self.destination_account_number,
            "destination_account_name": self.destination_account_name,
            "destination_bank_name": destination_bank_name,
            "destination_bank_code": destination_bank_code,
            "status": self.status,
            "community_id": self.community_id,
            "bill_id": self.bill_id,
            "bill_session_id": self.bill_session_id,
            "transaction_type": self.transaction_type,
            "meta": self.meta,
            "note": meta.get("note"),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def mark_as_successful(self) -> None:
        """Mark transaction as successful (DRY principle)."""
        self.status = 'successful'
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def mark_as_failed(self) -> None:
        """Mark transaction as failed (DRY principle)."""
        self.status = 'failed'
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def record_webhook_receipt(self) -> None:
        """Record when webhook was received."""
        self.webhook_received_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    @property
    def is_successful(self) -> bool:
        """Check if transaction was successful."""
        return self.status == 'successful'
    
    @property
    def is_pending(self) -> bool:
        """Check if transaction is pending."""
        return self.status == 'pending'
    
    @property
    def is_failed(self) -> bool:
        """Check if transaction failed."""
        return self.status == 'failed'
    
    @property
    def is_credit(self) -> bool:
        """Check if transaction is a credit (incoming)."""
        return self.type == 'credit'
    
    @property
    def is_debit(self) -> bool:
        """Check if transaction is a debit (outgoing)."""
        return self.type == 'debit'
    
    @property
    def formatted_amount(self) -> str:
        """Get formatted amount with currency symbol."""
        return f"₦{self.amount:,.2f}"
    
    @property
    def formatted_net_amount(self) -> str:
        """Get formatted net amount with currency symbol."""
        return f"₦{self.net_amount:,.2f}"
    
    @staticmethod
    def generate_reference(prefix: str = "TXN") -> str:
        """
        Generate a unique transaction reference using ULID.
        
        ULID provides:
        - Lexicographically sortable (time-ordered)
        - 128-bit compatibility with UUID
        - URL-safe (Crockford's base32)
        - Monotonic sort order within same millisecond
        
        Args:
            prefix: Optional prefix for the reference (e.g., 'DEP', 'WTH', 'BIL')
            
        Returns:
            Unique reference string in format: PREFIX-ULID (e.g., TXN-01ARZ3NDEKTSV4RRFFQ69G5FAV)
        """
        return f"{prefix}-{str(ULID())}"
    
    @staticmethod
    def compute_signed_amount(amount: Decimal, transaction_type: str) -> Decimal:
        """
        Compute signed amount based on transaction type.
        
        Standard accounting convention:
        - Credit (incoming): Positive amount
        - Debit (outgoing): Negative amount
        
        Args:
            amount: The absolute transaction amount
            transaction_type: 'credit' or 'debit'
            
        Returns:
            Signed amount (positive for credit, negative for debit)
        """
        abs_amount = abs(amount)
        debit_types = {
            'debit',
            'withdrawal',
            'transfer',
            'payment',
            'bill_payment',
            'membership_payment',
        }

        if str(transaction_type).lower() in debit_types:
            return -abs_amount
        return abs_amount
    
    def set_balance_snapshot(self, wallet_balance_before: Decimal) -> None:
        """
        Set balance_before and calculate balance_after based on transaction.
        
        Should be called before committing the transaction to capture
        the wallet balance state.
        
        Args:
            wallet_balance_before: The wallet balance before this transaction
        """
        self.balance_before = wallet_balance_before
        # Calculate balance after based on signed amount
        if self.signed_amount is not None:
            self.balance_after = wallet_balance_before + self.signed_amount
        elif self.type == 'credit':
            self.balance_after = wallet_balance_before + self.net_amount
        else:  # debit
            self.balance_after = wallet_balance_before - self.net_amount
