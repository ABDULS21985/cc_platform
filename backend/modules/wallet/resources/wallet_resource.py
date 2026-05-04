"""
Wallet Resources - Flask-Smorest MethodView endpoints
GET /api/v2/wallet - Get wallet information
GET /api/v2/wallet/transactions - Get transaction history
GET /api/v2/wallet/summary - Get wallet summary
POST /api/v2/wallet/deposit - Initiate deposit
POST /api/v2/wallet/withdraw - Withdraw funds
"""
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_login import current_user as flask_current_user
from modules.auth_v2.utils.decorators import token_required
import logging
from decimal import Decimal
from datetime import datetime

from modules.wallet.schemas.wallet_schema import (
    DepositSchema,
    WithdrawSchema,
    TransactionQuerySchema,
    SetTransactionPinSchema,
    ChangeTransactionPinSchema,
    ResetTransactionPinSchema,
    WalletResponseSchema,
    TransactionResponseSchema,
    WalletSummaryResponseSchema,
    DepositResponseSchema,
    WithdrawResponseSchema,
    WalletErrorSchema
)
from modules.wallet.services.wallet_service import WalletService
from modules.verification.utils.rate_limiter import rate_limit
from modules.core.response_formatter import format_data, format_error, format_internal_error

logger = logging.getLogger(__name__)

wallet_blp = Blueprint(
    'wallet',
    __name__,
    url_prefix='/api/v2/wallet',
    description='Wallet operations endpoints'
)


@wallet_blp.route('')
class WalletResource(MethodView):
    """Get wallet information for logged-in user"""
    
    @wallet_blp.response(200, WalletResponseSchema, description='Wallet information retrieved successfully')
    @wallet_blp.alt_response(404, schema=WalletErrorSchema, description='Wallet not found')
    @token_required
    def get(self, current_user=None):
        """
        Get wallet information
        
        Returns wallet details including account number, balance, currency, and status.
        Wallet is created after identity verification (BVN/NIN).
        """
        try:
            service = WalletService()
            wallet = service.get_user_wallet(current_user.id)
            
            if not wallet:
                response, status = format_error(
                    error="wallet_not_found",
                    message="Wallet not found. Please complete identity verification first.",
                    status_code=404,
                )
                return response, status
            
            response, status = format_data(data=wallet, message="Wallet retrieved successfully", status_code=200)
            return response, status
            
        except Exception as e:
            logger.error(f"Error getting wallet for user {current_user.id}: {str(e)}", exc_info=True)
            response, status = format_internal_error("An error occurred while fetching wallet")
            return response, status


@wallet_blp.route('/transactions')
class WalletTransactionsResource(MethodView):
    """Get transaction history for wallet"""
    
    @wallet_blp.arguments(TransactionQuerySchema, location='query')
    @wallet_blp.response(200, TransactionResponseSchema, description='Transactions retrieved successfully')
    @wallet_blp.alt_response(400, schema=WalletErrorSchema, description='Invalid parameters')
    @wallet_blp.alt_response(404, schema=WalletErrorSchema, description='Wallet not found')
    @token_required
    def get(self, args, current_user=None):
        """
        Get transaction history
        
        Returns paginated list of transactions. Supports filtering by type (credit/debit).
        
        Query Parameters:
            limit: Number of transactions (1-100, default 50)
            offset: Pagination offset (default 0)
            type: Filter by transaction type ('credit' or 'debit')
        """
        try:
            limit = args.get('limit', 50)
            offset = args.get('offset', 0)

            service = WalletService()
            result = service.get_wallet_transactions(
                current_user.id,
                limit=limit,
                offset=offset,
                args=args,
            )
            
            # Check if wallet exists when no transactions found
            if not result['transactions'] and offset == 0:
                if not service.check_wallet_exists(current_user.id):
                    response, status = format_error(
                        error="wallet_not_found",
                        message="Wallet not found. Please complete identity verification first.",
                        status_code=404,
                    )
                    return response, status
            
            response, status = format_data(data=result, message="Transactions retrieved successfully", status_code=200)
            return response, status
            
        except ValueError as e:
            response, status = format_error(error="invalid_parameters", message=str(e), status_code=400)
            return response, status
        except Exception as e:
            logger.error(f"Error getting transactions for user {current_user.id}: {str(e)}", exc_info=True)
            response, status = format_internal_error("An error occurred while fetching transactions")
            return response, status


