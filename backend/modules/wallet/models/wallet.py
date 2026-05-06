"""
Wallet Model
Manages user wallet accounts - simple balance ledger in the system.

SOLID Principles:
- Single Responsibility: Only handles wallet data persistence
- Open/Closed: Extensible for new wallet types/currencies
- Liskov Substitution: Can be substituted wherever db.Model is expected
- Interface Segregation: Clean interface with business logic methods
- Dependency Inversion: Depends on SQLAlchemy abstraction
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from modules.auth_v2.extensions import db
from sqlalchemy import func


class Wallet(db.Model):
    """
    User wallet account - balance ledger in the system.
    
    Attributes:
        id: Primary key
        user_id: Foreign key to users table (one-to-one)
        balance: Current wallet balance (Decimal for precision)
        currency: Currency code (default: NGN)
        status: 'active', 'suspended', 'closed'
        created_at: Wallet creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = 'wallets'
    
    # Primary key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign key (one-to-one with User)
    user_id = db.Column(
        db.Integer, 
        db.ForeignKey('users.id', ondelete='CASCADE'), 
        unique=True, 
        nullable=False, 
        index=True
    )
    
    # Balance (use Decimal for financial precision)
    balance = db.Column(
        db.Numeric(15, 2), 
        default=Decimal('0.00'), 
        nullable=False
    )
    currency = db.Column(db.String(3), default='NGN', nullable=False)
    
    # Status
    status = db.Column(
        db.String(20), 
        default='active', 
        nullable=False,
        index=True
    )  # active, suspended, closed
    
    # Bell MFB Account Details (for deposits)
    account_number = db.Column(db.String(50), nullable=True, index=True)
    account_name = db.Column(db.String(255), nullable=True)
    bell_mfb_client_id = db.Column(db.String(255), nullable=True, index=True)
    bell_mfb_external_reference = db.Column(db.String(255), nullable=True)
    
    # Timestamps
    created_at = db.Column(
        db.DateTime, 
        default=datetime.utcnow, 
        nullable=True
    )
    updated_at = db.Column(
        db.DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        nullable=True
    )
    
    # Relationships
    user = db.relationship(
        'User', 
        backref=db.backref('wallet', uselist=False, cascade='all, delete-orphan')
    )
    transactions = db.relationship(
        'WalletTransaction', 
        backref='wallet', 
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<Wallet(id={self.id}, user_id={self.user_id}, "
            f"account='{self.account_number}', balance={self.balance})>"
        )
    
    def to_dict(self, include_transactions: bool = False) -> dict:
        """
        Convert to dictionary (for API responses).
        
        Args:
            include_transactions: Include recent transactions (default: False)
            
        Returns:
            Dictionary representation
        """
        data = {
            "id": self.id,
            "account_number": self.account_number,
            "account_name": self.account_name,
            "bank_name": self.bank_name,
            "balance": str(self.balance),  # Convert Decimal to string for JSON
            "currency": self.currency,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_transactions:
            # Get last 10 transactions
            recent_txns = self.transactions.order_by(
                db.desc('created_at')
            ).limit(10).all()
            data["recent_transactions"] = [txn.to_dict() for txn in recent_txns]
            
        return data
    
    def credit(self, amount: Decimal) -> None:
        """
        Add funds to wallet (DRY principle).
        
        Args:
            amount: Amount to credit
            
        Raises:
            ValueError: If amount is negative
        """
        if amount <= 0:
            raise ValueError("Credit amount must be positive")
        
        self.balance += amount
        self.updated_at = datetime.utcnow()
    
    def debit(self, amount: Decimal) -> None:
        """
        Deduct funds from wallet (DRY principle).
        
        Args:
            amount: Amount to debit
            
        Raises:
            ValueError: If amount is negative or insufficient balance
        """
        if amount <= 0:
            raise ValueError("Debit amount must be positive")
        
        if self.balance < amount:
            raise ValueError("Insufficient balance")
        
        self.balance -= amount
        self.updated_at = datetime.utcnow()
    
    def suspend(self) -> None:
        """Suspend wallet (prevent transactions)."""
        self.status = 'suspended'
        self.updated_at = datetime.utcnow()
    
    def activate(self) -> None:
        """Activate wallet (allow transactions)."""
        self.status = 'active'
        self.updated_at = datetime.utcnow()
    
    def close(self) -> None:
        """Close wallet permanently."""
        self.status = 'closed'
        self.updated_at = datetime.utcnow()
    
    @property
    def is_active(self) -> bool:
        """Check if wallet is active."""
        return self.status == 'active'
    
    @property
    def is_suspended(self) -> bool:
        """Check if wallet is suspended."""
        return self.status == 'suspended'
    
    @property
    def is_closed(self) -> bool:
        """Check if wallet is closed."""
        return self.status == 'closed'
    
    @property
    def formatted_balance(self) -> str:
        """Get formatted balance with currency symbol."""
        return f"₦{self.balance:,.2f}"

    @property
    def bank_name(self) -> Optional[str]:
        """Best available bank label for the wallet's virtual account."""
        if not self.account_number:
            return None
        return "Bell MFB"
