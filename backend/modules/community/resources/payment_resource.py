"""
Payment Resource - Flask-Smorest MethodView endpoints
POST /api/v1/communities/<id>/bills/<bill_id>/pay - Pay bill
GET /api/v1/communities/<id>/balance - Get community balance
POST /api/v1/communities/<id>/transfer - Transfer funds
"""
from flask.views import MethodView
from flask_smorest import Blueprint
from flask import request
from decimal import Decimal
import logging

from modules.community.schemas.bill_schema import PayBillSchema
from modules.community.schemas.payment_schema import (
    TransferFundsSchema,
    PaymentResponseSchema,
    TransferResponseSchema,
    BalanceResponseSchema,
    TransferStatusResponseSchema,
)
from modules.community.schemas.community_schema import CommunityErrorSchema
from modules.community.services import PaymentIntentService, MembershipService, CommunityWalletService
from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_unauthorized,
)

logger = logging.getLogger(__name__)

payment_blp = Blueprint(
    'payments',
    __name__,
    url_prefix='/api/v2/community',
    description='Community payment endpoints'
)

payment_service = PaymentIntentService()
membership_service = MembershipService()
wallet_service = CommunityWalletService()


@payment_blp.route('/<int:community_id>/bills/<int:bill_id>/pay')
class PayBillResource(MethodView):
    """Pay bill endpoint"""
    
    @token_required
    @payment_blp.arguments(PayBillSchema)
    @payment_blp.response(200, PaymentResponseSchema, description='Payment processed')
    @payment_blp.alt_response(400, schema=CommunityErrorSchema, description='Payment failed')
    @payment_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, data, community_id, bill_id, current_user=None):
        """
        Pay community bill
        
        Process payment for a community bill using wallet, transfer, or card.
        """
        try:
            # Check community membership
            if not membership_service.is_member(community_id, current_user.id):
                return format_unauthorized('Not a community member')
            
            amount = Decimal(str(data['amount']))
            
            # Validate payment
            valid, error = payment_service.validate_payment(bill_id, current_user.id, amount)
            if not valid:
                return format_error(error='validation_failed', message=error, status_code=400)
            
            # Process payment
            result, error = payment_service.pay_community_bill(
                bill_id,
                current_user.id,
                amount,
                data['payment_method'],
                pin=data.get("pin"),
            )
            
            if error:
                return format_error(error='payment_failed', message=error, status_code=400)
            
            return format_data(
                data=result,
                message='Payment processed successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error processing payment: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@payment_blp.route('/<int:community_id>/balance')
class CommunityBalanceResource(MethodView):
    """Community balance endpoint"""
    
    @token_required
    @payment_blp.response(200, BalanceResponseSchema, description='Balance retrieved')
    @payment_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @payment_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    def get(self, community_id, current_user=None):
        """
        Get community balance
        
        Returns current balance and transaction summary. Only admin/owner can view.
        """
        try:
            # Check authorization
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only admins/owners can view balance')
            
            balance_info = wallet_service.get_community_balance(community_id)
            if not balance_info:
                return format_error(
                    error='not_found',
                    message='Community wallet not found',
                    status_code=404,
                )
            
            return format_data(
                data=balance_info,
                message='Balance retrieved successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error getting balance: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@payment_blp.route('/<int:community_id>/transfer')
class TransferFundsResource(MethodView):
    """Transfer funds endpoint"""
    
    @token_required
    @payment_blp.arguments(TransferFundsSchema)
    @payment_blp.response(200, TransferResponseSchema, description='Transfer initiated')
    @payment_blp.alt_response(400, schema=CommunityErrorSchema, description='Transfer failed')
    @payment_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, data, community_id, current_user=None):
        """
        Transfer community funds
        
        Transfer funds from community wallet to external bank account.
        Only owner can initiate transfers.
        """
        try:
            # Only owner can transfer
            if not membership_service.is_owner(community_id, current_user.id):
                return format_unauthorized('Only owner can transfer funds')

            # Enforce transaction PIN for owner fund movements
            try:
                from modules.wallet.services.pin_service import TransactionPinService

                TransactionPinService().verify_pin(user_id=current_user.id, pin=str(data.get("pin", "")))
            except ValueError as pin_err:
                return format_error(error="invalid_pin", message=str(pin_err), status_code=400)
            
            amount = Decimal(str(data['amount']))
            
            # Optional: client-provided idempotency key for safe retries.
            idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")

            result, error = wallet_service.transfer_funds(
                community_id=community_id,
                amount=amount,
                recipient_account=data['recipient_account'],
                recipient_name=data['recipient_name'],
                recipient_bank_code=data['recipient_bank_code'],
                reason=data.get('reason'),
                initiated_by=current_user.id,
                idempotency_key=idempotency_key,
            )
            
            if error:
                return format_error(error='transfer_failed', message=error, status_code=400)
            
            return format_data(
                data=result,
                message='Transfer initiated successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error transferring funds: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@payment_blp.route('/<int:community_id>/transfer/<string:reference>')
class TransferStatusResource(MethodView):
    """Lookup a community transfer status by reference."""

    @token_required
    @payment_blp.response(200, TransferStatusResponseSchema, description="Transfer status retrieved")
    @payment_blp.alt_response(401, schema=CommunityErrorSchema, description="Unauthorized")
    @payment_blp.alt_response(404, schema=CommunityErrorSchema, description="Not found")
    def get(self, community_id, reference: str, current_user=None):
        try:
            # Admin/owner can view transfer status.
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized("Only admins/owners can view transfer status")

            from modules.wallet.models.wallet_transaction import WalletTransaction

            txn = (
                WalletTransaction.query.filter(
                    WalletTransaction.community_id == community_id,
                    WalletTransaction.transaction_type == "community_transfer",
                    WalletTransaction.reference == reference,
                )
                .order_by(WalletTransaction.created_at.desc())
                .first()
            )
            if not txn:
                return format_error(
                    error="not_found",
                    message="Transfer not found",
                    status_code=404,
                )

            meta = txn.meta or {}
            return format_data(
                data={
                    "transaction_id": txn.id,
                    "reference": txn.reference,
                    "amount": str(txn.amount),
                    "fee": str(txn.fee),
                    "net_amount": str(txn.net_amount),
                    "status": txn.status,
                    "recipient_account": meta.get("recipient_account"),
                    "recipient_name": meta.get("recipient_name"),
                    "recipient_bank_code": meta.get("recipient_bank_code"),
                    "provider_reference": meta.get("provider_reference"),
                    "provider": meta.get("provider"),
                },
                message="Transfer status retrieved successfully",
                status_code=200,
            )

        except Exception as e:
            logger.error(f"Error getting transfer status: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