@wallet_blp.route('/summary')
class WalletSummaryResource(MethodView):
    """Get wallet summary with balance and statistics"""
    
    @wallet_blp.response(200, WalletSummaryResponseSchema, description='Summary retrieved successfully')
    @wallet_blp.alt_response(404, schema=WalletErrorSchema, description='Wallet not found')
    @token_required
    def get(self, current_user=None):
        """
        Get wallet summary
        
        Returns wallet info, recent transactions, and summary statistics
        including total credits, total debits, and transaction count.
        """
        try:
            service = WalletService()
            summary = service.get_wallet_summary(current_user.id)
            
            if not summary['wallet']:
                response, status = format_error(
                    error="wallet_not_found",
                    message="Wallet not found. Please complete identity verification first.",
                    status_code=404,
                )
                return response, status
            
            response, status = format_data(data=summary, message="Wallet summary retrieved successfully", status_code=200)
            return response, status
            
        except Exception as e:
            logger.error(f"Error getting wallet summary for user {current_user.id}: {str(e)}", exc_info=True)
            response, status = format_internal_error("An error occurred while fetching wallet summary")
            return response, status


@wallet_blp.route('/deposit')
class DepositResource(MethodView):
    """Initiate deposit to wallet"""
    
    @wallet_blp.arguments(DepositSchema)
    @wallet_blp.response(200, DepositResponseSchema, description='Deposit initiated successfully')
    @wallet_blp.alt_response(400, schema=WalletErrorSchema, description='Validation error')
    @wallet_blp.alt_response(403, schema=WalletErrorSchema, description='Verification required')
    @wallet_blp.alt_response(404, schema=WalletErrorSchema, description='Wallet not found')
    @wallet_blp.alt_response(429, schema=WalletErrorSchema, description='Rate limit exceeded')
    @token_required
    @rate_limit(max_requests=5, window_minutes=60, key_prefix="wallet_deposit")
    def post(self, data, current_user=None):
        """
        Initiate deposit
        
        Initiates a deposit to wallet. Returns bank details for user to transfer funds.
        Creates Bell MFB virtual account on-demand if not exists.
        
        Rate limited to 5 requests per hour.
        """
        try:
            from modules.wallet.services.deposit_service import DepositService
            
            amount = data['amount']
            description = data.get('description', 'Wallet deposit')
            
            # Truncate description to 255 chars
            if description:
                description = str(description)[:255]
            
            # Use DepositService for orchestration
            deposit_service = DepositService()
            result = deposit_service.initiate_deposit(
                user_id=current_user.id,
                amount=amount,
                description=description
            )
            
            logger.info(f"Deposit initiated for user {current_user.id}: ₦{amount}")
            
            response, status = format_data(data=result, message="Deposit initiated successfully", status_code=200)
            return response, status
            
        except ValueError as e:
            # Validation errors from DepositService
            error_message = str(e).lower()
            
            if 'not found' in error_message:
                response, status = format_error(error="wallet_not_found", message=str(e), status_code=404)
                return response, status
            elif 'verification' in error_message:
                response, status = format_error(error="verification_required", message=str(e), status_code=403)
                return response, status
            else:
                response, status = format_error(error="validation_error", message=str(e), status_code=400)
                return response, status
                
        except Exception as e:
            # Ensure SQLAlchemy session is clean after any failure (e.g. IntegrityError)
            try:
                from modules.auth_v2.extensions import db
                db.session.rollback()
            except Exception:
                pass

            user_id = getattr(current_user, "id", None)
            logger.error(f"Deposit error for user {user_id}: {str(e)}", exc_info=True)
            response, status = format_internal_error("An error occurred while processing deposit")
            return response, status


