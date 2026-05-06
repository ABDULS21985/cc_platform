"""
Webhook Resource - Flask-Smorest MethodView endpoint
POST /api/v2/wallet/webhook - Receive payment provider callbacks (Bell MFB + SafeHaven)
"""
from flask.views import MethodView
from flask_smorest import Blueprint
from flask import request
import logging
from datetime import datetime
from decimal import Decimal
import json

from modules.wallet.services.bell_mfb_service import BellMFBService
from modules.wallet.providers.safehaven_provider import SafeHavenProvider
from modules.wallet.repositories.wallet_repository import WalletRepository
from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
from modules.auth_v2.extensions import db
from modules.wallet.schemas.wallet_schema import WebhookPayloadSchema
from modules.core.response_formatter import format_data, format_error, format_internal_error

logger = logging.getLogger(__name__)

webhook_blp = Blueprint(
    'wallet_webhook',
    __name__,
    url_prefix='/api/v2/wallet',
    description='Wallet webhook endpoints'
)


@webhook_blp.route('/webhook')
class WebhookResource(MethodView):
    """Payment provider webhook endpoint for transaction notifications"""
    
    @webhook_blp.arguments(WebhookPayloadSchema)
    def post(self, data):
        """
        Handle webhook notifications (Bell MFB + SafeHaven)
        
        This endpoint is called by providers, not by clients.
        
        Security:
        - Bell MFB: verifies webhook signature using HMAC-SHA256
        - SafeHaven: validates payload shape; production should IP-allowlist SafeHaven at the edge
        - Checks for duplicate processing using reference
        - Uses database transaction for atomicity
        """
        try:
            # Get raw request data for signature verification
            raw_body = request.get_data(as_text=True)
            
            # Provider signatures (names vary by provider/deployment)
            # Bell MFB commonly uses X-Signature / X-Bell-Signature.
            # SafeHaven may also send signature-like headers; we must not mis-route based on header name alone.
            signature = request.headers.get('X-Signature') or request.headers.get('X-Bell-Signature')
            bell_signature = request.headers.get('X-Bell-Signature')  # strongest signal it's Bell
            safehaven_signature = (
                request.headers.get('X-SafeHaven-Signature')
                or request.headers.get('X-Safehaven-Signature')
                or request.headers.get('X-SafeHaven-Webhook-Secret')
                or request.headers.get('X-Webhook-Secret')
                or request.headers.get('X-Signature')
            )

            # Best-effort JSON parse:
            # - Providers should send Content-Type: application/json, but some don't.
            # - Use silent=True to avoid raising 415 and fallback to raw body parsing.
            # `data` is parsed by Flask-Smorest, but keep raw fallback for providers
            # that omit Content-Type or send invalid JSON.
            if (not data) and raw_body:
                try:
                    data = json.loads(raw_body)
                except Exception:
                    data = None
            
            if not data:
                response, status = format_error(
                    error="invalid_payload",
                    message="Request body must be valid JSON",
                    status_code=415,
                )
                return response, status
            
            # Decide provider by payload shape (not only signature header).
            # SafeHaven callbacks (observed/expected) usually include: sessionId, status, amount, accountNumber.
            # Bell MFB callbacks usually include: virtualAccount, reference, event, amountReceived.
            looks_like_safehaven = (
                (data.get("sessionId") or data.get("session_id")) is not None
                and (data.get("status") is not None)
                and (data.get("amount") is not None or data.get("amountReceived") is not None)
                and (
                    data.get("accountNumber")
                    or data.get("virtualAccountNumber")
                    or data.get("virtualAccount")
                )
                and (data.get("event") is None)  # Bell frequently sets event; SafeHaven typically doesn't
            )
            looks_like_bell = (
                (bell_signature is not None)
                or (data.get("event") is not None)
                or (data.get("virtualAccount") is not None)
            )

            if looks_like_safehaven and not looks_like_bell:
                if not SafeHavenProvider().verify_webhook_signature(raw_body, safehaven_signature):
                    response, status = format_error(
                        error="invalid_signature",
                        message="SafeHaven webhook signature verification failed",
                        status_code=401,
                    )
                    return response, status
                return self._handle_safehaven_callback(data)

            # If we can't confidently identify Bell, prefer SafeHaven handler (it will validate fields and fail safely).
            if not looks_like_bell:
                if not SafeHavenProvider().verify_webhook_signature(raw_body, safehaven_signature):
                    response, status = format_error(
                        error="invalid_signature",
                        message="SafeHaven webhook signature verification failed",
                        status_code=401,
                    )
                    return response, status
                return self._handle_safehaven_callback(data)
            
            # Verify signature
            bell_mfb = BellMFBService()
            if not bell_mfb.verify_webhook_signature(raw_body, signature):
                logger.warning(f"Invalid webhook signature: {signature[:20]}...")
                # If the payload looks like SafeHaven, attempt SafeHaven processing instead of rejecting.
                # This prevents SafeHaven callbacks that include X-Signature from being mis-routed.
                if looks_like_safehaven:
                    logger.info("Signature invalid for Bell; attempting SafeHaven callback handling")
                    if not SafeHavenProvider().verify_webhook_signature(raw_body, safehaven_signature):
                        response, status = format_error(
                            error="invalid_signature",
                            message="SafeHaven webhook signature verification failed",
                            status_code=401,
                        )
                        return response, status
                    return self._handle_safehaven_callback(data)

                response, status = format_error(
                    error="invalid_signature",
                    message="Webhook signature verification failed",
                    status_code=401,
                )
                return response, status
            
            # Extract required fields
            # Bell MFB uses 'virtualAccount' for account number, 'amountReceived' for amount
            bell_reference = data.get('reference')
            session_id = data.get('sessionId')
            # Support both field names for compatibility
            account_number = data.get('virtualAccount') or data.get('accountNumber')
            amount = data.get('amountReceived') or data.get('amount')
            event_type = data.get('event', 'collection')  # 'collection' for deposits
            status = data.get('status', 'successful').lower()
            
            # Validate required fields
            if not all([bell_reference, account_number, amount]):
                logger.warning(f"Webhook missing required fields: {data}")
                response, status = format_error(
                    error="missing_fields",
                    message="Required fields: reference, virtualAccount/accountNumber, amountReceived/amount",
                    status_code=400,
                )
                return response, status
            
            logger.info(f"Processing webhook for account {account_number}, reference {bell_reference}")
            
            # Check for duplicate (idempotency)
            transaction_repo = WalletTransactionRepository()
            existing = transaction_repo.find_by_bell_mfb_reference(bell_reference)
            
            if existing:
                logger.info(f"Duplicate webhook ignored: {bell_reference}")
                response, status = format_data(
                    data={"duplicate": True},
                    message="Webhook already processed",
                    status_code=200,
                )
                return response, status
            
            # Find wallet by account number
            wallet_repo = WalletRepository()
            wallet = wallet_repo.find_by_account_number(account_number)
            
            if not wallet:
                logger.error(f"Wallet not found for account {account_number}")
                response, status = format_error(
                    error="wallet_not_found",
                    message=f"Wallet not found for account {account_number}",
                    status_code=404,
                )
                return response, status
            
            # Parse amounts (Bell MFB uses 'transactionFee' and 'netAmount')
            try:
                amount_decimal = Decimal(str(amount))
                # Support both field names for compatibility
                fee_decimal = Decimal(str(data.get('transactionFee') or data.get('fee') or '0.00'))
                stamp_duty_decimal = Decimal(str(data.get('stampDuty', '0.00')))
                net_amount_decimal = Decimal(str(data.get('netAmount', amount)))
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid amount in webhook: {e}")
                response, status = format_error(
                    error="invalid_amount",
                    message="Invalid amount format",
                    status_code=400,
                )
                return response, status
            
            # Use database transaction for atomicity
            try:
                # Import for ULID reference generation
                from modules.wallet.models.wallet_transaction import WalletTransaction as TxnModel
                
                # Generate ULID-based internal reference
                direction = 'credit' if event_type == 'collection' else 'debit'
                internal_ref = TxnModel.generate_reference('WBH')  # WBH = Webhook
                
                # Calculate signed amount
                signed_amount = TxnModel.compute_signed_amount(net_amount_decimal, direction)
                
                # Capture balance before
                balance_before = wallet.balance
                
                # Create transaction record
                transaction = transaction_repo.create({
                    'wallet_id': wallet.id,
                    'reference': internal_ref,
                    'bell_mfb_reference': bell_reference,
                    'bell_mfb_session_id': session_id,
                    'type': direction,
                    'amount': amount_decimal,
                    'signed_amount': signed_amount,
                    'fee': fee_decimal,
                    'stamp_duty': stamp_duty_decimal,
                    'net_amount': net_amount_decimal,
                    'balance_before': balance_before,
                    'balance_after': balance_before + signed_amount if status == 'successful' else None,
                    'description': data.get('remarks') or data.get('narration') or 'Wallet funding',
                    'source_account_number': data.get('sourceAccountNumber'),
                    'source_account_name': data.get('sourceAccountName'),
                    'source_bank_code': data.get('sourceBankCode'),
                    'source_bank_name': data.get('sourceBankName'),
                    'destination_account_number': data.get('destinationAccountNumber'),
                    'destination_account_name': data.get('destinationAccountName'),
                    'status': 'successful' if status == 'successful' else 'pending',
                    'webhook_received_at': datetime.utcnow(),
                    'completed_at': datetime.utcnow() if status == 'successful' else None,
                    'meta': {
                        'webhook_event_type': event_type,
                        'source': 'bell_mfb_webhook'
                    }
                })
                
                # Update wallet balance (only for successful collections/credits)
                if status == 'successful' and event_type == 'collection':
                    new_balance = wallet.balance + net_amount_decimal
                    wallet_repo.update_balance(wallet.id, new_balance)
                    logger.info(
                        f"Wallet {wallet.id} balance updated: "
                        f"{wallet.balance} -> {new_balance}"
                    )
                
                db.session.commit()
                
                logger.info(
                    f"Webhook processed successfully. "
                    f"Transaction {transaction.id} created for wallet {wallet.id}"
                )
                
                # Send notification asynchronously
                try:
                    from modules.tasks.notification_tasks import send_transaction_notification
                    send_transaction_notification.delay(
                        user_id=wallet.user_id,
                        transaction_id=transaction.id
                    )
                except Exception as notify_err:
                    logger.warning(f"Failed to queue notification: {notify_err}")
                
                response, status = format_data(
                    data={'transaction_id': transaction.id, 'reference': internal_ref},
                    message="Webhook processed successfully",
                    status_code=200,
                )
                return response, status
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Database error processing webhook: {str(e)}", exc_info=True)
                raise
            
        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}", exc_info=True)
            response, status = format_internal_error('An error occurred while processing webhook')
            return response, status

    def _handle_safehaven_callback(self, data: dict):
        """
        Process SafeHaven callback for a deposit into a SafeHaven virtual account.

        We match the incoming callback to the most recent pending deposit for the wallet+amount.
        """
        try:
            session_id = data.get("sessionId") or data.get("session_id")
            status = (data.get("status") or "").lower()
            amount_raw = data.get("amount") or data.get("amountReceived")
            account_number = (
                data.get("accountNumber")
                or data.get("virtualAccountNumber")
                or data.get("virtualAccount")
            )
            provider_reference = data.get("transactionRef") or data.get("reference")

            if not session_id or amount_raw is None or not status:
                response, code = format_error(
                    error="missing_fields",
                    message="Required fields: sessionId, amount, status",
                    status_code=400,
                )
                return response, code

            try:
                amount = Decimal(str(amount_raw))
            except Exception:
                response, code = format_error(error="invalid_amount", message="Invalid amount", status_code=400)
                return response, code

            transaction_repo = WalletTransactionRepository()
            if transaction_repo.exists_processed_safehaven_event(session_id, provider_reference):
                response, code = format_data(data={"duplicate": True}, message="Already processed", status_code=200)
                return response, code

            if not account_number:
                response, code = format_error(
                    error="missing_fields",
                    message="accountNumber is required",
                    status_code=400,
                )
                return response, code

            wallet_repo = WalletRepository()
            wallet = wallet_repo.find_by_account_number(str(account_number))
            if not wallet:
                response, code = format_error(
                    error="wallet_not_found",
                    message=f"Wallet not found for account {account_number}",
                    status_code=404,
                )
                return response, code

            pending = transaction_repo.find_latest_pending_deposit(wallet.id, amount)
            if not pending:
                # Some SafeHaven deployments report amounts in kobo/minor units.
                # If we can't find a pending tx in NGN, try converting kobo -> NGN.
                try:
                    if amount >= Decimal("100") and (amount % Decimal("100") == 0):
                        amount_ngn = (amount / Decimal("100")).quantize(Decimal("0.01"))
                        pending = transaction_repo.find_latest_pending_deposit(wallet.id, amount_ngn)
                        if pending:
                            amount = amount_ngn
                except Exception:
                    pass
            if not pending:
                response, code = format_error(
                    error="transaction_not_found",
                    message="No matching pending deposit found for wallet+amount",
                    status_code=404,
                )
                return response, code

            if status in ("successful", "success", "completed"):
                balance_before = wallet.balance
                new_balance = wallet.balance + pending.net_amount

                pending.status = "successful"
                pending.webhook_received_at = datetime.utcnow()
                pending.completed_at = datetime.utcnow()
                pending.balance_before = balance_before
                pending.balance_after = new_balance
                pending.meta = {
                    **(pending.meta or {}),
                    "safehaven_session_id": str(session_id),
                    "safehaven_reference": str(provider_reference) if provider_reference else None,
                    "source": "safehaven_callback",
                }

                # Avoid querying/committing inside the repository here.
                # A query would trigger an autoflush of `pending` before we commit, and can surface
                # constraint errors in confusing places.
                wallet.balance = new_balance
                db.session.commit()
                response, code = format_data(
                    data={"transaction_id": pending.id, "reference": pending.reference},
                    message="SafeHaven callback processed",
                    status_code=200,
                )
                return response, code

            if status in ("failed", "failure"):
                pending.status = "failed"
                pending.webhook_received_at = datetime.utcnow()
                pending.meta = {
                    **(pending.meta or {}),
                    "safehaven_session_id": str(session_id),
                    "safehaven_reference": str(provider_reference) if provider_reference else None,
                    "source": "safehaven_callback",
                }
                db.session.commit()
                response, code = format_data(data={}, message="Failure recorded", status_code=200)
                return response, code

            response, code = format_error(error="invalid_status", message=f"Unknown status: {status}", status_code=400)
            return response, code

        except Exception as e:
            db.session.rollback()
            logger.error(f"SafeHaven callback processing error: {e}", exc_info=True)
            response, code = format_internal_error("An error occurred while processing SafeHaven callback")
            return response, code
