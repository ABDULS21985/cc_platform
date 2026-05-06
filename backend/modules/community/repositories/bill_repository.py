"""
Bill Repository
Data access layer for Bill and BillSession models.

SOLID Principles:
- Single Responsibility: Only handles bill/session data access
- Open/Closed: Extensible for new query patterns
- Liskov Substitution: Standard repository pattern
- Interface Segregation: Clean, focused methods
- Dependency Inversion: Depends on db abstraction
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from modules.auth_v2.extensions import db
from modules.community.constants import BillSessionStatus, BillStatus
from modules.community.models.bill import Bill, BillSession
from modules.wallet.models.wallet_transaction import WalletTransaction
from sqlalchemy import func

logger = logging.getLogger(__name__)


class BillRepository:
    """Repository for Bill model"""
    
    def create(self, data: Dict[str, Any]) -> Bill:
        """
        Create a new bill
        
        Args:
            data: Dictionary with bill fields
            
        Returns:
            Created Bill object
        """
        try:
            bill = Bill(
                community_id=data['community_id'],
                creator_id=data['creator_id'],
                title=data['title'],
                description=data.get('description'),
                amount=data['amount'],
                type=data.get('type', 'fixed'),
                min_amount=data.get('min_amount', 0.0),
                status=data.get('status', 'active'),
                is_recurring=data.get('is_recurring', False),
                recurrence_type=data.get('recurrence_type'),
                due_date=data['due_date'],
                collected_amount=data.get('collected_amount', 0.0)
            )
            db.session.add(bill)
            db.session.flush()
            logger.info(f"Created bill {bill.id}: {bill.title}")
            return bill
        except KeyError as e:
            logger.error(f"Missing required field: {e}")
            raise ValueError(f"Missing required field: {e}")
    
    def find_by_id(self, bill_id: int) -> Optional[Bill]:
        """Find bill by ID"""
        return Bill.query.filter_by(id=bill_id).first()
    
    def find_by_community(self, community_id: int, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> Tuple[List[Bill], int]:
        """
        Find bills in community
        
        Returns:
            Tuple of (bills, total_count)
        """
        query = Bill.query.filter_by(community_id=community_id)
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        bills = query.order_by(Bill.created_at.desc()).limit(limit).offset(offset).all()
        return bills, total
    
    def find_filtered(
        self,
        bill_filter,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple:
        """
        Find bills using a BillFilter.

        The filter's initial query must already be scoped to a community.
        Returns ``(bills, total_count)``.
        """
        bill_filter.apply().order(Bill.created_at.desc())
        return bill_filter.paginate(limit=limit, offset=offset)

    def find_by_creator(self, creator_id: int) -> List[Bill]:
        """Find all bills created by user"""
        return Bill.query.filter_by(creator_id=creator_id).all()
    
    def find_active_bills(self, community_id: int) -> List[Bill]:
        """Find all active bills in community"""
        return Bill.query.filter_by(
            community_id=community_id,
            status='active'
        ).all()
    
    def find_due_bills(self, community_id: int) -> List[Bill]:
        """Find bills past due date"""
        return Bill.query.filter(
            Bill.community_id == community_id,
            Bill.status == BillStatus.ACTIVE.value,
            Bill.due_date < datetime.utcnow()
        ).all()
    
    def update(self, bill_id: int, data: Dict[str, Any]) -> Optional[Bill]:
        """Update bill"""
        bill = self.find_by_id(bill_id)
        if not bill:
            return None
        
        allowed_fields = ['title', 'description', 'amount', 'min_amount', 'status', 'due_date', 'collected_amount']
        for key, value in data.items():
            if key in allowed_fields:
                setattr(bill, key, value)
        
        db.session.flush()
        logger.info(f"Updated bill {bill_id}")
        return bill
    
    def update_collected_amount(self, bill_id: int, amount_to_add: float) -> Optional[Bill]:
        """Add to collected amount"""
        bill = self.find_by_id(bill_id)
        if bill:
            from decimal import Decimal
            bill.collected_amount = Decimal(str(bill.collected_amount)) + Decimal(str(amount_to_add))
            if bill.collected_amount >= bill.amount:
                bill.status = 'settled'
            db.session.flush()
            logger.info(f"Updated bill {bill_id} collected amount")
        return bill
    
    def mark_settled(self, bill_id: int) -> Optional[Bill]:
        """Mark bill as settled"""
        return self.update(bill_id, {'status': 'settled'})
    
    def mark_closed(self, bill_id: int) -> Optional[Bill]:
        """Mark bill as closed (no more payments)"""
        return self.update(bill_id, {'status': 'closed'})

    def count_distinct_payers(self, bill_id: int) -> int:
        """Count distinct successful bill payers for a bill."""
        return (
            db.session.query(WalletTransaction.meta['user_id'].astext)
            .filter(
                WalletTransaction.bill_id == bill_id,
                WalletTransaction.transaction_type == 'bill_payment',
                WalletTransaction.status.in_(['successful', 'completed']),
                WalletTransaction.meta.isnot(None),
            )
            .distinct()
            .count()
        )

    def get_payment_summary_by_user(self, bill_id: int) -> Dict[int, Dict[str, Any]]:
        """Return successful bill payment totals keyed by payer user_id."""
        user_id_expr = WalletTransaction.meta['user_id'].astext
        rows = (
            db.session.query(
                user_id_expr.label('user_id'),
                func.coalesce(func.sum(WalletTransaction.amount), 0).label('amount_paid'),
                func.max(WalletTransaction.created_at).label('paid_at'),
            )
            .filter(
                WalletTransaction.bill_id == bill_id,
                WalletTransaction.transaction_type == 'bill_payment',
                WalletTransaction.status.in_(['successful', 'completed']),
                WalletTransaction.meta.isnot(None),
                user_id_expr.isnot(None),
            )
            .group_by(user_id_expr)
            .all()
        )

        summary: Dict[int, Dict[str, Any]] = {}
        for row in rows:
            try:
                user_id = int(row.user_id)
            except (TypeError, ValueError):
                continue

            summary[user_id] = {
                'amount_paid': row.amount_paid or 0,
                'paid_at': row.paid_at,
            }
        return summary

    def find_recent_transactions(self, bill_id: int, limit: int = 5) -> List[WalletTransaction]:
        """Return recent successful transactions for a bill."""
        return (
            WalletTransaction.query.filter(
                WalletTransaction.bill_id == bill_id,
                WalletTransaction.transaction_type == 'bill_payment',
                WalletTransaction.status.in_(['successful', 'completed']),
            )
            .order_by(WalletTransaction.created_at.desc())
            .limit(limit)
            .all()
        )


class BillSessionRepository:
    """Repository for BillSession model"""
    
    def create(self, data: Dict[str, Any]) -> BillSession:
        """
        Create a new bill session
        
        Args:
            data: Dictionary with session fields
            
        Returns:
            Created BillSession object
        """
        try:
            session = BillSession(
                bill_id=data['bill_id'],
                session_number=data['session_number'],
                start_date=data['start_date'],
                due_date=data['due_date'],
                status=data.get('status', BillSessionStatus.ACTIVE.value),
                collected_amount=data.get('collected_amount', 0.0),
                target_amount=data['target_amount']
            )
            db.session.add(session)
            db.session.flush()
            logger.info(f"Created session {session.id} for bill {data['bill_id']}")
            return session
        except KeyError as e:
            logger.error(f"Missing required field: {e}")
            raise ValueError(f"Missing required field: {e}")
    
    def find_by_id(self, session_id: int) -> Optional[BillSession]:
        """Find session by ID"""
        return BillSession.query.filter_by(id=session_id).first()
    
    def find_by_bill(self, bill_id: int) -> List[BillSession]:
        """Find all sessions for a bill"""
        return BillSession.query.filter_by(bill_id=bill_id).order_by(BillSession.session_number).all()
    
    def find_current_session(self, bill_id: int) -> Optional[BillSession]:
        """Find active/open session for bill"""
        return BillSession.query.filter(
            BillSession.bill_id == bill_id,
            BillSession.status == BillSessionStatus.ACTIVE.value
        ).order_by(BillSession.session_number.desc()).first()
    
    def find_open_sessions(self, bill_id: int) -> List[BillSession]:
        """Find all open sessions for bill"""
        return BillSession.query.filter_by(
            bill_id=bill_id,
            status=BillSessionStatus.ACTIVE.value
        ).all()
    
    def find_overdue_sessions(self, bill_id: int) -> List[BillSession]:
        """Find active sessions that are past due."""
        return BillSession.query.filter(
            BillSession.bill_id == bill_id,
            BillSession.status == BillSessionStatus.ACTIVE.value,
            BillSession.due_date < datetime.utcnow()
        ).all()
    
    def update_collected_amount(self, session_id: int, amount_to_add: float) -> Optional[BillSession]:
        """Add to session collected amount"""
        session = self.find_by_id(session_id)
        if session:
            from decimal import Decimal
            session.collected_amount = Decimal(str(session.collected_amount)) + Decimal(str(amount_to_add))
            if session.collected_amount >= session.target_amount:
                session.status = BillSessionStatus.SETTLED.value
            db.session.flush()
            logger.info(f"Updated session {session_id} collected amount")
        return session
    
    def mark_due(self, session_id: int) -> Optional[BillSession]:
        """Keep session active while due state is inferred from due_date."""
        session = self.find_by_id(session_id)
        if session and session.status not in (BillSessionStatus.CLOSED.value, BillSessionStatus.SETTLED.value):
            session.status = BillSessionStatus.ACTIVE.value
            db.session.flush()
        return session
    
    def mark_overdue(self, session_id: int) -> Optional[BillSession]:
        """Keep session active while overdue state is inferred from due_date."""
        session = self.find_by_id(session_id)
        if session and session.status not in (BillSessionStatus.CLOSED.value, BillSessionStatus.SETTLED.value):
            session.status = BillSessionStatus.ACTIVE.value
            db.session.flush()
        return session
    
    def mark_closed(self, session_id: int) -> Optional[BillSession]:
        """Mark session as closed"""
        session = self.find_by_id(session_id)
        if session:
            session.status = BillSessionStatus.CLOSED.value
            db.session.flush()
        return session