@wallet_blp.route('/withdraw')
class WithdrawResource(MethodView):
    """Withdraw funds from wallet to bank account"""
    
    @wallet_blp.arguments(WithdrawSchema)
    @wallet_blp.response(200, WithdrawResponseSchema, description='Withdrawal initiated successfully')
    @wallet_blp.alt_response(400, schema=WalletErrorSchema, description='Validation error or insufficient balance')
    @wallet_blp.alt_response(404, schema=WalletErrorSchema, description='Wallet not found')
    @wallet_blp.alt_response(429, schema=WalletErrorSchema, description='Rate limit exceeded')
    @token_required
    @rate_limit(max_requests=3, window_minutes=60, key_prefix="wallet_withdrawal")
    def post(self, data, current_user=None):
        """
        Withdraw funds
        
        Withdraw funds from wallet to external bank account.
        Fee: 2% or minimum ₦50.
        
        Rate limited to 3 requests per hour.
        """
        try:
            from modules.wallet.repositories.wallet_repository import WalletRepository
            from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
            from modules.auth_v2.extensions import db
            from modules.wallet.services.pin_service import TransactionPinService

            # Enforce transaction PIN for money-moving actions
            try:
                TransactionPinService().verify_pin(user_id=current_user.id, pin=str(data.get("pin", "")))
            except ValueError as pin_err:
                response, status = format_error(error="invalid_pin", message=str(pin_err), status_code=400)
                return response, status
            
            amount = data['amount']
            bank_code = data['bank_code'].strip()[:5]
            account_number = data['account_number'].strip()[:20]
            account_name = data.get('account_name', 'N/A').strip()[:255]
            
            # Get wallet
            wallet_repo = WalletRepository()
            wallet = wallet_repo.find_by_user_id(current_user.id)
            
            if not wallet:
                response, status = format_error(
                    error="wallet_not_found",
                    message="Wallet not found. Please complete identity verification first.",
                    status_code=404,
                )
                return response, status
            
            # Check balance
            balance = Decimal(wallet.balance)
            if balance < amount:
                response, status = format_error(
                    error="insufficient_balance",
                    message=f"Insufficient balance. Available: ₦{balance:,.2f}",
                    status_code=400,
                    data={"available_balance": str(balance)},
                )
                return response, status
            
            # Calculate fee (2% or minimum ₦50)
            fee = max(amount * Decimal('0.02'), Decimal('50.00'))
            net_amount = amount - fee
            
            try:
                # Debit wallet balance first (prevents double-spend)
                updated_wallet = wallet_repo.decrement_balance(wallet.id, amount)
                if not updated_wallet:
                    db.session.rollback()
                    response, status = format_error(
                        error="insufficient_balance",
                        message="Insufficient balance or wallet not found",
                        status_code=400,
                    )
                    return response, status
                
                # Create transaction record
                txn_repo = WalletTransactionRepository()
                reference = f"WTH-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{wallet.id:06d}"
                
                transaction = txn_repo.create({
                    'wallet_id': wallet.id,
                    # NOTE: DB constraint expects business types (deposit/withdrawal/transfer/payment),
                    # not accounting directions (credit/debit).
                    'type': 'withdrawal',
                    'amount': amount,
                    'fee': fee,
                    'net_amount': net_amount,
                    'description': f'Withdrawal to {account_number} ({bank_code})',
                    'reference': reference,
                    # Must match wallet_transactions_status_check
                    'status': 'pending',
                    'transaction_type': 'withdrawal',
                    'destination_account_number': account_number,
                    'destination_account_name': account_name
                })
                
                logger.info(
                    f"Withdrawal initiated for user {current_user.id}: ₦{amount} to {bank_code}/{account_number}. "
                    f"New balance: ₦{updated_wallet.balance}"
                )

                # Best-effort: notify the user + audit. Failures here must
                # not roll back the withdrawal.
                try:
                    from modules.notifications.services.notification_service import NotificationService
                    from modules.audit.services.audit_service import AuditService
                    NotificationService().create_for_user(
                        user_id=current_user.id,
                        title="Withdrawal initiated",
                        body=(
                            f"₦{amount:,.2f} is on its way to {account_name or account_number}. "
                            f"Funds typically arrive within 24 hours."
                        ),
                        category='money',
                        source='Wallet',
                        amount_value=f"{amount:,.2f}",
                        amount_direction='out',
                        action_href='/dashboard/activity',
                    )
                    AuditService().record(
                        user_id=current_user.id,
                        action='Withdrawal initiated',
                        details=(
                            f"Withdrew ₦{amount:,.2f} to {account_number} "
                            f"({bank_code}); fee ₦{fee:,.2f}"
                        ),
                        category='money',
                        severity='info',
                        actor='You',
                        target=account_name or account_number,
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning('post-withdraw notify/audit failed: %s', exc)

            except Exception as e:
                db.session.rollback()
                logger.error(f"Withdrawal transaction failed: {str(e)}", exc_info=True)
                raise
            
            response, status = format_data(
                data={
                    'transaction_id': transaction.id,
                    'reference': f"WTH-{transaction.created_at.strftime('%Y%m%d')}-{transaction.id:06d}",
                    'amount': str(amount),
                    'fee': str(fee),
                    'net_amount': str(net_amount),
                    'status': 'pending',
                    'destination_bank': bank_code,
                    'destination_account': account_number,
                },
                message='Withdrawal initiated. Funds will be sent within 24 hours.',
                status_code=200,
            )
            return response, status
            
        except Exception as e:
            logger.error(f"Withdrawal error for user {current_user.id}: {str(e)}", exc_info=True)
            response, status = format_internal_error("An error occurred while processing withdrawal")
            return response, status


@wallet_blp.route('/pin/set')
class WalletPinSetResource(MethodView):
    """Set transaction PIN (one-time)."""

    @token_required
    @wallet_blp.arguments(SetTransactionPinSchema)
    def post(self, data, current_user=None):
        from modules.wallet.services.pin_service import TransactionPinService

        try:
            TransactionPinService().set_pin(user_id=current_user.id, pin=data["pin"], overwrite=False)
            response, status = format_data(data={}, message="PIN set successfully", status_code=200)
            return response, status
        except ValueError as e:
            response, status = format_error(error="pin_set_failed", message=str(e), status_code=400)
            return response, status
        except Exception:
            logger.error("Error setting transaction PIN", exc_info=True)
            response, status = format_internal_error("An error occurred")
            return response, status


@wallet_blp.route('/pin/change')
class WalletPinChangeResource(MethodView):
    """Change transaction PIN (requires old PIN)."""

    @token_required
    @wallet_blp.arguments(ChangeTransactionPinSchema)
    def post(self, data, current_user=None):
        from modules.wallet.services.pin_service import TransactionPinService

        try:
            TransactionPinService().change_pin(
                user_id=current_user.id,
                old_pin=data["old_pin"],
                new_pin=data["new_pin"],
            )
            response, status = format_data(data={}, message="PIN changed successfully", status_code=200)
            return response, status
        except ValueError as e:
            response, status = format_error(error="pin_change_failed", message=str(e), status_code=400)
            return response, status
        except Exception:
            logger.error("Error changing transaction PIN", exc_info=True)
            response, status = format_internal_error("An error occurred")
            return response, status


@wallet_blp.route('/pin/reset/request')
class WalletPinResetRequestResource(MethodView):
    """Request an OTP to reset transaction PIN."""

    @token_required
    def post(self, current_user=None):
        from modules.auth_v2.services.otp_service import OTPService
        from modules.auth_v2.services.email_service import EmailService
        from datetime import datetime

        try:
            otp = OTPService.create_otp(current_user.email, otp_type="wallet_pin_reset", expiry_minutes=10)
            # Reuse login OTP template for now to avoid introducing new templates.
            EmailService().send_login_otp(
                to_email=current_user.email,
                firstname=current_user.firstname or "User",
                otp=otp,
                timestamp=datetime.utcnow().isoformat(),
                location="Wallet PIN reset",
                device="CCP Wallet",
            )
            response, status = format_data(data={}, message="OTP sent to your email", status_code=200)
            return response, status
        except Exception as e:
            logger.error(f"Error requesting PIN reset OTP: {e}", exc_info=True)
            response, status = format_internal_error("Could not send OTP")
            return response, status


@wallet_blp.route('/pin/reset/confirm')
class WalletPinResetConfirmResource(MethodView):
    """Reset transaction PIN using email OTP."""

    @token_required
    @wallet_blp.arguments(ResetTransactionPinSchema)
    def post(self, data, current_user=None):
        from modules.auth_v2.services.otp_service import OTPService
        from modules.wallet.services.pin_service import TransactionPinService

        ok, msg = OTPService.verify_otp(current_user.email, data["otp"], otp_type="wallet_pin_reset")
        if not ok:
            response, status = format_error(error="invalid_otp", message=msg, status_code=400)
            return response, status

        try:
            TransactionPinService().set_pin(user_id=current_user.id, pin=data["new_pin"], overwrite=True)
            response, status = format_data(data={}, message="PIN reset successfully", status_code=200)
            return response, status
        except ValueError as e:
            response, status = format_error(error="pin_reset_failed", message=str(e), status_code=400)
            return response, status
        except Exception:
            logger.error("Error resetting transaction PIN", exc_info=True)
            response, status = format_internal_error("An error occurred")
            return response, status
