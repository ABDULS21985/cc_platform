"""
Verification Providers
External API providers for BVN/NIN verification
"""
from modules.verification.providers.base_provider import VerificationProvider
from modules.verification.providers.paystack_provider import PaystackProvider
from modules.verification.providers.idcheck_provider import IDCheckProvider

__all__ = ['VerificationProvider', 'PaystackProvider', 'IDCheckProvider']
