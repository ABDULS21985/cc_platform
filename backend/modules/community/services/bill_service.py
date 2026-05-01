"""
Bill Service
Business logic for community billing.

SOLID Principles:
- Single Responsibility: Orchestrate billing operations only
- Open/Closed: Extensible for new billing features
- Liskov Substitution: Clear interface contracts
- Interface Segregation: Focused public methods
- Dependency Inversion: Depends on repositories
"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Tuple, Any
from modules.community.constants import BillSessionStatus, BillStatus
from modules.community.repositories import (
    CommunityRepository, BillRepository, BillSessionRepository, 
    MemberRepository, CommunityWalletRepository
)
from modules.community.models.bill import Bill, BillSession
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


class BillService:
    """Service for billing operations"""
    
    def __init__(self):
        self.bill_repo = BillRepository()
        self.session_repo = BillSessionRepository()
        self.community_repo = CommunityRepository()
        self.member_repo = MemberRepository()
        self.wallet_repo = CommunityWalletRepository()
    
    def create_bill(self, community_id: int, creator_id: int, data: Dict[str, Any]) -> Tuple[Optional[Bill], Optional[str]]:
        """
        Create new bill
        
        Args:
            community_id: Community ID
            creator_id: User creating bill (must be admin/owner)
            data: Bill data from validator
            
        Returns:
            Tuple of (bill, error) - one will be None
        """
        try:
            # Check permissions
            if not self.member_repo.is_admin_or_owner(community_id, creator_id):
                return None, 'Only admins/owners can create bills'
            
            # Create bill
            bill_data = {
                'community_id': community_id,
                'creator_id': creator_id,
                'title': data['title'],
                'description': data.get('description'),
                'amount': Decimal(str(data['amount'])),
                'type': data['type'],
                'min_amount': Decimal(str(data.get('min_amount', 0))),
                'status': BillStatus.ACTIVE.value,
                'is_recurring': data.get('is_recurring', False),
                'recurrence_type': data.get('recurrence_type'),
                'due_date': data['due_date'],
                'collected_amount': Decimal('0')
            }
            bill = self.bill_repo.create(bill_data)
            
            # Create first session if recurring
            if bill.is_recurring:
                session_data = {
                    'bill_id': bill.id,
                    'session_number': 1,
                    'start_date': datetime.utcnow(),
                    'due_date': bill.due_date,
                    'target_amount': bill.amount,
                    'collected_amount': Decimal('0'),
                    'status': BillSessionStatus.ACTIVE.value
                }
                self.session_repo.create(session_data)
            
            db.session.commit()
            logger.info(f"Created bill {bill.id} in community {community_id}")
            return bill, None
            
        except Exception as e:
            logger.error(f"Error creating bill: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def get_bill(self, bill_id: int) -> Tuple[Optional[Bill], Optional[str]]:
        """Get bill by ID"""
        bill = self.bill_repo.find_by_id(bill_id)
        if not bill:
            return None, 'Bill not found'
        return bill, None

    def serialize_bill_data(self, bill: Bill) -> Dict[str, Any]:
        """Serialize a bill with collection progress and member payment counts."""
        data = bill.to_dict()
        expected_member_count = self.member_repo.count_non_owner_members(
            bill.community_id,
            status='active',
        )
        paid_member_count = self.bill_repo.count_distinct_payers(bill.id)
        progress_percentage = 0
        if expected_member_count > 0:
            progress_percentage = min(
                100,
                int((paid_member_count / expected_member_count) * 100),
            )

        data.update({
            'paid_member_count': paid_member_count,
            'expected_member_count': expected_member_count,
            'progress_percentage': progress_percentage,
        })
        return data
    
    def get_community_bills(
        self,
        community_id: int,
        args: dict = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Bill], int]:
        """
        Return paginated, filtered community bills.

        Accepts a validated Marshmallow args dict from ``BillListQuerySchema``.
        When ``status`` is not provided, all bill statuses are returned.

        Returns:
            Tuple of (bills, total_count)
        """
        from modules.community.utils import BillFilter

        args = args or {}
        base_query = Bill.query.filter_by(community_id=community_id)
        f = BillFilter(base_query, args)
        return self.bill_repo.find_filtered(f, limit=limit, offset=offset)
    
    def update_bill(self, bill_id: int, data: Dict[str, Any]) -> Tuple[Optional[Bill], Optional[str]]:
        """Update bill"""
        try:
            bill = self.bill_repo.update(bill_id, data)
            if not bill:
                return None, 'Bill not found'
            
            db.session.commit()
            logger.info(f"Updated bill {bill_id}")
            return bill, None
            
        except Exception as e:
            logger.error(f"Error updating bill: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def settle_bill(self, bill_id: int) -> Tuple[Optional[Bill], Optional[str]]:
        """Mark bill as settled"""
        try:
            bill = self.bill_repo.mark_settled(bill_id)
            if not bill:
                return None, 'Bill not found'
            
            db.session.commit()
            logger.info(f"Settled bill {bill_id}")
            return bill, None
            
        except Exception as e:
            logger.error(f"Error settling bill: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def close_bill(self, bill_id: int) -> Tuple[Optional[Bill], Optional[str]]:
        """Close bill (no more payments)"""
        try:
            bill = self.bill_repo.mark_closed(bill_id)
            if not bill:
                return None, 'Bill not found'
            
            db.session.commit()
            logger.info(f"Closed bill {bill_id}")
            return bill, None
            
        except Exception as e:
            logger.error(f"Error closing bill: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def record_payment(self, bill_id: int, amount: Decimal) -> Tuple[Optional[Bill], Optional[str]]:
        """
        Record payment toward bill
        
        Args:
            bill_id: Bill ID
            amount: Payment amount
            
        Returns:
            Tuple of (updated_bill, error) - one will be None
        """
        try:
            bill = self.bill_repo.find_by_id(bill_id)
            if not bill:
                return None, 'Bill not found'
            
            # Update collected amount
            self.bill_repo.update_collected_amount(bill_id, amount)
            
            # If recurring, also update session
            if bill.is_recurring:
                session = self.session_repo.find_current_session(bill_id)
                if session:
                    self.session_repo.update_collected_amount(session.id, amount)
            
            db.session.commit()
            logger.info(f"Recorded payment of {amount} for bill {bill_id}")
            return bill, None
            
        except Exception as e:
            logger.error(f"Error recording payment: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def get_defaulters(self, community_id: int) -> List[Dict[str, Any]]:
        """
        Get members who haven't paid due bills
        
        Returns:
            List of defaulter info dicts
        """
        defaulters = []
        due_bills = self.bill_repo.find_due_bills(community_id)
        
        for bill in due_bills:
            if bill.is_recurring:
                session = self.session_repo.find_current_session(bill.id)
                if session and not session.is_settled():
                    members, _ = self.member_repo.find_by_community(community_id, status='active')
                    for member in members:
                        defaulters.append({
                            'user_id': member.user_id,
                            'bill_id': bill.id,
                            'session_id': session.id if session else None,
                            'amount_due': float(bill.amount - bill.collected_amount)
                        })
        
        return defaulters
    
    def get_bill_progress(self, bill_id: int) -> Dict[str, Any]:
        """Get bill payment progress"""
        bill = self.bill_repo.find_by_id(bill_id)
        if not bill:
            return {}
        
        percentage = 0
        expected_member_count = self.member_repo.count_non_owner_members(
            bill.community_id,
            status='active',
        )
        paid_member_count = self.bill_repo.count_distinct_payers(bill.id)
        if expected_member_count > 0:
            percentage = min(100, int((paid_member_count / expected_member_count) * 100))
        
        return {
            'bill_id': bill.id,
            'title': bill.title,
            'amount': float(bill.amount),
            'collected': float(bill.collected_amount),
            'remaining': float(bill.amount - bill.collected_amount),
            'paid_member_count': paid_member_count,
            'expected_member_count': expected_member_count,
            'percentage': percentage,
            'status': bill.status
        }
