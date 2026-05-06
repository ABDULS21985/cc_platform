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
from modules.core.response_formatter import format_not_found
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
                'expense_kind': data.get('expense_kind', 'bill'),
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

            # Best-effort: notify community members of the new bill + audit
            # the creator. Failures here must not roll back the bill.
            try:
                from modules.notifications.services.notification_service import NotificationService
                from modules.audit.services.audit_service import AuditService
                from modules.community.repositories.community_repository import CommunityRepository
                community = CommunityRepository().find_by_id(community_id)
                community_name = community.name if community else 'Community'
                notif_service = NotificationService()
                # Members other than the creator get a Bills inbox item.
                members, _ = self.member_repo.find_by_community(community_id, status='active', limit=500)
                for m in members:
                    if m.user_id == creator_id:
                        continue
                    notif_service.create_for_user(
                        user_id=m.user_id,
                        title=f"New bill: {bill.title}",
                        body=f"{community_name} posted a bill of ₦{bill.amount:,.2f}.",
                        category='bills',
                        source=community_name,
                        action_href='/dashboard/bills',
                        amount_value=f"{bill.amount:,.2f}",
                        amount_direction='out',
                        community_id=community_id,
                    )
                AuditService().record(
                    user_id=creator_id,
                    action='Bill created',
                    details=f"Created bill '{bill.title}' for ₦{bill.amount:,.2f}",
                    category='admin',
                    severity='info',
                    actor='You',
                    target=community_name,
                )
            except Exception as exc:
                logger.warning('post-bill notify/audit failed: %s', exc)

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

    def serialize_bill_data(
        self,
        bill: Bill,
        *,
        include_detail: bool = False,
        recent_transaction_limit: int = 5,
    ) -> Dict[str, Any]:
        """Serialize a bill with collection progress and optional detail data."""
        data = bill.to_dict()
        expected_member_count = self.member_repo.count_non_owner_members(
            bill.community_id,
            status='active',
        )
        payment_summary = self.bill_repo.get_payment_summary_by_user(bill.id)
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

        if include_detail:
            members, _ = self.member_repo.find_by_community(
                bill.community_id,
                status='active',
                limit=1000,
                offset=0,
            )
            expected_members = [member for member in members if member.role != 'owner']
            paid_member_count = sum(
                1 for member in expected_members if member.user_id in payment_summary
            )
            if expected_member_count > 0:
                progress_percentage = min(
                    100,
                    int((paid_member_count / expected_member_count) * 100),
                )
            data.update({
                'paid_member_count': paid_member_count,
                'progress_percentage': progress_percentage,
                'member_payment_statuses': [
                    self._serialize_member_payment_status(member, payment_summary)
                    for member in expected_members
                ],
                'recent_transactions': self._serialize_recent_bill_transactions(
                    bill.id,
                    limit=recent_transaction_limit,
                ),
            })
        return data

    def _serialize_member_payment_status(
        self,
        member,
        payment_summary: Dict[int, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Serialize one member's payment status for a bill detail response."""
        payment = payment_summary.get(member.user_id)
        amount_paid = Decimal(str(payment['amount_paid'])) if payment else Decimal('0')
        paid_at = payment.get('paid_at') if payment else None
        user = member.user

        return {
            'member_id': member.id,
            'user_id': member.user_id,
            'role': member.role,
            'status': 'paid' if amount_paid > 0 else 'pending',
            'amount_paid': float(amount_paid),
            'paid_at': paid_at.isoformat() if paid_at else None,
            'user': {
                'id': user.id,
                'firstname': user.firstname,
                'lastname': user.lastname,
                'full_name': user.full_name,
                'profile_photo': getattr(user, 'profile_photo', None),
            } if user else None,
        }

    def _serialize_recent_bill_transactions(self, bill_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Serialize recent successful bill payment transactions with payer names."""
        transactions = self.bill_repo.find_recent_transactions(bill_id, limit=limit)
        user_ids = []
        for transaction in transactions:
            meta = transaction.meta or {}
            try:
                user_ids.append(int(meta.get('user_id')))
            except (TypeError, ValueError):
                continue

        users_by_id = {}
        if user_ids:
            from modules.auth_v2.models.user import User

            users = User.query.filter(User.id.in_(set(user_ids))).all()
            users_by_id = {user.id: user for user in users}

        items = []
        for transaction in transactions:
            payload = transaction.to_dict()
            meta = transaction.meta or {}
            payer = None
            try:
                payer = users_by_id.get(int(meta.get('user_id')))
            except (TypeError, ValueError):
                payer = None

            payload.update({
                'payer_name': payer.full_name if payer else None,
                'payer': {
                    'id': payer.id,
                    'firstname': payer.firstname,
                    'lastname': payer.lastname,
                    'full_name': payer.full_name,
                    'profile_photo': getattr(payer, 'profile_photo', None),
                } if payer else None,
                'payment_method': 'wallet',
            })
            items.append(payload)
        return items
    
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
    
    def get_bill_progress(self, bill_id: int):
        """Get bill payment progress.

        Returns the progress dict on success, or a ``(response, status)`` tuple
        produced by :func:`format_not_found` when the bill does not exist so
        the resource layer can propagate the 404 directly.
        """
        bill = self.bill_repo.find_by_id(bill_id)
        if not bill:
            return format_not_found("Bill")

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
