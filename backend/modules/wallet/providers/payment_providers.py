"""
Shared payment provider types and contexts for wallet flows.
"""
from enum import Enum


class PaymentProviderType(str, Enum):
    """Supported payment providers."""
    BELL_MFB = "bell_mfb"
    SAFEHAVEN = "safehaven"


class PaymentProviderContext(str, Enum):
    """Wallet flow contexts to choose appropriate provider."""
    PERSONAL = "personal"  # User's own wallet (Bell MFB for now)
    COMMUNITY = "community"  # Community/payment intents (SafeHaven target)
