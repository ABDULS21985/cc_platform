from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy import or_
from sqlalchemy import func, case

from modules.admin.services.audit_service import AdminAuditService
from modules.auth_v2.models.user import User
from modules.community.models.community import Community
from modules.community.models.community_member import CommunityMember
from modules.community.models.community_wallet import CommunityWallet
from modules.community.models.organization import Organization
from modules.wallet.models.wallet import Wallet
from modules.wallet.models.wallet_transaction import WalletTransaction


class AdminCommunitiesService:
    def __init__(self):
        self.audit = AdminAuditService()

    def _serialize(self, c: Community) -> dict:
        # Lean serializer (avoid expensive relationship counts during listing)
        return {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "description": c.description,
            "visibility": c.visibility,
            "member_cost": float(c.member_cost) if c.member_cost else 0.0,
            "status": c.status,
            "created_by": c.created_by,
            "organization_id": c.organization_id,
            "institution_id": c.organization.institution_id if c.organization else None,
            "member_count": c.member_count,
            "banner_url": c.banner_url,
            "profile_picture_url": c.profile_picture_url,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }

    def list_communities(self, *, args: dict) -> Tuple[list[dict], int, int, int]:
        page = int(args.get("page", 1))
        page_size = int(args.get("page_size", 20))

        query = Community.query

        search = args.get("search")
        if search:
            like = f"%{search.strip()}%"
            query = query.filter(or_(Community.name.ilike(like), Community.slug.ilike(like)))

        if args.get("status"):
            query = query.filter(Community.status == args["status"])

        if args.get("organization_id") is not None:
            query = query.filter(Community.organization_id == args["organization_id"])

        if args.get("institution_id") is not None:
            query = query.join(Organization, Community.organization_id == Organization.id).filter(
                Organization.institution_id == args["institution_id"]
            )

        total = query.count()
        items = (
            query.order_by(Community.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return [self._serialize(c) for c in items], total, page, page_size

    def get_community(self, community_id: int) -> Optional[dict]:
        c = Community.query.get(community_id)
        if not c:
            return None

        payload = self._serialize(c)

        wallet = CommunityWallet.query.filter_by(community_id=community_id).first()
        payload["wallet"] = wallet.to_dict() if wallet else {"balance": 0.0, "currency": "NGN", "status": None}

        now = datetime.utcnow()
        this_month_start = datetime(now.year, now.month, 1)
        if now.month == 1:
            last_month_start = datetime(now.year - 1, 12, 1)
        else:
            last_month_start = datetime(now.year, now.month - 1, 1)

        active_members_count = CommunityMember.query.filter_by(
            community_id=community_id,
            status="active",
        ).count()
        admins_count = CommunityMember.query.filter_by(
            community_id=community_id,
            status="active",
            role="admin",
        ).count()
        owners_count = CommunityMember.query.filter_by(
            community_id=community_id,
            status="active",
            role="owner",
        ).count()
        members_joined_last_month = CommunityMember.query.filter(
            CommunityMember.community_id == community_id,
            CommunityMember.status == "active",
            CommunityMember.joined_at >= last_month_start,
            CommunityMember.joined_at < this_month_start,
        ).count()

        payload["stats"] = {
            "members": {
                "active": active_members_count,
                "owners": owners_count,
                "admins": admins_count,
                "joined_last_month": members_joined_last_month,
            }
        }

        return payload

    def get_overview(self, community_id: int) -> Optional[dict]:
        """Community-scoped overview for super admin."""
        c = Community.query.get(community_id)
        if not c:
            return None

        wallet = CommunityWallet.query.filter_by(community_id=community_id).first()

        members_active = CommunityMember.query.filter_by(community_id=community_id, status="active").count()
        members_total = CommunityMember.query.filter_by(community_id=community_id).count()
        admins_active = CommunityMember.query.filter_by(community_id=community_id, status="active", role="admin").count()
        owners_active = CommunityMember.query.filter_by(community_id=community_id, status="active", role="owner").count()

        now = datetime.utcnow()
        this_month_start = datetime(now.year, now.month, 1)
        if now.month == 1:
            last_month_start = datetime(now.year - 1, 12, 1)
        else:
            last_month_start = datetime(now.year, now.month - 1, 1)

        members_joined_last_month = CommunityMember.query.filter(
            CommunityMember.community_id == community_id,
            CommunityMember.status == "active",
            CommunityMember.joined_at >= last_month_start,
            CommunityMember.joined_at < this_month_start,
        ).count()

        # Finance aggregates from wallet_transactions scoped by community_id
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

        tx_counts = (
            WalletTransaction.query.filter(WalletTransaction.community_id == community_id)
            .with_entities(func.count(WalletTransaction.id))
            .scalar()
        ) or 0

        return {
            "community": self._serialize(c),
            "wallet": wallet.to_dict() if wallet else {"balance": 0.0, "currency": "NGN", "status": None},
            "members": {
                "active": members_active,
                "total": members_total,
                "owners_active": owners_active,
                "admins_active": admins_active,
                "joined_last_month": members_joined_last_month,
            },
            "transactions": {
                "total": int(tx_counts),
                "deposits_volume": float(deposits_sum) if deposits_sum is not None else 0.0,
                "payments_volume": float(payments_sum) if payments_sum is not None else 0.0,
                "transfers_volume": float(transfers_sum) if transfers_sum is not None else 0.0,
                "withdrawals_volume": float(withdrawals_sum) if withdrawals_sum is not None else 0.0,
            },
        }

    def list_transactions(self, *, community_id: int, args: dict) -> Tuple[list[dict], int, int, int]:
        page = int(args.get("page", 1))
        page_size = int(args.get("page_size", 20))

        query = (
            WalletTransaction.query.filter(WalletTransaction.community_id == community_id)
            .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
            .join(User, Wallet.user_id == User.id)
        )

        search = args.get("search")
        if search:
            like = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    WalletTransaction.reference.ilike(like),
                    WalletTransaction.description.ilike(like),
                    User.email.ilike(like),
                    User.firstname.ilike(like),
                    User.lastname.ilike(like),
                )
            )

        if args.get("type"):
            query = query.filter(WalletTransaction.type == args["type"])

        if args.get("status"):
            query = query.filter(WalletTransaction.status == args["status"])

        total = query.count()
        rows = (
            query.order_by(WalletTransaction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .with_entities(WalletTransaction, User)
            .all()
        )

        items = []
        for t, u in rows:
            items.append(
                {
                    "id": t.reference,
                    "source": "wallet",
                    "type": t.type,
                    "amount": float(t.net_amount) if t.net_amount is not None else 0.0,
                    "currency": "NGN",
                    "status": t.status,
                    "description": t.description,
                    "occurred_at": (t.completed_at or t.created_at).isoformat()
                    if (t.completed_at or t.created_at)
                    else None,
                    "community": {"id": community_id},
                    "user": {"id": u.id, "full_name": u.full_name, "email": u.email},
                    "raw": t.to_dict(),
                }
            )
        return items, total, page, page_size

    def list_members(self, *, community_id: int, args: dict) -> Tuple[list[dict], int, int, int]:
        page = int(args.get("page", 1))
        page_size = int(args.get("page_size", 20))

        query = (
            CommunityMember.query.filter(CommunityMember.community_id == community_id)
            .join(User, CommunityMember.user_id == User.id)
        )

        search = args.get("search")
        if search:
            like = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.email.ilike(like),
                    User.firstname.ilike(like),
                    User.lastname.ilike(like),
                )
            )

        if args.get("role"):
            query = query.filter(CommunityMember.role == args["role"])
        if args.get("status"):
            query = query.filter(CommunityMember.status == args["status"])

        total = query.count()
        rows = (
            query.order_by(CommunityMember.joined_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .with_entities(CommunityMember, User)
            .all()
        )

        items = []
        for m, u in rows:
            items.append(
                {
                    "community_id": community_id,
                    "user_id": u.id,
                    "role": m.role,
                    "status": m.status,
                    "joined_at": m.joined_at.isoformat() if m.joined_at else None,
                    "user": {"id": u.id, "full_name": u.full_name, "email": u.email},
                }
            )

        return items, total, page, page_size

    def update_member(
        self,
        *,
        actor_user_id: int,
        community_id: int,
        user_id: int,
        updates: dict,
    ) -> Tuple[Optional[dict], Optional[str]]:
        member = CommunityMember.query.filter_by(community_id=community_id, user_id=user_id).first()
        if not member:
            return None, "Member not found"

        applied = {}

        if "role" in updates and updates.get("role") is not None:
            new_role = updates["role"]
            if member.role == "owner":
                return None, "Cannot change owner role via this endpoint"
            if new_role not in {"admin", "member"}:
                return None, "Invalid role"
            if member.role != new_role:
                applied["role"] = {"from": member.role, "to": new_role}
                member.role = new_role

        if "status" in updates and updates.get("status") is not None:
            new_status = updates["status"]
            if new_status not in {"active", "suspended"}:
                return None, "Invalid status"
            if member.status != new_status:
                applied["status"] = {"from": member.status, "to": new_status}
                member.status = new_status

        if not applied:
            return {
                "community_id": community_id,
                "user_id": user_id,
                "role": member.role,
                "status": member.status,
            }, None

        from modules.auth_v2.extensions import db
        db.session.commit()

        self.audit.log(
            actor_user_id=actor_user_id,
            action="admin.community.member.update",
            target_type="community_member",
            target_id=f"{community_id}:{user_id}",
            metadata={"changes": applied},
        )

        return {
            "community_id": community_id,
            "user_id": user_id,
            "role": member.role,
            "status": member.status,
        }, None

