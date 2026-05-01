"""
Abstract payment provider contract for wallet flows (personal vs community).
Encapsulates provider-specific API calls behind a single interface.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, Optional

from modules.wallet.providers.payment_providers import (
    PaymentProviderContext,
    PaymentProviderType,
)


@dataclass
class VirtualAccountRequest:
    """Input required to provision or fetch a virtual account."""
    user_id: int
    wallet_id: int
    first_name: str
    last_name: str
    phone_number: str
    bvn: str
    date_of_birth: str
    gender: str = "unspecified"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VirtualAccountResponse:
    """Standardized virtual account details from a provider."""
    account_number: str
    account_name: str
    bank_name: Optional[str] = None
    provider_client_id: Optional[str] = None
    provider_reference: Optional[str] = None


@dataclass
class TransferRequest:
    """Input required to initiate an outbound bank transfer."""
    source_account_number: str        # Community wallet account number at the provider
    recipient_account: str            # Destination bank account number
    recipient_bank_code: str          # NIBSS bank code of destination bank
    recipient_name: str               # Beneficiary name (for narration / name enquiry)
    amount: Decimal                   # Amount in NGN (kobo-free)
    narration: str                    # Transfer description
    reference: str                    # Unique client-generated reference


@dataclass
class TransferResponse:
    """Standardised result of an outbound transfer attempt."""
    reference: str
    provider_reference: Optional[str] = None   # Provider's own transaction ID
    status: str = "pending"                    # pending | successful | failed
    message: Optional[str] = None


class PaymentProvider(ABC):
    """Interface all payment providers must implement."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""

    @property
    @abstractmethod
    def provider_type(self) -> PaymentProviderType:
        """Enum representing the provider implementation."""

    @property
    @abstractmethod
    def context(self) -> PaymentProviderContext:
        """Which flow this provider supports (personal/community)."""

    @abstractmethod
    def ensure_virtual_account(self, request: VirtualAccountRequest) -> VirtualAccountResponse:
        """Provision or fetch a virtual account for deposits."""

    @abstractmethod
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Validate webhook authenticity (if provider supports webhooks)."""

    @abstractmethod
    def get_transaction_details(self, reference: str) -> Dict[str, Any]:
        """Fetch transaction details from provider for reconciliation."""

    @abstractmethod
    def transfer_to_account(self, request: "TransferRequest") -> "TransferResponse":
        """Initiate an outbound NIP transfer to an external bank account."""
