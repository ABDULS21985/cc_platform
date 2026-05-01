"""
Provider Factory - Get verification provider with fallback support
"""
import os
import logging
from typing import Optional
from modules.verification.providers.base_provider import VerificationProvider
from modules.verification.providers.paystack_provider import PaystackProvider
from modules.verification.providers.idcheck_provider import IDCheckProvider

logger = logging.getLogger(__name__)


class VerificationProviderFactory:
    """
    Factory to get verification provider with fallback support

    Priority Order:
    1. Mock (if USE_MOCK_PROVIDER=true - for testing)
    2. IDCheck (if IDCHECK_PUBLIC_KEY configured)
    3. Paystack (if PAYSTACK_SECRET_KEY configured)
    4. Raise error if none configured
    """

    @staticmethod
    def get_provider() -> VerificationProvider:
        """
        Get configured verification provider

        Returns:
            Configured provider instance

        Raises:
            ValueError: If no provider is configured
        """
        # Check IDCheck (Primary)
        if os.getenv('IDCHECK_PUBLIC_KEY'):
            logger.info("Using IDCheck.ng as verification provider")
            return IDCheckProvider()

        # Check Paystack as fallback
        if os.getenv('PAYSTACK_SECRET_KEY'):
            logger.info("Using Paystack Identity as verification provider")
            return PaystackProvider()

        raise ValueError(
            "No verification provider configured. "
            "Set IDCHECK_PUBLIC_KEY or PAYSTACK_SECRET_KEY in environment variables."
        )

    @staticmethod
    def verify_bvn_with_fallback(
        bvn: str,
        firstname: str,
        lastname: str,
        date_of_birth: str
    ) -> dict:
        """
        Verify BVN with all available providers (with fallback)

        Tries providers in priority order:
        1. Mock (if USE_MOCK_PROVIDER=true)
        2. IDCheck
        3. Paystack

        Args:
            bvn: Bank Verification Number
            firstname: First name
            lastname: Last name
            date_of_birth: Date of birth (YYYY-MM-DD)

        Returns:
            Verification result from first successful provider
        """
        providers_to_try = []

        # Try IDCheck (Primary)
        try:
            if os.getenv('IDCHECK_PUBLIC_KEY'):
                providers_to_try.append(('IDCheck.ng', IDCheckProvider()))
        except Exception as e:
            logger.warning(f" Failed to initialize IDCheck: {e}")

        # Try Paystack as fallback
        try:
            if os.getenv('PAYSTACK_SECRET_KEY'):
                providers_to_try.append(('Paystack', PaystackProvider()))
        except Exception as e:
            logger.warning(f" Failed to initialize Paystack: {e}")

        if not providers_to_try:
            return {
                'verified': False,
                'message': 'No verification provider available. Please contact support.',
                'provider': 'none'
            }

        # Try each provider
        for provider_name, provider in providers_to_try:
            try:
                logger.info(f"🔍 Attempting BVN verification with {provider_name}")

                result = provider.verify_bvn(
                    bvn=bvn,
                    firstname=firstname,
                    lastname=lastname,
                    date_of_birth=date_of_birth
                )

                # Normalize provider metadata so downstream task/status reporting is reliable.
                result['provider'] = provider_name.lower().replace('.ng', '')

                if result['verified']:
                    logger.info(f" BVN verification successful with {provider_name}")
                    return result
                else:
                    logger.warning(
                        f" {provider_name} verification failed: {result['message']}"
                    )
                    # Don't try fallback if user details don't match or BVN is invalid
                    # These are real validation errors, not service issues
                    if ('match' in result['message'].lower() and 'exhausted' not in result['message'].lower()) or \
                       'invalid' in result['message'].lower():
                        return result
                    
                    # If it's a service issue (quota exhausted, rate limit, etc), try next provider
                    logger.info(f" {provider_name} service issue detected, trying fallback provider...")
                    continue

            except Exception as e:
                logger.error(f" Error with {provider_name}: {str(e)}")
                continue

        # All providers failed
        return {
            'verified': False,
            'message': 'BVN verification failed. Please check your details and try again.',
            'provider': 'all_failed'
        }

    @staticmethod
    def verify_nin_with_fallback(
        nin: str,
        firstname: str,
        lastname: str,
        date_of_birth: str
    ) -> dict:
        """
        Verify NIN with all available providers (with fallback)

        Similar to verify_bvn_with_fallback but for NIN
        """
        providers_to_try = []

        # Try IDCheck (Primary)
        try:
            if os.getenv('IDCHECK_PUBLIC_KEY'):
                providers_to_try.append(('IDCheck.ng', IDCheckProvider()))
        except Exception as e:
            logger.warning(f" Failed to initialize IDCheck: {e}")

        # Try Paystack as fallback
        try:
            if os.getenv('PAYSTACK_SECRET_KEY'):
                providers_to_try.append(('Paystack', PaystackProvider()))
        except Exception as e:
            logger.warning(f" Failed to initialize Paystack: {e}")

        if not providers_to_try:
            return {
                'verified': False,
                'message': 'No verification provider available. Please contact support.',
                'provider': 'none'
            }

        # Try each provider
        for provider_name, provider in providers_to_try:
            try:
                logger.info(f"🔍 Attempting NIN verification with {provider_name}")

                result = provider.verify_nin(
                    nin=nin,
                    firstname=firstname,
                    lastname=lastname,
                    date_of_birth=date_of_birth
                )

                # Normalize provider metadata so downstream task/status reporting is reliable.
                result['provider'] = provider_name.lower().replace('.ng', '')

                if result['verified']:
                    logger.info(f" NIN verification successful with {provider_name}")
                    return result
                else:
                    logger.warning(
                        f"❌ {provider_name} verification failed: {result['message']}"
                    )
                    # Don't try fallback if user details don't match or NIN is invalid
                    # These are real validation errors, not service issues
                    if ('match' in result['message'].lower() and 'exhausted' not in result['message'].lower()) or \
                       'invalid' in result['message'].lower():
                        return result
                    
                    # If it's a service issue (quota exhausted, rate limit, etc), try next provider
                    logger.info(f" {provider_name} service issue detected, trying fallback provider...")
                    continue

            except Exception as e:
                logger.error(f" Error with {provider_name}: {str(e)}")
                continue

        # All providers failed
        return {
            'verified': False,
            'message': 'NIN verification failed. Please check your details and try again.',
            'provider': 'all_failed'
        }
