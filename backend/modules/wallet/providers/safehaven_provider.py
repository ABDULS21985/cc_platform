"""
SafeHaven payment provider implementation.
Handles one-time virtual account creation for community deposits.
"""
import logging
import os
import random
import requests
import hmac
import hashlib
import time
import jwt
from typing import Any, Dict

from modules.wallet.providers.base_payment_provider import (
    PaymentProvider,
    TransferRequest,
    TransferResponse,
    VirtualAccountRequest,
    VirtualAccountResponse,
)
from modules.wallet.providers.payment_providers import (
    PaymentProviderContext,
    PaymentProviderType,
)
from modules.wallet.token_management.services import SafeHavenAuthService

logger = logging.getLogger(__name__)


class SafeHavenProvider(PaymentProvider):
    """SafeHaven implementation for community wallet deposits (one-time virtual accounts)."""

    def __init__(self) -> None:
        # Support both SAFEHAVEN_* and legacy/mistyped SAFEHEAVEN_* env var prefixes.
        def _env(*names: str, default: str = None) -> str:
            for name in names:
                value = os.getenv(name)
                if value is not None and str(value).strip() != "":
                    return value
            return default

        self.base_url = _env("SAFEHAVEN_BASE_URL", "SAFEHEAVEN_BASE_URL")
        # SafeHaven docs for `/accounts` refer to `ClientID` as `ibs_client_id` returned when generating an API token.
        # In many setups this is NOT the same as dashboard "client id".
        # Allow explicitly setting it, otherwise we attempt to derive it from the access token payload at runtime.
        self.ibs_client_id = _env("SAFEHAVEN_IBS_CLIENT_ID", "SAFEHEAVEN_IBS_CLIENT_ID")
        self.client_id = _env("SAFEHAVEN_CLIENT_ID", "SAFEHEAVEN_CLIENT_ID")
        self.settlement_account = _env(
            "SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER",
            "SAFEHEAVEN_SETTLEMENT_ACCOUNT_NUMBER",
        )
        self.settlement_bank_code = _env(
            "SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE",
            "SAFEHEAVEN_SETTLEMENT_ACCOUNT_BANK_CODE",
        )
        
        if not all([self.base_url, self.settlement_account, self.settlement_bank_code]):
            raise ValueError(
                "Missing SafeHaven config. Required: "
                "SAFEHAVEN_BASE_URL, SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER, SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE. "
                "Also set SAFEHAVEN_IBS_CLIENT_ID if required by your SafeHaven account."
            )
        
        self.auth_service = SafeHavenAuthService()

    @property
    def name(self) -> str:
        return "SafeHaven MFB"

    @property
    def provider_type(self) -> PaymentProviderType:
        return PaymentProviderType.SAFEHAVEN

    @property
    def context(self) -> PaymentProviderContext:
        return PaymentProviderContext.COMMUNITY

    def ensure_virtual_account(self, request: VirtualAccountRequest) -> VirtualAccountResponse:
        """
        Create a time-bound virtual account for deposits.

        SafeHaven's virtual account creation is handled via `POST /accounts`
        (time-based virtual accounts). The older `/identity` endpoint is for
        identity verification, not account creation.
        """
        token = self.auth_service.get_valid_token()

        # Client header: match the known-working integration behavior.
        # Use SAFEHAVEN_CLIENT_ID (your configured client id) unless you explicitly provide SAFEHAVEN_IBS_CLIENT_ID.
        # We intentionally DO NOT derive/override from token claims because those can represent other ids
        # and we've observed SafeHaven returning generic 400s when the wrong id is used.
        client_id_for_requests = self.ibs_client_id or self.client_id
        
        raw_amount = None
        if isinstance(request.metadata, dict):
            raw_amount = request.metadata.get("amount")

        amount_ngn_int = 0
        try:
            if raw_amount is not None and str(raw_amount).strip() != "":
                amount_ngn_int = int(float(raw_amount))
        except Exception:
            amount_ngn_int = 0

        callback_url = os.getenv("SAFEHAVEN_CALLBACK_URL") or os.getenv("SAFEHEAVEN_CALLBACK_URL")
        if not callback_url or not str(callback_url).lower().startswith("https://"):
            raise ValueError(
                "SafeHaven requires an HTTPS callback URL for virtual account webhooks. "
                "Set SAFEHAVEN_CALLBACK_URL (or SAFEHEAVEN_CALLBACK_URL) to an https:// URL."
            )

        valid_for_seconds = int(os.getenv("SAFEHAVEN_ACCOUNT_VALID_FOR", "900"))
        # SafeHaven docs for Create Virtual Account define amountControl as an enum:
        # Allowed: Fixed, UnderPayment, OverPayment.
        raw_amount_control = (os.getenv("SAFEHAVEN_AMOUNT_CONTROL", "") or "").strip()
        normalized = raw_amount_control.lower()
        if normalized in ("fixed",):
            amount_control = "Fixed"
        elif normalized in ("underpayment", "under_payment"):
            amount_control = "UnderPayment"
        elif normalized in ("overpayment", "over_payment", ""):
            amount_control = "OverPayment"
        else:
            # Fall back to a safe default rather than sending an invalid enum.
            amount_control = "OverPayment"

        # SafeHaven requires externalReference to be unique per virtual account.
        # Retrying the same reference can produce a 400 Bad Request.
        external_reference_base = f"DEP-{request.wallet_id}-{request.user_id}-{int(time.time())}"

        def _build_payload(*, amount: int, include_settlement: bool, suffix: str) -> Dict[str, Any]:
            payload: Dict[str, Any] = {
                "validFor": valid_for_seconds,
                "callbackUrl": callback_url,
                "amountControl": amount_control,
                "amount": amount,
                "externalReference": f"{external_reference_base}{suffix}",
                # Some SafeHaven endpoints require ClientID as a field as well.
                "ClientID": client_id_for_requests,
            }
            if include_settlement:
                payload["settlementAccount"] = {
                    "bankCode": self.settlement_bank_code,
                    "accountNumber": self.settlement_account,
                }
            return payload

        # Attempt strategy:
        # - attempt_1: amount in NGN (major units) + settlementAccount
        # - attempt_2: amount in kobo (minor units) + settlementAccount
        # Note: SafeHaven docs indicate settlementAccount is required when validFor is used.
        attempts = [
            ("ngn_with_settlement", _build_payload(amount=amount_ngn_int, include_settlement=True, suffix="")),
            ("kobo_with_settlement", _build_payload(amount=amount_ngn_int * 100, include_settlement=True, suffix="-K")),
        ]
        
        logger.info(
            "Creating SafeHaven virtual account",
            extra={"user_id": request.user_id, "wallet_id": request.wallet_id},
        )
        
        try:
            # SafeHaven docs: Create Virtual Account endpoint.
            # See: https://safehavenmfb.readme.io/reference/create-virtual-account
            endpoint = f"{self.base_url}/virtual-accounts"

            def _do_request(access_token: str, payload: Dict[str, Any]):
                return requests.post(
                    endpoint,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        # Match typical SafeHaven integrations: `clientID` header (lowercase).
                        "clientID": client_id_for_requests,
                        "Content-Type": "application/json",
                    },
                    timeout=30,
                )

            last_error: Exception | None = None
            last_details: str | None = None

            # Jittered exponential backoff between retry attempts. The first
            # attempt fires immediately; each subsequent attempt sleeps
            # base_delay seconds (+/- 50ms jitter) to avoid hammering the
            # provider on transient errors. Sequence: 0.25s, 0.5s, 1.0s
            # (capped at 1.0s).
            backoff_schedule = [0.25, 0.5, 1.0]

            for attempt_index, (attempt_name, payload) in enumerate(attempts):
                if attempt_index > 0:
                    base_delay = backoff_schedule[
                        min(attempt_index - 1, len(backoff_schedule) - 1)
                    ]
                    jitter = random.uniform(-0.05, 0.05)
                    sleep_seconds = max(0.0, base_delay + jitter)
                    logger.info(
                        "SafeHaven retrying with backoff",
                        extra={
                            "attempt": attempt_name,
                            "attempt_index": attempt_index + 1,
                            "sleep_seconds": round(sleep_seconds, 4),
                        },
                    )
                    time.sleep(sleep_seconds)

                logger.info(
                    "SafeHaven /virtual-accounts request payload",
                    extra={
                        "attempt": attempt_name,
                        "attempt_index": attempt_index + 1,
                        "validFor": payload.get("validFor"),
                        "callbackUrl": payload.get("callbackUrl"),
                        "amountControl": payload.get("amountControl"),
                        "amount": payload.get("amount"),
                        "externalReference": payload.get("externalReference"),
                        "settlementAccount": payload.get("settlementAccount"),
                    },
                )

                response = _do_request(token, payload)

                try:
                    data = response.json()
                except Exception:
                    data = {"success": False, "raw": (response.text or "")[:1000]}

                # If token is expired/invalid, force a fresh auth and retry once for this attempt.
                if response.status_code in (401, 403):
                    msg = data.get("message") if isinstance(data, dict) else None
                    if msg and "expired token" in str(msg).lower():
                        logger.warning(
                            "SafeHaven token rejected; forcing re-auth and retrying once",
                            extra={"attempt": attempt_name},
                        )
                        fresh_token = self.auth_service._perform_full_auth()
                        response = _do_request(fresh_token, payload)
                        try:
                            data = response.json()
                        except Exception:
                            data = {"success": False, "raw": (response.text or "")[:1000]}

                if response.status_code >= 400:
                    logger.error(
                        "SafeHaven virtual account creation HTTP error",
                        extra={
                            "attempt": attempt_name,
                            "status_code": response.status_code,
                            "response": data if isinstance(data, dict) else str(data)[:1000],
                            "response_text": (response.text or "")[:2000],
                            "response_headers": {
                                "request-id": response.headers.get("request-id") or response.headers.get("x-request-id"),
                                "trace-id": response.headers.get("trace-id") or response.headers.get("x-trace-id"),
                                "cf-ray": response.headers.get("cf-ray"),
                            },
                            "request_headers": {"clientID": client_id_for_requests},
                            "request_payload": {
                                "validFor": payload.get("validFor"),
                                "callbackUrl": payload.get("callbackUrl"),
                                "settlementAccount": payload.get("settlementAccount"),
                                "amountControl": payload.get("amountControl"),
                                "amount": payload.get("amount"),
                                "externalReference": payload.get("externalReference"),
                            },
                        },
                    )
                    if isinstance(data, dict):
                        provider_msg = data.get("message") or data.get("error") or "Bad Request"
                        last_details = (
                            f"attempt={attempt_name}. "
                            f"{provider_msg}. "
                            f"response={data}. "
                            f"raw={(response.text or '')[:2000]}. "
                            f"sent_headers={{'clientID': '{client_id_for_requests}'}}. "
                            f"sent_payload={{"
                            f"'validFor': {payload.get('validFor')}, "
                            f"'callbackUrl': '{payload.get('callbackUrl')}', "
                            f"'settlementAccount': {payload.get('settlementAccount')}, "
                            f"'amountControl': '{payload.get('amountControl')}', "
                            f"'amount': {payload.get('amount')}, "
                            f"'externalReference': '{payload.get('externalReference')}'"
                            f"}}"
                        )
                    else:
                        last_details = f"attempt={attempt_name}. response={str(data)[:1000]}"

                    # If it's a generic 400, try the next attempt variant.
                    if response.status_code == 400:
                        last_error = Exception(last_details)
                        continue
                    raise Exception(f"SafeHaven HTTP {response.status_code}: {last_details}")

                # SafeHaven responses are not consistent across deployments.
                # Some return: {"success": true, "data": {...}}
                # Others return: {"statusCode": 200, "message": "...", "data": {...}}
                success_flag = data.get("success") if isinstance(data, dict) else None
                status_code_field = data.get("statusCode") if isinstance(data, dict) else None
                message_field = data.get("message") if isinstance(data, dict) else None

                is_success = False
                if success_flag is True:
                    is_success = True
                elif isinstance(status_code_field, int) and status_code_field == 200:
                    is_success = True
                elif isinstance(message_field, str) and "virtual account created" in message_field.lower():
                    is_success = True

                if not is_success:
                    error_msg = message_field or "Unknown error"
                    last_details = f"attempt={attempt_name}. SafeHaven API error: {error_msg}. response={data}"
                    last_error = Exception(last_details)
                    continue

                result = data.get("data", {})
                account_number = (
                    result.get("accountNumber")
                    or result.get("virtualAccountNumber")
                    or result.get("account_number")
                )
                account_name = (
                    result.get("accountName")
                    or result.get("account_name")
                    or f"{request.first_name} {request.last_name}"
                )

                if not account_number:
                    last_error = ValueError("SafeHaven did not return account details")
                    continue

                logger.info(
                    "SafeHaven virtual account created",
                    extra={
                        "attempt": attempt_name,
                        "attempt_index": attempt_index + 1,
                        "payload_variant": attempt_name,
                    },
                )
                return VirtualAccountResponse(
                    account_number=str(account_number),
                    account_name=str(account_name),
                    bank_name="SafeHaven MFB",
                    provider_client_id=str(result.get("client") or result.get("clientId") or "") or None,
                    provider_reference=str(result.get("externalReference") or result.get("reference") or "") or None,
                )

            # All attempts failed.
            raise Exception(f"SafeHaven HTTP 400: {last_details}") from last_error
            
        except requests.RequestException as e:
            logger.error(f"SafeHaven API error during virtual account creation: {e}", exc_info=True)
            raise Exception(f"Failed to create SafeHaven virtual account: {e}")

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify SafeHaven webhook authenticity.
        
        SafeHaven does NOT use HMAC-SHA256 signatures like Bell MFB.
        Instead, webhook security is based on:
        1. IP whitelist (SafeHaven's fixed IP addresses only)
        2. Payload validation (required fields present and valid)
        3. Webhook ID/timestamp for idempotency
        
        This method validates the payload structure.
        For production security, configure IP whitelist in firewall/proxy.
        
        Args:
            payload: Raw request body string
            signature: Signature header (if any - logged for debugging)
            
        Returns:
            True if payload is valid SafeHaven webhook format
        """
        try:
            import json
            
            # Parse to validate JSON structure
            data = json.loads(payload)
            
            # Required fields for SafeHaven payment webhooks
            required_fields = ["sessionId", "amount", "status"]
            has_required = all(field in data for field in required_fields)
            
            if not has_required:
                missing = [f for f in required_fields if f not in data]
                logger.warning(
                    "SafeHaven webhook missing required fields",
                    extra={"missing": missing}
                )
                return False
            
            secret = os.getenv("SAFEHAVEN_WEBHOOK_SECRET") or os.getenv("SAFEHEAVEN_WEBHOOK_SECRET")
            is_production = os.getenv("ENV", "development").lower() == "production"
            if not secret:
                if is_production:
                    logger.error("SAFEHAVEN_WEBHOOK_SECRET is required in production")
                    return False
                logger.warning("SafeHaven webhook accepted without shared secret outside production")
                return True

            if not signature:
                logger.warning("SafeHaven webhook missing signature header")
                return False

            provided = signature.strip()
            expected_hex = hmac.new(
                secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            expected_values = {
                expected_hex,
                f"sha256={expected_hex}",
                secret,
            }
            if not any(hmac.compare_digest(provided, expected) for expected in expected_values):
                logger.warning("SafeHaven webhook signature verification failed")
                return False

            return True
            
        except json.JSONDecodeError as e:
            logger.error(f"SafeHaven webhook payload is not valid JSON: {e}")
            return False
        except Exception as e:
            logger.error(f"Error validating SafeHaven webhook payload: {e}", exc_info=True)
            return False

    def get_transaction_details(self, reference: str) -> Dict[str, Any]:
        """
        Query SafeHaven transaction details by reference.
        """
        token = self.auth_service.get_valid_token()
        
        logger.info(f"Querying SafeHaven transaction: {reference}")
        
        try:
            response = requests.get(
                f"{self.base_url}/transactions/{reference}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "clientID": self.client_id,
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("success"):
                logger.info(f"SafeHaven transaction details retrieved: {reference}")
                return data.get("data", {})
            else:
                error_msg = data.get("message", "Unknown error")
                logger.error(f"SafeHaven transaction query failed: {error_msg}")
                raise Exception(f"Transaction query failed: {error_msg}")
                
        except requests.RequestException as e:
            logger.error(f"SafeHaven API error during transaction query: {e}")
            raise

    def verify_payment(self, session_id: str, expected_amount: float = None) -> Dict[str, Any]:
        """
        Verify if a payment was completed via SafeHaven.
        
        Args:
            session_id: The SafeHaven session ID (virtual account identifier)
            expected_amount: Optional amount to verify against (in kobo/minor units)
            
        Returns:
            Dict with verification result:
            {
                "verified": bool,
                "status": str,  # "completed", "pending", "failed"
                "amount": float,  # Amount received in kobo
                "payment_reference": str,  # SafeHaven transaction reference
                "paid_at": str,  # ISO timestamp if completed
                "message": str  # Human-readable status message
            }
        """
        token = self.auth_service.get_valid_token()
        
        logger.info(f"Verifying SafeHaven payment for session: {session_id}")
        
        try:
            # Query payment status by session ID
            response = requests.get(
                f"{self.base_url}/identity/sessions/{session_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "clientID": self.client_id,
                    "Content-Type": "application/json"
                },
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                error_msg = data.get("message", "Unknown error")
                logger.error(f"SafeHaven payment verification failed: {error_msg}")
                return {
                    "verified": False,
                    "status": "failed",
                    "message": f"Verification failed: {error_msg}"
                }
            
            result = data.get("data", {})
            payment_status = result.get("status", "").lower()
            amount_received = float(result.get("amount", 0))
            
            # Check if payment is completed
            is_completed = payment_status in ["completed", "success", "successful"]
            
            # Verify amount if specified
            amount_matches = True
            if expected_amount is not None and is_completed:
                amount_matches = abs(amount_received - expected_amount) < 1.0  # Allow 1 kobo tolerance
                if not amount_matches:
                    logger.warning(
                        f"Amount mismatch for session {session_id}: "
                        f"expected {expected_amount}, got {amount_received}"
                    )
            
            verified = is_completed and amount_matches
            
            return {
                "verified": verified,
                "status": "completed" if is_completed else "pending" if payment_status == "pending" else "failed",
                "amount": amount_received,
                "payment_reference": result.get("transactionReference") or result.get("paymentReference"),
                "paid_at": result.get("completedAt") or result.get("paidAt"),
                "message": (
                    "Payment verified successfully" if verified
                    else f"Payment not completed (amount mismatch)" if not amount_matches
                    else f"Payment status: {payment_status}"
                ),
                "raw_data": result  # Include full response for debugging
            }
            
        except requests.RequestException as e:
            logger.error(f"SafeHaven API error during payment verification: {e}", exc_info=True)
            return {
                "verified": False,
                "status": "error",
                "message": f"API error during verification: {str(e)}"
            }

    def transfer_to_account(self, request: TransferRequest) -> TransferResponse:
        """
        Initiate an outbound NIP transfer from a SafeHaven account.

        SafeHaven transfer endpoint: POST /transfers
        """
        token = self.auth_service.get_valid_token()
        payload = {
            "nameEnquiryReference": request.reference,
            "destinationBankCode": request.recipient_bank_code,
            "destinationAccountNumber": request.recipient_account,
            "amount": int(float(request.amount) * 100),  # SafeHaven uses kobo
            "narration": request.narration,
            "clientReference": request.reference,
            "sourceAccountNumber": request.source_account_number,
        }
        logger.info(
            f"Initiating SafeHaven transfer: {request.amount} NGN "
            f"from {request.source_account_number} to {request.recipient_account} "
            f"({request.recipient_bank_code}), ref={request.reference}"
        )
        try:
            response = requests.post(
                f"{self.base_url}/transfers",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "clientID": self.client_id,
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                error_msg = data.get("message", "Unknown error")
                logger.error(f"SafeHaven transfer rejected: {error_msg}, ref={request.reference}")
                raise Exception(f"Transfer failed: {error_msg}")

            result = data.get("data", {})
            logger.info(f"SafeHaven transfer successful, ref={request.reference}")
            return TransferResponse(
                reference=request.reference,
                provider_reference=result.get("transactionReference") or result.get("reference"),
                status=result.get("status", "pending"),
                message=result.get("message"),
            )

        except requests.RequestException as e:
            logger.error(f"SafeHaven API error during transfer: {e}, ref={request.reference}", exc_info=True)
            raise Exception(f"SafeHaven transfer request failed: {e}")
