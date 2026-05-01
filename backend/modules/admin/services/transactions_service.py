from typing import Optional, Tuple

from sqlalchemy import or_

from modules.auth_v2.models.user import User
from modules.community.models.community import Community
from modules.wallet.models.wallet import Wallet
from modules.wallet.models.wallet_transaction import WalletTransaction


class AdminTransactionsService:
    def _serialize_wallet_txn(self, t: WalletTransaction) -> dict:
        community = None
        if t.community_id:
            community = {"id": t.community_id, "name": None}
            if hasattr(t, "community") and t.community:
                community["name"] = t.community.name

        user = None
        if t.wallet and t.wallet.user:
            u = t.wallet.user
            user = {"id": u.id, "full_name": u.full_name, "email": u.email}

        return {
            "id": t.reference,
            "source": "wallet",
            "type": t.type,
            "amount": float(t.net_amount) if t.net_amount is not None else 0.0,
            "currency": "NGN",
            "status": t.status,
            "description": t.description,
            "occurred_at": (t.completed_at or t.created_at).isoformat() if (t.completed_at or t.created_at) else None,
            "community": community,
            "user": user,
            "raw": t.to_dict(),
        }

    def list_transactions(self, *, args: dict) -> Tuple[list[dict], int, int, int]:
        page = int(args.get("page", 1))
        page_size = int(args.get("page_size", 20))

        # MVP: wallet_transactions only
        query = WalletTransaction.query.join(Wallet, WalletTransaction.wallet_id == Wallet.id).join(
            User, Wallet.user_id == User.id
        )
        query = query.outerjoin(Community, WalletTransaction.community_id == Community.id)

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
                    Community.name.ilike(like),
                )
            )

        if args.get("type"):
            query = query.filter(WalletTransaction.type == args["type"])

        if args.get("status"):
            query = query.filter(WalletTransaction.status == args["status"])

        # source filter is ignored for MVP (only wallet supported), but keep it for forward compatibility
        total = query.count()
        items = (
            query.order_by(WalletTransaction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return [self._serialize_wallet_txn(t) for t in items], total, page, page_size

    def get_transaction(self, reference: str) -> Optional[dict]:
        t = WalletTransaction.query.filter_by(reference=reference).first()
        return self._serialize_wallet_txn(t) if t else None

