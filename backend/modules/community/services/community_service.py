"""
Community Service
Business logic for community management.

SOLID Principles:
- Single Responsibility: Orchestrate community operations only
- Open/Closed: Extensible for new use cases
- Liskov Substitution: Clear interface contracts
- Interface Segregation: Focused public methods
- Dependency Inversion: Depends on repositories
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Tuple, Any
from modules.community.repositories import CommunityRepository, MemberRepository, CommunityWalletRepository
from modules.community.models.community import Community
from modules.community.models.community_interest import Interest
from modules.community.models.community_wallet import CommunityWallet
from modules.community.constants import CommunityStatus, MemberRole, MemberStatus, WalletStatus
from modules.community.utils import generate_slug
from modules.community.repositories import OrganizationRepository, InstitutionMemberRepository
from modules.community.services.organization_service import OrganizationService
from modules.core.response_formatter import format_not_found
from modules.auth_v2.extensions import db
from sqlalchemy import func, case

logger = logging.getLogger(__name__)


class CommunityService:
    """Service for community operations"""
    
    def __init__(self):
        self.repo = CommunityRepository()
        self.member_repo = MemberRepository()
        self.wallet_repo = CommunityWalletRepository()
        self.organization_repo = OrganizationRepository()
        self.institution_member_repo = InstitutionMemberRepository()
        self.organization_service = OrganizationService()
    
    def create_community(self, creator_id: int, data: Dict[str, Any]) -> Tuple[Optional[Community], Optional[str]]:
        """
        Create new community
        
        Args:
            creator_id: User creating community
            data: Community data from validator
            
        Returns:
            Tuple of (community, error) - one will be None
        """
        try:
            name = data['name']
            slug = generate_slug(name)

            organization_id, org_error = self._resolve_organization_id(
                creator_id=creator_id,
                requested_organization_id=data.get('organization_id'),
                requested_institution_id=data.get('institution_id'),
            )
            if org_error:
                return None, org_error
            
            # Create community
            cover_photo = data.get('community_cover_photo') or data.get('banner_url')
            profile_picture = data.get('community_profile_picture')

            # Keep backward compatibility with existing schema/storage.
            # If only profile picture is provided, use it as banner fallback.
            if not cover_photo and profile_picture:
                cover_photo = profile_picture

            community_data = {
                'created_by': creator_id,
                'name': name,
                'slug': slug,
                'description': data.get('description'),
                'banner_url': cover_photo,
                'profile_picture_url': profile_picture,
                'visibility': data.get('visibility', 'public'),
                'member_cost': Decimal(str(data.get('member_cost', 0))),
                'status': CommunityStatus.ACTIVE.value,
                'organization_id': organization_id,
                'member_count': 1,
            }
            community = self.repo.create(community_data)
            
            # Create wallet for community
            wallet_data = {
                'community_id': community.id,
                'balance': Decimal('0.00'),
                'status': WalletStatus.PENDING.value,
                'currency': 'NGN'
            }
            wallet = self.wallet_repo.create(wallet_data)
            
            # Add creator as owner
            from modules.community.repositories.member_repository import MemberRepository
            member_repo = MemberRepository()
            member_repo.create({
                'community_id': community.id,
                'user_id': creator_id,
                'role': MemberRole.OWNER.value,
                'status': MemberStatus.ACTIVE.value
            })
            
            # Add legacy interest IDs and new taxonomy list fields.
            self._sync_community_interests(community, data)
            
            db.session.commit()
            logger.info(f"Created community {community.id} by user {creator_id}")
            return community, None
            
        except Exception as e:
            logger.error(f"Error creating community: {str(e)}")
            db.session.rollback()
            return None, str(e)

    def _sync_community_interests(self, community: Community, data: Dict[str, Any]) -> None:
        """Attach legacy and list-based taxonomy fields to community interests."""
        # Legacy behavior: explicit interest IDs
        for interest_id in data.get('interest_ids', []) or []:
            interest = Interest.query.get(interest_id)
            if interest and not community.interests.filter_by(id=interest.id).first():
                community.interests.append(interest)

        # New behavior: free-form list-based taxonomy fields
        taxonomy_prefixes = {
            'category': 'category::',
            'subcategory': 'subcategory::',
            'interest': 'interest::',
        }

        for field_name, prefix in taxonomy_prefixes.items():
            raw_values = data.get(field_name) or []
            for raw_value in raw_values:
                value = str(raw_value).strip()
                if not value:
                    continue

                tag_name = f"{prefix}{value}"
                interest = self._get_or_create_interest(tag_name)
                if not community.interests.filter_by(id=interest.id).first():
                    community.interests.append(interest)

    def _get_or_create_interest(self, name: str) -> Interest:
        """Get existing Interest by case-insensitive name or create one."""
        existing = Interest.query.filter(db.func.lower(Interest.name) == name.lower()).first()
        if existing:
            return existing

        interest = Interest(
            name=name,
            slug=generate_slug(name, unique_suffix=False),
        )
        db.session.add(interest)
        db.session.flush()
        return interest

    def _resolve_organization_id(
        self,
        creator_id: int,
        requested_organization_id: Optional[int],
        requested_institution_id: Optional[int],
    ) -> Tuple[Optional[int], Optional[str]]:
        """Resolve organization for community creation using explicit selection or default fallback."""
        if requested_organization_id:
            organization = self.organization_repo.find_by_id(requested_organization_id)
            if not organization:
                return None, 'Selected organization not found'

            if not self.institution_member_repo.can_create_structure(organization.institution_id, creator_id):
                return None, 'Not authorized to create community in selected organization'

            return organization.id, None

        return self.organization_service.ensure_default_organization(
            user_id=creator_id,
            institution_id=requested_institution_id,
        )
    
    def get_community(self, community_id: int) -> Tuple[Optional[Community], Optional[str]]:
        """Get community by ID"""
        community = self.repo.find_by_id(community_id)
        if not community:
            return None, 'Community not found'
        return community, None
    
    def update_community(self, community_id: int, data: Dict[str, Any]) -> Tuple[Optional[Community], Optional[str]]:
        """Update community"""
        try:
            community = self.repo.update(community_id, data)
            if not community:
                return None, 'Community not found'
            
            db.session.commit()
            logger.info(f"Updated community {community_id}")
            return community, None
            
        except Exception as e:
            logger.error(f"Error updating community: {str(e)}")
            db.session.rollback()
            return None, str(e)

    def update_cover_photo(self, community_id: int, url: str) -> Tuple[Optional[Community], Optional[str]]:
        """Update community cover photo URL."""
        return self.update_community(community_id, {'banner_url': url})

    def update_profile_picture(self, community_id: int, url: str) -> Tuple[Optional[Community], Optional[str]]:
        """Update community profile picture URL."""
        return self.update_community(community_id, {'profile_picture_url': url})
    
    def search_communities(
        self,
        args: dict,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Community], int]:
        """
        Search and filter communities.

        Accepts the validated Marshmallow args dict from ``SearchCommunitySchema``
        and delegates all query composition to ``CommunityFilter``. The
        ``sort`` arg is read from the validator (``'recent'`` by default).

        Returns:
            Tuple of (communities, total_count)
        """
        from modules.community.utils import CommunityFilter

        f = CommunityFilter(Community.query, args)
        sort = args.get('sort') or 'recent'
        return self.repo.find_filtered(f, limit=limit, offset=offset, sort=sort)

    def get_user_communities(self, user_id: int, limit: int = 20, offset: int = 0) -> Tuple[List[Community], int]:
        """Get communities where user is an active member."""
        community_ids = self.member_repo.find_by_user(user_id, status=MemberStatus.ACTIVE.value)
        ids = [membership.community_id for membership in community_ids]
        return self.repo.find_by_ids(ids, limit=limit, offset=offset)

    def get_user_owned_communities(self, user_id: int, limit: int = 20, offset: int = 0) -> Tuple[List[Community], int]:
        """Get communities where user has owner role."""
        memberships = self.member_repo.find_by_user(user_id, status=MemberStatus.ACTIVE.value)
        ids = [membership.community_id for membership in memberships if membership.role == MemberRole.OWNER.value]
        return self.repo.find_by_ids(ids, limit=limit, offset=offset)

    def get_user_admin_communities(self, user_id: int, limit: int = 20, offset: int = 0) -> Tuple[List[Community], int]:
        """Get communities where user is an active owner/admin."""
        memberships = self.member_repo.find_by_user(user_id, status=MemberStatus.ACTIVE.value)
        ids = [
            membership.community_id
            for membership in memberships
            if membership.role in {MemberRole.OWNER.value, MemberRole.ADMIN.value}
        ]
        return self.repo.find_by_ids(ids, limit=limit, offset=offset)

    def get_user_bills_summary(self, user_id: int) -> dict:
        """Aggregate open bill totals across all active memberships in one query."""
        from modules.community.models.bill import Bill
        from modules.community.models.community_member import CommunityMember

        open_statuses = [BillStatus.ACTIVE.value, 'pending', 'overdue']
        row = (
            db.session.query(
                func.count(Bill.id),
                func.coalesce(func.sum(Bill.amount), 0),
            )
            .join(
                CommunityMember,
                CommunityMember.community_id == Bill.community_id,
            )
            .filter(
                CommunityMember.user_id == user_id,
                CommunityMember.status == MemberStatus.ACTIVE.value,
                Bill.status.in_(open_statuses),
                Bill.expense_kind == 'bill',
            )
            .first()
        )
        count, amount = row if row else (0, 0)
        return {
            'bills_due_count': int(count or 0),
            'bills_due_amount': float(amount or 0),
        }
    
    def get_community_wallet(self, community_id: int) -> Tuple[Optional[CommunityWallet], Optional[str]]:
        """Get community wallet"""
        wallet = self.wallet_repo.find_by_community_id(community_id)
        if not wallet:
            return None, 'Wallet not found'
        return wallet, None
    
    def get_community_balance(self, community_id: int) -> Tuple[Optional[Decimal], Optional[str]]:
        """Get community wallet balance"""
        wallet = self.wallet_repo.find_by_community_id(community_id)
        if not wallet:
            return None, 'Wallet not found'
        return wallet.balance, None
    
    def suspend_community(self, community_id: int) -> Tuple[Optional[Community], Optional[str]]:
        """Suspend community (no new transactions)"""
        community = self.repo.update(community_id, {'status': CommunityStatus.SUSPENDED.value})
        if not community:
            return None, 'Community not found'
        
        db.session.commit()
        logger.warning(f"Suspended community {community_id}")
        return community, None
    
    def close_community(self, community_id: int) -> Tuple[Optional[Community], Optional[str]]:
        """Close community (final state)"""
        community = self.repo.update(community_id, {'status': CommunityStatus.CLOSED.value})
        if not community:
            return None, 'Community not found'
        
        db.session.commit()
        logger.warning(f"Closed community {community_id}")
        return community, None
    
    def delete_community(self, community_id: int) -> Tuple[bool, Optional[str]]:
        """Soft delete community"""
        try:
            community = self.repo.find_by_id(community_id)
            if not community:
                return False, 'Community not found'
            
            self.repo.delete(community_id)
            db.session.commit()
            logger.info(f"Deleted community {community_id}")
            return True, None
            
        except Exception as e:
            logger.error(f"Error deleting community: {str(e)}")
            db.session.rollback()
            return False, str(e)
    
    def get_member_count(self, community_id: int) -> int:
        """Get active member count"""
        _, total = self.member_repo.find_by_community(community_id, status='active')
        return total
    
    def get_community_stats(self, community_id: int):
        """Get community statistics.

        Returns the stats dict on success, or a ``(response, status)`` tuple
        produced by :func:`format_not_found` when the community is missing so
        callers can ``return community_service.get_community_stats(...)``
        directly and propagate the 404.
        """
        community = self.repo.find_by_id(community_id)
        if not community:
            return format_not_found("Community")

        wallet = self.wallet_repo.find_by_community_id(community_id)
        active_members, total_members = self.member_repo.find_by_community(community_id, status='active')
        
        return {
            'id': community.id,
            'name': community.name,
            'member_count': len(active_members) if active_members else 0,
            'total_members': total_members,
            'balance': float(wallet.balance) if wallet else 0.0,
            'visibility': community.visibility,
            'status': community.status,
            'created_at': community.created_at.isoformat() if community.created_at else None
        }

    def get_community_overview(self, community_id: int) -> Tuple[Optional[dict], Optional[str]]:
        """
        Community-scoped overview (owner/admin dashboard).

        Returns a stable metric shape similar to the super-admin overview but scoped to a single community.
        """
        community = self.repo.find_by_id(community_id)
        if not community:
            return None, 'Community not found'

        wallet = self.wallet_repo.find_by_community_id(community_id)

        # Member counts
        members_active = self.member_repo.count_members(community_id, status=MemberStatus.ACTIVE.value)
        members_total = self.member_repo.count_members(community_id, status=None)

        from modules.community.models.community_member import CommunityMember
        owners_active = CommunityMember.query.filter_by(
            community_id=community_id,
            status=MemberStatus.ACTIVE.value,
            role=MemberRole.OWNER.value,
        ).count()
        admins_active = CommunityMember.query.filter_by(
            community_id=community_id,
            status=MemberStatus.ACTIVE.value,
            role=MemberRole.ADMIN.value,
        ).count()

        now = datetime.utcnow()
        this_month_start = datetime(now.year, now.month, 1)
        if now.month == 1:
            last_month_start = datetime(now.year - 1, 12, 1)
        else:
            last_month_start = datetime(now.year, now.month - 1, 1)

        # joined_last_month (active only)
        joined_last_month = CommunityMember.query.filter(
            CommunityMember.community_id == community_id,
            CommunityMember.status == MemberStatus.ACTIVE.value,
            CommunityMember.joined_at >= last_month_start,
            CommunityMember.joined_at < this_month_start,
        ).count()

        # Finance aggregates from wallet_transactions scoped by community_id
        from modules.wallet.models.wallet_transaction import WalletTransaction

        completed_statuses = ["successful", "completed"]
        sums = (
            WalletTransaction.query.filter(
                WalletTransaction.community_id == community_id,
                WalletTransaction.status.in_(completed_statuses),
            )
            .with_entities(
                func.coalesce(func.sum(case((WalletTransaction.type == "deposit", WalletTransaction.net_amount), else_=0)), 0),
                func.coalesce(func.sum(case((WalletTransaction.type == "payment", WalletTransaction.net_amount), else_=0)), 0),
                func.coalesce(func.sum(case((WalletTransaction.type == "transfer", WalletTransaction.net_amount), else_=0)), 0),
                func.coalesce(func.sum(case((WalletTransaction.type == "withdrawal", WalletTransaction.net_amount), else_=0)), 0),
            )
            .first()
        )
        deposits_sum, payments_sum, transfers_sum, withdrawals_sum = sums if sums else (0, 0, 0, 0)

        tx_total = (
            WalletTransaction.query.filter(WalletTransaction.community_id == community_id)
            .with_entities(func.count(WalletTransaction.id))
            .scalar()
        ) or 0

        return {
            "community": community.to_dict(),
            "wallet": wallet.to_dict() if wallet else {"balance": 0.0, "currency": "NGN", "status": None},
            "members": {
                "active": int(members_active or 0),
                "total": int(members_total or 0),
                "owners_active": int(owners_active or 0),
                "admins_active": int(admins_active or 0),
                "joined_last_month": int(joined_last_month or 0),
            },
            "transactions": {
                "total": int(tx_total),
                "deposits_volume": float(deposits_sum) if deposits_sum is not None else 0.0,
                "payments_volume": float(payments_sum) if payments_sum is not None else 0.0,
                "transfers_volume": float(transfers_sum) if transfers_sum is not None else 0.0,
                "withdrawals_volume": float(withdrawals_sum) if withdrawals_sum is not None else 0.0,
            },
        }, None

    def get_user_admin_overview(self, user_id: int) -> dict:
        """
        Aggregated overview for communities where the user is an active OWNER or ADMIN.
        """
        # Community IDs the user can administer (active owner/admin)
        memberships = self.member_repo.find_by_user(user_id, status=MemberStatus.ACTIVE.value)
        community_ids = [
            m.community_id
            for m in memberships
            if m.role in {MemberRole.OWNER.value, MemberRole.ADMIN.value}
        ]

        if not community_ids:
            return {
                "communities": {"count": 0},
                "wallets": {"total_balance": 0.0, "currency": "NGN"},
                "members": {"active_total": 0},
                "transactions": {
                    "total": 0,
                    "deposits_volume": 0.0,
                    "payments_volume": 0.0,
                    "transfers_volume": 0.0,
                    "withdrawals_volume": 0.0,
                },
                "per_community": [],
            }

        from modules.community.models.community_wallet import CommunityWallet
        from modules.community.models.community_member import CommunityMember
        from modules.wallet.models.wallet_transaction import WalletTransaction

        communities = Community.query.filter(Community.id.in_(community_ids)).all()
        communities_by_id = {c.id: c for c in communities}

        # Wallet balances
        wallet_rows = (
            CommunityWallet.query.filter(CommunityWallet.community_id.in_(community_ids))
            .with_entities(CommunityWallet.community_id, CommunityWallet.balance, CommunityWallet.currency, CommunityWallet.status)
            .all()
        )
        wallets_by_id = {r[0]: {"balance": float(r[1] or 0), "currency": r[2], "status": r[3]} for r in wallet_rows}

        total_balance = sum(w["balance"] for w in wallets_by_id.values())

        # Active member counts per community (and total)
        active_member_rows = (
            CommunityMember.query.filter(
                CommunityMember.community_id.in_(community_ids),
                CommunityMember.status == MemberStatus.ACTIVE.value,
            )
            .with_entities(CommunityMember.community_id, func.count(CommunityMember.id))
            .group_by(CommunityMember.community_id)
            .all()
        )
        active_members_by_id = {cid: int(cnt) for cid, cnt in active_member_rows}
        active_members_total = sum(active_members_by_id.values())

        # Transaction counts + volumes per community
        completed_statuses = ["successful", "completed"]
        tx_agg_rows = (
            WalletTransaction.query.filter(WalletTransaction.community_id.in_(community_ids))
            .with_entities(
                WalletTransaction.community_id,
                func.count(WalletTransaction.id),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (WalletTransaction.status.in_(completed_statuses))
                                & (WalletTransaction.type == "deposit"),
                                WalletTransaction.net_amount,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (WalletTransaction.status.in_(completed_statuses))
                                & (WalletTransaction.type == "payment"),
                                WalletTransaction.net_amount,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (WalletTransaction.status.in_(completed_statuses))
                                & (WalletTransaction.type == "transfer"),
                                WalletTransaction.net_amount,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (WalletTransaction.status.in_(completed_statuses))
                                & (WalletTransaction.type == "withdrawal"),
                                WalletTransaction.net_amount,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
            )
            .group_by(WalletTransaction.community_id)
            .all()
        )

        tx_by_id = {}
        for cid, tx_count, dep, pay, trf, wdr in tx_agg_rows:
            tx_by_id[int(cid)] = {
                "total": int(tx_count or 0),
                "deposits_volume": float(dep or 0),
                "payments_volume": float(pay or 0),
                "transfers_volume": float(trf or 0),
                "withdrawals_volume": float(wdr or 0),
            }

        # Build per-community view (stable ordering)
        per_community = []
        for cid in sorted(community_ids):
            c = communities_by_id.get(cid)
            if not c:
                continue
            wallet_payload = wallets_by_id.get(cid, {"balance": 0.0, "currency": "NGN", "status": None})
            tx_payload = tx_by_id.get(
                cid,
                {
                    "total": 0,
                    "deposits_volume": 0.0,
                    "payments_volume": 0.0,
                    "transfers_volume": 0.0,
                    "withdrawals_volume": 0.0,
                },
            )
            per_community.append(
                {
                    "community": {"id": c.id, "name": c.name, "slug": c.slug, "status": c.status},
                    "wallet": wallet_payload,
                    "members": {"active": int(active_members_by_id.get(cid, 0))},
                    "transactions": tx_payload,
                }
            )

        # Aggregate totals
        tx_total = sum(p["transactions"]["total"] for p in per_community)
        deposits_volume = sum(p["transactions"]["deposits_volume"] for p in per_community)
        payments_volume = sum(p["transactions"]["payments_volume"] for p in per_community)
        transfers_volume = sum(p["transactions"]["transfers_volume"] for p in per_community)
        withdrawals_volume = sum(p["transactions"]["withdrawals_volume"] for p in per_community)

        return {
            "communities": {"count": len(per_community)},
            "wallets": {"total_balance": float(total_balance), "currency": "NGN"},
            "members": {"active_total": int(active_members_total)},
            "transactions": {
                "total": int(tx_total),
                "deposits_volume": float(deposits_volume),
                "payments_volume": float(payments_volume),
                "transfers_volume": float(transfers_volume),
                "withdrawals_volume": float(withdrawals_volume),
            },
            "per_community": per_community,
        }
