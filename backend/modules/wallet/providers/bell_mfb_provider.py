"""
Bell MFB payment provider implementation.
Wraps BellMFBService to satisfy the PaymentProvider interface.
"""
import logging
from typing import Any, Dict, Optional

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
from modules.wallet.services.bell_mfb_service import BellMFBService

logger = logging.getLogger(__name__)


class BellMFBProvider(PaymentProvider):
    """Bell MFB implementation of the PaymentProvider contract."""

    def __init__(self) -> None:
        self._service = BellMFBService()

    @property
    def name(self) -> str:
        return "Bell MFB"

    @property
    def provider_type(self) -> PaymentProviderType:
        return PaymentProviderType.BELL_MFB

    @property
    def context(self) -> PaymentProviderContext:
        return PaymentProviderContext.PERSONAL

    def ensure_virtual_account(self, request: VirtualAccountRequest) -> VirtualAccountResponse:
        """Create or fetch a Bell MFB virtual account."""
        client_payload = {
            "firstname": request.first_name or "User",
            "lastname": request.last_name or "Account",
            "middlename": "",
            "phoneNumber": request.phone_number,
            "address": "Nigeria",
            "bvn": request.bvn,
            "gender": request.gender or "unspecified",
            "dateOfBirth": request.date_of_birth,
            "metadata": request.metadata,
        }

        logger.info(
            "Provisioning Bell MFB virtual account",
            extra={"user_id": request.user_id, "wallet_id": request.wallet_id},
        )

        result = self._service.create_individual_client(client_payload)

        account_number = result.get("accountNumber") or result.get("account_number")
        account_name = result.get("accountName") or result.get("account_name")

        if not account_number or not account_name:
            raise ValueError("Bell MFB did not return account details")

        provider_client_id = result.get("clientId") or result.get("id")
        external_reference = result.get("externalReference")

        return VirtualAccountResponse(
            account_number=str(account_number),
            account_name=str(account_name),
            bank_name="Bell MFB",
            provider_client_id=str(provider_client_id) if provider_client_id else None,
            provider_reference=str(external_reference) if external_reference else None,
        )

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        return self._service.verify_webhook_signature(payload, signature)

    def get_transaction_details(self, reference: str) -> Dict[str, Any]:
        return self._service.get_transaction_details(reference)

    def transfer_to_account(self, request: TransferRequest) -> TransferResponse:
        """Initiate an outbound NIP transfer via Bell MFB."""
        result = self._service.initiate_transfer(
            source_account=request.source_account_number,
            recipient_account=request.recipient_account,
            recipient_bank_code=request.recipient_bank_code,
            recipient_name=request.recipient_name,
            amount=float(request.amount),
            narration=request.narration,
            reference=request.reference,
        )
        return TransferResponse(
            reference=request.reference,
            provider_reference=result.get("transactionReference") or result.get("reference"),
            status=result.get("status", "pending"),
            message=result.get("message"),
        )
