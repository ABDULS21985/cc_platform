"""
Bill & BillSession Models
Manages community bills - tracks money collection for specific purposes.

SOLID Principles:
- Single Responsibility: Only handles bill data persistence
- Open/Closed: Extensible for new bill types
- Liskov Substitution: Can be substituted wherever db.Model is expected
- Interface Segregation: Clean interface with helper methods
- Dependency Inversion: Depends on SQLAlchemy abstraction
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from modules.auth_v2.extensions import db
from modules.community.constants import BillSessionStatus
from sqlalchemy import func


class Bill(db.Model):
    """
    Bill Model - Represents a bill/collection within a community.
    
    Types:
        'fixed': Each member pays equal amount
        'free_will': Members donate what they want (must be >= min_amount)
    
    Recurrence:
        - Non-recurring: Single due date, one session
        - Recurring: Creates new session per period (weekly/monthly/yearly)
    
    Attributes:
        id: Primary key
        community_id: FK to Community
        creator_id: FK to User (owner/admin only)
        title: Bill title
        description: Bill description
        amount: Target amount to collect per member/cycle
        type: 'fixed' or 'free_will'
        min_amount: Minimum contribution (for free_will)
        status: 'draft', 'active', 'closed', 'settled'
        is_recurring: True if recurring
        recurrence_type: 'weekly', 'monthly', 'yearly' (if recurring)
        due_date: Initial due date (single or first for recurring)
        collected_amount: Total collected across all sessions
        created_at: Timestamp
        updated_at: Last update timestamp
    
    Relationships:
        community: Community (many-to-one)
        creator: User (many-to-one)
        sessions: BillSession (one-to-many, for recurring bills)
        transactions: WalletTransaction (via bill_id foreign key)
    """
    __tablename__ = 'bills'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    creator_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Basic Information
    title = db.Column(db.String(255), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    
    # Amount & Type
    amount = db.Column(
        db.Numeric(15, 2),
        nullable=False
        # For fixed: amount per member
        # For free_will: target/suggested amount
    )
    type = db.Column(
        db.String(20),
        default='fixed',
        nullable=False,
        index=True
        # 'fixed': Each member pays equal
        # 'free_will': Members donate >= min_amount
    )
    min_amount = db.Column(
        db.Numeric(15, 2),
        default=Decimal('0.00'),
        nullable=False
        # Only used for free_will bills
    )
    
    # Status
    status = db.Column(
        db.String(20),
        default='active',
        nullable=False,
        index=True
        # 'draft': Not yet active
        # 'active': Open for payments
        # 'closed': No longer accepting payments
        # 'settled': Target reached
    )
    
    # Recurrence
    is_recurring = db.Column(db.Boolean, default=False, nullable=False)
    recurrence_type = db.Column(
        db.String(20),
        nullable=True
        # 'weekly', 'monthly', 'yearly'
    )
    
    # Due Date
    due_date = db.Column(
        db.DateTime,
        nullable=False
        # For non-recurring: single due date
        # For recurring: initial due date
    )
    
    # Tracking
    collected_amount = db.Column(
        db.Numeric(15, 2),
        default=Decimal('0.00'),
        nullable=False
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
        back_populates='bills',
        foreign_keys=[community_id]
    )
    
    creator = db.relationship(
        'User',
        foreign_keys=[creator_id],
        backref='created_bills'
    )
    
    sessions = db.relationship(
        'BillSession',
        back_populates='bill',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    
    def __repr__(self) -> str:
        """String representation"""
        return f"<Bill(id={self.id}, title='{self.title}', community_id={self.community_id})>"
    
    def to_dict(self, include_sessions: bool = False, include_community: bool = False) -> Dict[str, Any]:
        """
        Convert bill to dictionary
        
        Args:
            include_sessions: Include session info (default: False)
            include_community: Include community info (default: False)
            
        Returns:
            Dictionary representation of bill
        """
        data = {
            'id': self.id,
            'community_id': self.community_id,
            'creator_id': self.creator_id,
            'title': self.title,
            'description': self.description,
            'amount': float(self.amount),
            'type': self.type,
            'min_amount': float(self.min_amount) if self.min_amount else 0.0,
            'status': self.status,
            'is_recurring': self.is_recurring,
            'recurrence_type': self.recurrence_type,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'collected_amount': float(self.collected_amount),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sessions:
            data['sessions'] = [
                session.to_dict() for session in self.sessions
            ]
        
        if include_community and self.community:
            data['community'] = {
                'id': self.community.id,
                'name': self.community.name,
                'slug': self.community.slug
            }

        # Always inline a creator summary so the frontend doesn't have to do
        # an N+1 user lookup just to render "Created by …".
        if self.creator is not None:
            data['creator'] = {
                'id': self.creator.id,
                'firstname': self.creator.firstname,
                'lastname': self.creator.lastname,
                'full_name': self.creator.full_name,
                'profile_photo': getattr(self.creator, 'profile_photo', None),
            }

        return data
    
    def is_due(self) -> bool:
        """Check if bill is past due date"""
        return datetime.utcnow() > self.due_date
    
    def is_settled(self) -> bool:
        """Check if bill target has been reached"""
        return self.collected_amount >= self.amount


class BillSession(db.Model):
    """
    BillSession Model - Represents a payment period for recurring bills.
    
    For recurring bills, creates new session per period (weekly/monthly/yearly).
    Tracks payments for that specific period.
    
    Attributes:
        id: Primary key
        bill_id: FK to Bill
        session_number: 1, 2, 3... (sequential)
        start_date: When this period starts
        due_date: When this period is due
        status: 'active', 'closed', 'settled'
        collected_amount: Total collected in this session
        target_amount: Amount to collect in this period
        created_at: Timestamp
        updated_at: Last update timestamp
    
    Relationships:
        bill: Bill (many-to-one)
    """
    __tablename__ = 'bill_sessions'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign Key
    bill_id = db.Column(
        db.Integer,
        db.ForeignKey('bills.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Session Tracking
    session_number = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    
    # Status
    status = db.Column(
        db.String(20),
        default='open',
        nullable=False,
        index=True
        # 'active': Accepting payments
        # 'closed': No longer accepting payments
        # 'settled': Target reached
    )
    
    # Amounts
    collected_amount = db.Column(
        db.Numeric(15, 2),
        default=Decimal('0.00'),
        nullable=False
    )
    target_amount = db.Column(
        db.Numeric(15, 2),
        nullable=False
        # Amount to collect in this period
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
    bill = db.relationship(
        'Bill',
        back_populates='sessions',
        foreign_keys=[bill_id]
    )
    
    def __repr__(self) -> str:
        """String representation"""
        return (
            f"<BillSession(id={self.id}, bill_id={self.bill_id}, "
            f"session_number={self.session_number})>"
        )
    
    def to_dict(self, include_bill: bool = False) -> Dict[str, Any]:
        """
        Convert session to dictionary
        
        Args:
            include_bill: Include bill info (default: False)
            
        Returns:
            Dictionary representation of session
        """
        data = {
            'id': self.id,
            'bill_id': self.bill_id,
            'session_number': self.session_number,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status,
            'collected_amount': float(self.collected_amount),
            'target_amount': float(self.target_amount),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_bill and self.bill:
            data['bill'] = {
                'id': self.bill.id,
                'title': self.bill.title,
                'community_id': self.bill.community_id
            }
        
        return data
    
    def is_settled(self) -> bool:
        """Check if session target has been reached"""
        return self.status == BillSessionStatus.SETTLED.value or self.collected_amount >= self.target_amount
    
    def is_due(self) -> bool:
        """Check if session is past due date"""
        return datetime.utcnow() > self.due_date
    
    def get_progress_percentage(self) -> float:
        """Get collection progress as percentage"""
        if self.target_amount == 0:
            return 0.0
        return float((self.collected_amount / self.target_amount) * 100)
