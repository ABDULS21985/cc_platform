"""
Base class for BVN/NIN verification providers
Makes it easy to switch between Paystack, IDCheck, Dojah, etc.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class VerificationProvider(ABC):
    """
    Abstract base class for verification providers

    Allows easy switching between:
    - Paystack Identity
    - IDCheck.ng
    - Dojah
    - Mono Identity

    All providers must return standardized response format
    """

    @abstractmethod
    def verify_bvn(
        self,
        bvn: str,
        firstname: str,
        lastname: str,
        date_of_birth: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify BVN with provider

        Args:
            bvn: Bank Verification Number (11 digits)
            firstname: User's first name
            lastname: User's last name
            date_of_birth: Date of birth (YYYY-MM-DD)
            **kwargs: Additional provider-specific parameters

        Returns:
            Standardized response:
            {
                'verified': True/False,
                'message': 'Verification successful',
                'full_name': 'John Doe',
                'phone': '08012345678',
                'date_of_birth': '1990-01-15',
                'gender': 'male',
                'provider': 'paystack'
            }
        """
        pass

    @abstractmethod
    def verify_nin(
        self,
        nin: str,
        firstname: str,
        lastname: str,
        date_of_birth: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify NIN with provider

        Args:
            nin: National Identification Number (11 digits)
            firstname: User's first name
            lastname: User's last name
            date_of_birth: Date of birth (YYYY-MM-DD)
            **kwargs: Additional provider-specific parameters

        Returns:
            Standardized response (same format as verify_bvn)
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Provider name for logging

        Returns:
            Provider name (e.g., 'Paystack', 'IDCheck')
        """
        pass
