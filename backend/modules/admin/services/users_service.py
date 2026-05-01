from typing import Any, Dict, Optional, Tuple

from sqlalchemy import or_

from modules.admin.services.audit_service import AdminAuditService
from modules.auth_v2.extensions import db
from modules.auth_v2.models.user import User
from modules.community.models.community import Community
from modules.wallet.models.wallet import Wallet


class AdminUsersService:
    def __init__(self):
        self.audit = AdminAuditService()
        self.allowed_roles = {"user", "admin", "super_admin", "support", "moderator", "finance", "ops"}

    def list_users(self, *, args: dict) -> Tuple[list[dict], int, int, int]:
        page = int(args.get("page", 1))
        page_size = int(args.get("page_size", 20))

        query = User.query.outerjoin(Wallet, Wallet.user_id == User.id).add_columns(Wallet.balance, Wallet.status)

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

        for field in (
            "role",
            "verification_status",
            "email_verified",
            "bvn_verified",
            "nin_verified",
            "is_active",
        ):
            val = args.get(field)
            if val is not None:
                query = query.filter(getattr(User, field) == val)

        total = query.count()
        rows = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        items = []
        for user, wallet_balance, wallet_status in rows:
            payload = user.to_dict()
            payload["wallet"] = {
                "balance": float(wallet_balance) if wallet_balance is not None else 0.0,
                "status": wallet_status,
            }
            payload["communities_created_count"] = Community.query.filter_by(created_by=user.id).count()
            items.append(payload)

        return items, total, page, page_size

    def get_user(self, user_id: int) -> Optional[dict]:
        user = User.query.get(user_id)
        if not user:
            return None

        wallet = Wallet.query.filter_by(user_id=user_id).first()
        created_communities = (
            Community.query.filter_by(created_by=user_id)
            .order_by(Community.created_at.desc())
            .all()
        )

        payload = user.to_dict()
        payload["wallet"] = wallet.to_dict(include_transactions=False) if wallet else None
        payload["communities_created"] = [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "status": c.status,
                "member_count": c.member_count,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in created_communities
        ]
        payload["communities_created_count"] = len(payload["communities_created"])
        return payload

    def update_user(
        self,
        *,
        actor_user_id: int,
        user_id: int,
        updates: Dict[str, Any],
    ) -> Tuple[Optional[dict], Optional[str]]:
        user = User.query.get(user_id)
        if not user:
            return None, "User not found"

        allowed_fields = {"role", "is_active"}
        applied = {}

        for k, v in updates.items():
            if k in allowed_fields and v is not None and hasattr(user, k):
                if k == "role" and v not in self.allowed_roles:
                    return None, "Invalid role"
                old = getattr(user, k)
                if old != v:
                    setattr(user, k, v)
                    applied[k] = {"from": old, "to": v}

        if not applied:
            return user.to_dict(), None

        db.session.commit()

        self.audit.log(
            actor_user_id=actor_user_id,
            action="admin.user.update",
            target_type="user",
            target_id=str(user_id),
            metadata={"changes": applied},
        )

        return user.to_dict(), None

