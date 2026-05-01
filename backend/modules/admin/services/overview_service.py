from datetime import datetime

from sqlalchemy import func

from modules.auth_v2.models.user import User
from modules.community.models.community import Community
from modules.community.models.community_member import CommunityMember
from modules.wallet.models.wallet_transaction import WalletTransaction


class AdminOverviewService:
    def get_overview(self) -> dict:
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        verified_users = User.query.filter_by(email_verified=True).count()

        total_communities = Community.query.count()
        active_communities = Community.query.filter_by(status="active").count()

        total_transactions = WalletTransaction.query.count()
        total_deposits = WalletTransaction.query.filter(
            WalletTransaction.type.in_(["credit", "deposit"])
        ).count()
        total_withdrawals = WalletTransaction.query.filter(
            WalletTransaction.type.in_(["debit", "withdrawal"])
        ).count()

        # Volume figures from wallet_transactions (initial source of truth for MVP)
        total_deposit_volume = (
            WalletTransaction.query.filter(
                WalletTransaction.type.in_(["credit", "deposit"]),
                WalletTransaction.status.in_(["successful", "completed"]),
            )
            .with_entities(WalletTransaction.net_amount)
            .all()
        )
        total_withdrawal_volume = (
            WalletTransaction.query.filter(
                WalletTransaction.type.in_(["debit", "withdrawal"]),
                WalletTransaction.status.in_(["successful", "completed"]),
            )
            .with_entities(WalletTransaction.net_amount)
            .all()
        )

        def _sum_numeric(rows):
            total = 0
            for (val,) in rows:
                if val is not None:
                    total += float(val)
            return total

        now = datetime.utcnow()
        this_month_start = datetime(now.year, now.month, 1)
        if now.month == 1:
            last_month_start = datetime(now.year - 1, 12, 1)
        else:
            last_month_start = datetime(now.year, now.month - 1, 1)

        new_users_last_month = User.query.filter(
            User.created_at >= last_month_start,
            User.created_at < this_month_start,
        ).count()
        new_communities_last_month = Community.query.filter(
            Community.created_at >= last_month_start,
            Community.created_at < this_month_start,
        ).count()
        community_members_joined_last_month = CommunityMember.query.filter(
            CommunityMember.joined_at >= last_month_start,
            CommunityMember.joined_at < this_month_start,
            CommunityMember.status == "active",
        ).count()

        return {
            "users": {
                "total": total_users,
                "active": active_users,
                "email_verified": verified_users,
                "joined_last_month": new_users_last_month,
            },
            "communities": {
                "total": total_communities,
                "active": active_communities,
                "created_last_month": new_communities_last_month,
                "members_joined_last_month": community_members_joined_last_month,
            },
            "transactions": {
                "total": total_transactions,
                "deposits_count": total_deposits,
                "withdrawals_count": total_withdrawals,
                "deposits_volume": _sum_numeric(total_deposit_volume),
                "withdrawals_volume": _sum_numeric(total_withdrawal_volume),
            },
        }

