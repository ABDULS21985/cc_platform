"""
Community Wallet Resource - Flask-Smorest MethodView endpoints
POST /api/v2/communities/<id>/deposit - Initiate community deposit
"""
from flask.views import MethodView
from flask_smorest import Blueprint
from modules.auth_v2.utils.decorators import token_required
from decimal import Decimal
import logging

from modules.community.schemas.payment_schema import (
    CommunityDepositSchema,
    CommunityTransactionQuerySchema,
    PaymentResponseSchema
)
from modules.community.schemas.community_schema import CommunityErrorSchema
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
)

logger = logging.getLogger(__name__)

community_wallet_blp = Blueprint(
    'community_wallet',
    __name__,
    url_prefix='/api/v2/community',
    description='Community wallet endpoints'
)


@community_wallet_blp.route('/<int:community_id>/transactions')
class CommunityTransactionsResource(MethodView):
    """Community transaction history (member-scoped)."""

    @token_required
    @community_wallet_blp.arguments(CommunityTransactionQuerySchema, location="query")
    @community_wallet_blp.response(200, description="Transactions retrieved")
    @community_wallet_blp.alt_response(400, schema=CommunityErrorSchema, description="Invalid request")
    def get(self, args, community_id, current_user=None):
        """
        Get transaction history for a community.

        Only active community members can view this history.
        """
        from modules.community.repositories import MemberRepository
        from modules.wallet.models.wallet import Wallet
        from modules.wallet.models.wallet_transaction import WalletTransaction
        from modules.auth_v2.models.user import User

        try:
            member_repo = MemberRepository()
            membership = member_repo.find_by_community_and_user(community_id, current_user.id)
            if not membership or membership.status != "active":
                return format_error(
                    error="not_member",
                    message="You must be an active member to view community transactions",
                    status_code=400,
                )

            limit = args.get("limit", 50)
            offset = args.get("offset", 0)

            query = (
                WalletTransaction.query.filter(WalletTransaction.community_id == community_id)
                .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
                .join(User, Wallet.user_id == User.id)
            )

            if txn_type := args.get("type"):
                if txn_type == "credit":
                    query = query.filter(WalletTransaction.type.in_(["credit", "deposit"]))
                elif txn_type == "debit":
                    query = query.filter(WalletTransaction.type.in_(["debit", "withdrawal", "transfer", "payment"]))
                else:
                    query = query.filter(WalletTransaction.type == txn_type)

            if status := args.get("status"):
                if status in {"successful", "completed"}:
                    query = query.filter(WalletTransaction.status.in_(["successful", "completed"]))
                else:
                    query = query.filter(WalletTransaction.status == status)

            if bill_id := args.get("bill_id"):
                query = query.filter(WalletTransaction.bill_id == int(bill_id))

            total = query.count()
            rows = (
                query.order_by(WalletTransaction.created_at.desc())
                .offset(offset)
                .limit(limit)
                .with_entities(WalletTransaction, User)
                .all()
            )

            items = []
            for txn, user in rows:
                payload = txn.to_dict()
                payload["payer_name"] = user.full_name
                payload["user"] = {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                }
                # Virtual account details (for deposits/collections) — from the wallet record.
                # Note: Wallet model doesn't store bank name; infer from transaction metadata.
                meta = payload.get("meta") or {}
                provider = meta.get("provider") or meta.get("source")
                provider_norm = str(provider).lower() if provider else None
                if provider_norm and "safehaven" in provider_norm:
                    bank_name = "SafeHaven MFB"
                    provider_out = "safehaven"
                elif provider_norm and "bell" in provider_norm:
                    bank_name = "Bell MFB"
                    provider_out = "bell_mfb"
                else:
                    bank_name = None
                    provider_out = meta.get("provider")

                payload["provider"] = provider_out
                payload["virtual_account"] = {
                    "account_number": getattr(txn.wallet, "account_number", None),
                    "account_name": getattr(txn.wallet, "account_name", None),
                    "bank_name": bank_name,
                }
                items.append(payload)

            return format_data(
                data={
                    "transactions": items,
                    "pagination": {
                        "total": total,
                        "limit": limit,
                        "offset": offset,
                        "has_more": (offset + len(items)) < total,
                    },
                },
                message="Community transactions retrieved successfully",
                status_code=200,
            )
        except Exception as e:
            logger.error(f"Error fetching community transactions: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@community_wallet_blp.route('/<int:community_id>/deposit')
class CommunityDepositResource(MethodView):
    """Community deposit endpoint"""
    
    @community_wallet_blp.arguments(CommunityDepositSchema)
    @community_wallet_blp.response(200, PaymentResponseSchema, description='Deposit initiated')
    @community_wallet_blp.alt_response(400, schema=CommunityErrorSchema, description='Invalid request')
    @community_wallet_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    @token_required
    def post(self, data, community_id, current_user=None):
        """
        Initiate community deposit
        
        Creates a one-time virtual account for member to deposit to community wallet.
        Funds are credited automatically once payment is confirmed.
        """
        # Import services inside method to avoid module-level initialization issues
        from modules.community.repositories import MemberRepository
        from modules.community.services.deposit_service import CommunityDepositService
        
        member_repo = MemberRepository()
        deposit_service = CommunityDepositService()
        
        try:
            # Check membership
            membership = member_repo.find_by_community_and_user(community_id, current_user.id)
            if not membership or membership.status != 'active':
                return format_error(
                    error='not_member',
                    message='You must be an active member to deposit',
                    status_code=400,
                )
            
            amount = Decimal(str(data['amount']))
            description = data.get('description', 'Community deposit')
            
            # Service returns a single dict (and raises on failure).
            result = deposit_service.initiate_deposit(
                community_id=community_id,
                user_id=current_user.id,
                amount=amount,
                description=description
            )
            
            logger.info(f"Community deposit initiated: {community_id} by user {current_user.id}, amount: {amount}")
            
            return format_data(
                data=result,
                message='Deposit initiated successfully',
                status_code=200,
            )
            
        except Exception as e:
            # Don't leak internal exception details to clients.
            try:
                from modules.auth_v2.extensions import db
                db.session.rollback()
            except Exception:
                pass
            logger.error(f"Error initiating community deposit: {str(e)}", exc_info=True)
            return format_internal_error("An error occurred while initiating deposit. Please try again.")
