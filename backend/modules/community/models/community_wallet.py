"""
CommunityWallet Model
Manages community wallet accounts - balance ledger for communities.

SOLID Principles:
- Single Responsibility: Only handles wallet data persistence
- Open/Closed: Extensible for new wallet types
- Liskov Substitution: Can be substituted wherever db.Model is expected
- Interface Segregation: Clean interface with business logic methods
- Dependency Inversion: Depends on SQLAlchemy abstraction
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from modules.auth_v2.extensions import db
from sqlalchemy import func


class CommunityWallet(db.Model):
    """
    Community Wallet Model - Balance ledger for a community.
    
    Similar to User Wallet but for communities:
    - Receives deposits from members (via bills/fees)
    - Receives external transfers
    - Can transfer out funds (owner only)
    - Transactions tracked in WalletTransaction with community_id
    
    Attributes:
        id: Primary key
        community_id: FK to Community (one-to-one)
        balance: Current wallet balance (Decimal for precision)
        currency: Currency code (default: NGN)
        account_number: Bell MFB account number
        account_name: Account holder name (community name)
        status: 'pending' (waiting for account), 'active', 'suspended', 'closed'
        bell_mfb_client_id: Reference to Bell MFB account
        created_at: Wallet creation timestamp
        updated_at: Last update timestamp
    
    Relationships:
        community: Community (one-to-one)
        transactions: WalletTransaction (via community_id foreign key)
    """
    __tablename__ = 'community_wallets'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign Key (one-to-one with Community)
    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
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
    
    # Currency
    currency = db.Column(
        db.String(3),
        default='NGN',
        nullable=False
        # NGN = Nigerian Naira (default)
    )
    
    # Bell MFB Account Details
    account_number = db.Column(
        db.String(50),
        nullable=True,
        unique=True,
        index=True
    )
    account_name = db.Column(db.String(255), nullable=True)
    bell_mfb_client_id = db.Column(
        db.String(100),
        nullable=True,
        unique=True,
        index=True
    )
    
    # Status
    status = db.Column(
        db.String(20),
        default='pending',
        nullable=False,
        index=True
        # 'pending': Waiting for Bell MFB account creation
        # 'active': Ready to receive/send funds
        # 'suspended': Temporarily disabled
        # 'closed': Account closed (should not happen often)
    )
    
    # Timestamps
    created_at = db.Column(
        db.DateTime,
        server_default=func.now(),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    community = db.relationship(
        'Community',
        back_populates='wallet',
        foreign_keys=[community_id]
    )
    
    def __repr__(self) -> str:
        """String representation"""
        return (
            f"<CommunityWallet(id={self.id}, community_id={self.community_id}, "
            f"balance={self.balance}, account_number='{self.account_number}')>"
        )
    
    def to_dict(self, include_community: bool = False) -> Dict[str, Any]:
        """
        Convert wallet to dictionary
        
        Args:
            include_community: Include community details (default: False)
            
        Returns:
            Dictionary representation of wallet
        """
        data = {
            'id': self.id,
            'community_id': self.community_id,
            'balance': float(self.balance) if self.balance else 0.0,
            'currency': self.currency,
            'account_number': self.account_number,
            'account_name': self.account_name,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_community and self.community:
            data['community'] = {
                'id': self.community.id,
                'name': self.community.name,
                'slug': self.community.slug
            }
        
        return data
    
    def update_balance(self, amount: Decimal) -> None:
        """
        Update wallet balance
        
        Args:
            amount: Amount to add/subtract (positive for credit, negative for debit)
        """
        self.balance = Decimal(str(self.balance)) + Decimal(str(amount))
    
    def can_withdraw(self, amount: Decimal) -> bool:
        """
        Check if wallet has sufficient balance for withdrawal
        
        Args:
            amount: Amount to withdraw
            
        Returns:
            True if balance is sufficient
        """
        return self.balance >= Decimal(str(amount))
    
    def is_active(self) -> bool:
        """Check if wallet is active and ready for transactions"""
        return self.status == 'active' and self.account_number is not None
