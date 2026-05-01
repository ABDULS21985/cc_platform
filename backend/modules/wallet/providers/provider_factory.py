"""
Payment provider factory for wallet flows.
Selects provider by context (personal vs community) with environment overrides.
"""
import logging
import os
from typing import Optional

from modules.wallet.providers.bell_mfb_provider import BellMFBProvider
from modules.wallet.providers.safehaven_provider import SafeHavenProvider
from modules.wallet.providers.payment_providers import (
    PaymentProviderContext,
    PaymentProviderType,
)
from modules.wallet.providers.base_payment_provider import PaymentProvider

logger = logging.getLogger(__name__)


class PaymentProviderFactory:
    """Factory to resolve the correct payment provider for a given context."""

    @staticmethod
    def get_provider(context: PaymentProviderContext) -> PaymentProvider:
        """Return a provider instance based on the supplied context."""
        if context == PaymentProviderContext.PERSONAL:
            return PaymentProviderFactory._get_personal_provider()

        if context == PaymentProviderContext.COMMUNITY:
            return PaymentProviderFactory._get_community_provider()

        raise ValueError(f"Unsupported payment context: {context}")

    @staticmethod
    def _get_personal_provider() -> PaymentProvider:
        """Personal wallets currently use Bell MFB (overrideable via env)."""
        provider_name = os.getenv(
            "PERSONAL_PAYMENT_PROVIDER", PaymentProviderType.BELL_MFB.value
        ).lower()

        if provider_name == PaymentProviderType.SAFEHAVEN.value:
            logger.info("Using SafeHaven provider for personal wallets")
            return SafeHavenProvider()

        if provider_name == PaymentProviderType.BELL_MFB.value:
            logger.info("Using Bell MFB provider for personal wallets")
            return BellMFBProvider()

        raise ValueError(
            "Unsupported personal wallet provider. Supported: bell_mfb, safehaven"
        )

    @staticmethod
    def _get_community_provider() -> PaymentProvider:
        """Community/payment-intent provider (SafeHaven default)."""
        provider_name = os.getenv(
            "COMMUNITY_PAYMENT_PROVIDER", PaymentProviderType.SAFEHAVEN.value
        ).lower()

        if provider_name == PaymentProviderType.SAFEHAVEN.value:
            logger.info("Using SafeHaven provider for community wallets")
            return SafeHavenProvider()

        if provider_name == PaymentProviderType.BELL_MFB.value:
            logger.info("Using Bell MFB provider for community wallet (fallback)")
            return BellMFBProvider()

        raise ValueError(
            "Unsupported community wallet provider. Supported: safehaven, bell_mfb"
        )
