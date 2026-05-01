"""
Membership Payment Resource - Flask-Smorest MethodView endpoints
POST /api/v2/communities/<id>/membership/payment/initiate - Initiate membership payment
POST /api/v2/communities/<id>/membership/payment/verify - Verify payment
GET /api/v2/communities/<id>/membership/payment/status - Check payment status
"""
from flask.views import MethodView
from flask_smorest import Blueprint
from modules.auth_v2.utils.decorators import token_required
from decimal import Decimal
from datetime import datetime, timedelta
import os
import logging

from modules.community.schemas.payment_schema import (
    MembershipPaymentInitSchema,
    MembershipPaymentVerifySchema,
    PaymentResponseSchema
)
from modules.community.schemas.community_schema import CommunityErrorSchema
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_not_found,
    format_unauthorized,
)

logger = logging.getLogger(__name__)

membership_payment_blp = Blueprint(
    'membership_payment',
    __name__,
    url_prefix='/api/v2/community',
    description='Community membership payment endpoints'
)


@membership_payment_blp.route('/<int:community_id>/membership/payment/initiate')
class MembershipPaymentInitResource(MethodView):
    """Initiate membership payment endpoint"""
    
    @membership_payment_blp.arguments(MembershipPaymentInitSchema)
    @membership_payment_blp.response(200, PaymentResponseSchema, description='Payment initiated')
    @membership_payment_blp.alt_response(400, schema=CommunityErrorSchema, description='Invalid request')
    @membership_payment_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    @token_required
    def post(self, data, community_id, current_user=None):
        """
        Initiate membership payment
        
        Creates SafeHaven virtual account for user to pay community membership fee.
        After payment, user must call /verify endpoint to activate membership.
        """
        # Import services inside method to avoid module-level initialization issues
        from modules.community.repositories import CommunityRepository, MemberRepository
        from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
        from modules.wallet.providers.safehaven_provider import SafeHavenProvider
        from modules.wallet.providers.base_payment_provider import VirtualAccountRequest
        from modules.auth_v2.extensions import db
        
        community_repo = CommunityRepository()
        member_repo = MemberRepository()
        transaction_repo = WalletTransactionRepository()
        
        try:
            invite_code = data['invite_code']
            
            # Validate invite code and get community
            community = community_repo.find_by_invite_code(invite_code)
            if not community or community.id != community_id:
                return format_error(
                    error='invalid_invite',
                    message='Invalid invite code for this community',
                    status_code=400,
                )
            
            # Check if community is active
            if community.status != 'active':
                return format_error(
                    error='community_inactive',
                    message=f'Community is {community.status}, membership not allowed',
                    status_code=400,
                )
            
            # Check if already an active member
            member = member_repo.find_by_community_and_user(community_id, current_user.id)
            if member and member.status == 'active':
                return format_error(
                    error='already_member',
                    message='You are already an active member of this community',
                    status_code=400,
                )
            
            # Check if membership fee is required
            if community.member_cost <= 0:
                return format_error(
                    error='payment_not_required',
                    message='This community is free to join. Use the join endpoint instead.',
                    status_code=400,
                )
            
            # Check if community has a wallet
            if not community.wallet:
                return format_error(
                    error='wallet_not_found',
                    message='Community wallet not found',
                    status_code=500,
                )
            
            # Generate ULID-based transaction reference
            from modules.wallet.models.wallet_transaction import WalletTransaction as TxnModel
            reference = TxnModel.generate_reference('MEM')
            
            # Create virtual account via SafeHaven
            logger.info(
                f"Creating SafeHaven virtual account for membership payment: "
                f"community_id={community_id}, user_id={current_user.id}, amount={community.member_cost}"
            )
            
            provider = SafeHavenProvider()
            virtual_account_response = provider.ensure_virtual_account(
                VirtualAccountRequest(
                    user_id=current_user.id,
                    wallet_id=community.wallet.id,
                    first_name=current_user.firstname or "Member",
                    last_name=current_user.lastname or "Join",
                    phone_number=current_user.phone_number or "",
                    bvn="",
                    date_of_birth="",
                    gender="unspecified",
                    metadata={
                        "community_id": community_id,
                        "community_name": community.name,
                        "user_id": current_user.id,
                        "invite_code": invite_code,
                        "reference": reference,
                        "amount": str(community.member_cost),
                        "purpose": "membership_payment"
                    }
                )
            )
            
            # Create pending transaction record with balance tracking
            from modules.wallet.models.wallet_transaction import WalletTransaction as TxnModel
            signed_amount = TxnModel.compute_signed_amount(community.member_cost, 'credit')
            wallet_balance = community.wallet.balance if community.wallet else Decimal('0.00')
            
            transaction = transaction_repo.create({
                'wallet_id': community.wallet.id,
                'community_id': community_id,
                'reference': reference,
                # DB constraint expects business types (deposit/withdrawal/transfer/payment).
                # Membership payments are deposits into the community wallet via a virtual account.
                'type': 'deposit',
                'transaction_type': 'membership_payment',
                'amount': community.member_cost,
                'signed_amount': signed_amount,
                'fee': Decimal('0.00'),
                'net_amount': community.member_cost,
                'balance_before': wallet_balance,
                'balance_after': wallet_balance + community.member_cost,
                'description': f'Membership payment for {community.name}',
                'status': 'pending',
                'meta': {
                    'invite_code': invite_code,
                    'user_id': current_user.id,
                    'community_id': community_id,
                    'provider': 'safehaven',
                    'safehaven_virtual_account': {
                        'account_number': virtual_account_response.account_number,
                        'account_name': virtual_account_response.account_name,
                        'bank_name': virtual_account_response.bank_name or 'SafeHaven MFB',
                        'provider_reference': virtual_account_response.provider_reference,
                    },
                }
            })
            
            db.session.commit()
            
            logger.info(f"Membership payment initiated: {reference}, transaction_id={transaction.id}")

            valid_for_seconds = int(os.getenv("SAFEHAVEN_ACCOUNT_VALID_FOR", "900"))
            expires_at = datetime.utcnow() + timedelta(seconds=valid_for_seconds)
            
            return format_data(
                data={
                    'transaction_id': transaction.id,
                    'reference': reference,
                    'amount': str(community.member_cost),
                    'status': 'pending',
                    'account_details': {
                        'account_number': virtual_account_response.account_number,
                        'account_name': virtual_account_response.account_name,
                        'bank_name': virtual_account_response.bank_name or 'SafeHaven MFB'
                    },
                    'instructions': (
                        f'Transfer exactly ₦{community.member_cost:,.2f} to the account above. '
                        f'After payment, call /verify to activate your membership.'
                    ),
                    'expires_in_seconds': valid_for_seconds,
                    'expires_at': expires_at.isoformat() + "Z",
                },
                message='Virtual account created successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error initiating membership payment: {str(e)}", exc_info=True)
            return format_internal_error("An error occurred while initiating membership payment. Please try again.")


@membership_payment_blp.route('/<int:community_id>/membership/payment/verify')
class MembershipPaymentVerifyResource(MethodView):
    """Verify membership payment endpoint"""
    
    @membership_payment_blp.arguments(MembershipPaymentVerifySchema)
    @membership_payment_blp.response(200, description='Membership activated')
    @membership_payment_blp.alt_response(400, schema=CommunityErrorSchema, description='Verification failed')
    @token_required
    def post(self, data, community_id, current_user=None):
        """
        Verify membership payment
        
        After payment is made, call this to verify and activate membership.
        """
        # Import services inside method to avoid module-level initialization issues
        from modules.community.repositories import MemberRepository
        from modules.community.services.invite_service import InviteService
        from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
        from modules.wallet.services.payment_verification_service import PaymentVerificationService
        from modules.auth_v2.extensions import db
        
        member_repo = MemberRepository()
        invite_service = InviteService()
        transaction_repo = WalletTransactionRepository()
        
        try:
            reference = data['reference']
            
            # Find transaction
            transaction = transaction_repo.find_by_reference(reference)
            if not transaction:
                return format_not_found('Transaction')
            
            # Verify transaction belongs to user and community
            if transaction.meta.get('user_id') != current_user.id:
                return format_unauthorized('Transaction does not belong to you')
            
            if transaction.meta.get('community_id') != community_id:
                return format_error(
                    error='invalid_community',
                    message='Transaction is for a different community',
                    status_code=400,
                )
            
            # Check if already processed
            if transaction.status == 'successful':
                # Check if already a member
                member = member_repo.find_by_community_and_user(community_id, current_user.id)
                if member and member.status == 'active':
                    return format_data(
                        data={'status': 'already_member'},
                        message='You are already an active member',
                        status_code=200,
                    )
            
            # Verify payment with SafeHaven
            verification_service = PaymentVerificationService()
            verified, error = verification_service.verify_payment(reference)
            
            if not verified:
                return format_error(
                    error='payment_pending',
                    message=error or 'Payment not yet received. Please try again after payment.',
                    status_code=400,
                )
            
            # Payment verified - activate membership
            invite_code = transaction.meta.get('invite_code')
            
            # Add member with active status
            member, error = member_repo.create_or_activate(
                community_id=community_id,
                user_id=current_user.id,
                role='member',
                status='active'
            )
            
            if error:
                return format_error(
                    error='activation_failed',
                    message=error,
                    status_code=400,
                )
            
            # Increment invite usage
            if invite_code:
                invite_service.increment_usage(invite_code)
            
            db.session.commit()
            
            logger.info(
                f"Membership activated: community_id={community_id}, user_id={current_user.id}, "
                f"reference={reference}"
            )
            
            return format_data(
                data={
                    'status': 'active',
                    'community_id': community_id,
                    'member_id': member.id
                },
                message='Membership activated successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error verifying membership payment: {str(e)}", exc_info=True)
            return format_internal_error("An error occurred while verifying payment. Please try again.")


@membership_payment_blp.route('/<int:community_id>/membership/payment/status')
class MembershipPaymentStatusResource(MethodView):
    """Check membership payment status"""
    
    @membership_payment_blp.response(200, description='Status retrieved')
    @membership_payment_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    @token_required
    def get(self, community_id, current_user=None):
        """
        Get membership payment status
        
        Returns the latest membership payment status for the user.
        """
        # Import services inside method to avoid module-level initialization issues
        from modules.community.repositories import MemberRepository
        from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
        
        member_repo = MemberRepository()
        transaction_repo = WalletTransactionRepository()
        
        try:
            # Find latest membership payment transaction for user/community
            transaction = transaction_repo.find_latest_membership_payment(
                community_id=community_id,
                user_id=current_user.id
            )
            
            if not transaction:
                return format_not_found('Membership payment')
            
            # Check membership status
            member = member_repo.find_by_community_and_user(community_id, current_user.id)
            
            return format_data(
                data={
                    'transaction_id': transaction.id,
                    'reference': transaction.reference,
                    'amount': str(transaction.amount),
                    'payment_status': transaction.status,
                    'membership_status': member.status if member else 'not_member',
                    'created_at': transaction.created_at.isoformat() if transaction.created_at else None
                },
                message='Status retrieved',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error getting payment status: {str(e)}", exc_info=True)
            return format_internal_error(details=str(e))
