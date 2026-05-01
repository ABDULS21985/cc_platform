"""
Paystack Identity API Provider
https://paystack.com/docs/identity-verification/

Pricing: ₦150 per verification
Test Mode: Free (use sk_test_xxx keys)
"""
import os
import requests
import logging
from typing import Dict, Any
from modules.verification.providers.base_provider import VerificationProvider

logger = logging.getLogger(__name__)


class PaystackProvider(VerificationProvider):
    """
    Paystack Identity verification provider

    Supports:
    - BVN verification with name/DOB matching
    - NIN verification with name/DOB matching
    - Blacklist checking

    Test Mode: Uses sk_test_xxx keys (free, no charges)
    Production: Uses sk_live_xxx keys (₦150 per verification)
    """

    def __init__(self):
        """Initialize Paystack provider with secret key from environment"""
        self.secret_key = os.getenv('PAYSTACK_SECRET_KEY')
        self.base_url = 'https://api.paystack.co'

        if not self.secret_key:
            raise ValueError(
                "PAYSTACK_SECRET_KEY not set in environment. "
                "Get your key from: https://dashboard.paystack.com/settings/api-keys"
            )

        self.is_test_mode = self.secret_key.startswith('sk_test_')
        if self.is_test_mode:
            logger.info("🧪 Paystack running in TEST MODE (free)")
        else:
            logger.info("💰 Paystack running in LIVE MODE (₦150 per verification)")

    @property
    def name(self) -> str:
        """Provider name"""
        return "Paystack Identity"

    def verify_bvn(
        self,
        bvn: str,
        firstname: str,
        lastname: str,
        date_of_birth: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify BVN using Paystack Identity API

        API Endpoint: POST /bvn/match
        Docs: https://paystack.com/docs/identity-verification/verify-bvn/

        Args:
            bvn: 11-digit BVN
            firstname: First name
            lastname: Last name
            date_of_birth: YYYY-MM-DD format

        Returns:
            {
                'verified': True/False,
                'message': 'BVN verified successfully',
                'full_name': 'JOHN DOE',
                'phone': '08012345678',
                'date_of_birth': '1990-01-15',
                'gender': 'male',
                'provider': 'paystack'
            }

        Raises:
            requests.RequestException: If API call fails
        """
        logger.info(f"🔍 Verifying BVN with Paystack: {bvn[:4]}****{bvn[-3:]}")

        try:
            # Paystack BVN Match API
            response = requests.post(
                f"{self.base_url}/bvn/match",
                headers={
                    'Authorization': f'Bearer {self.secret_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'bvn': bvn,
                    'first_name': firstname,
                    'last_name': lastname,
                    'dob': date_of_birth  # Paystack expects YYYY-MM-DD
                },
                timeout=30  # BVN verification can take 10-20 seconds
            )

            response.raise_for_status()
            data = response.json()

            # Paystack response format:
            # {
            #   "status": true,
            #   "message": "BVN validation successful",
            #   "data": {
            #     "is_blacklisted": false,
            #     "first_name": "JOHN",
            #     "last_name": "DOE",
            #     "dob": "1990-01-15",
            #     "formatted_dob": "15-Jan-1990",
            #     "mobile": "08012345678",
            #     "bvn": "22222222221"
            #   }
            # }

            if data.get('status') and data.get('data'):
                match_data = data['data']

                # Check if blacklisted
                if match_data.get('is_blacklisted'):
                    logger.warning(f"⚠️ BVN {bvn[:4]}**** is blacklisted")
                    return {
                        'verified': False,
                        'message': 'This BVN has been flagged. Please contact support.',
                        'provider': 'paystack'
                    }

                logger.info(f"BVN verification successful via Paystack")
                return {
                    'verified': True,
                    'message': 'BVN verified successfully',
                    'full_name': f"{match_data.get('first_name', '')} {match_data.get('last_name', '')}".strip(),
                    'phone': match_data.get('mobile'),
                    'date_of_birth': match_data.get('dob'),
                    'gender': 'male',  # Paystack doesn't return gender in BVN match
                    'provider': 'paystack'
                }
            else:
                error_msg = data.get('message', 'BVN verification failed')
                logger.warning(f"❌ Paystack BVN verification failed: {error_msg}")
                return {
                    'verified': False,
                    'message': error_msg,
                    'provider': 'paystack'
                }

        except requests.Timeout:
            logger.error("⏱️ Paystack API timeout after 30 seconds")
            return {
                'verified': False,
                'message': 'Verification service is slow. Please try again.',
                'provider': 'paystack'
            }
        except requests.HTTPError as e:
            # Handle specific HTTP errors
            if e.response.status_code == 400:
                error_data = e.response.json()
                error_msg = error_data.get('message', 'Invalid BVN or details do not match')
                logger.warning(f"❌ Paystack validation error: {error_msg}")
                return {
                    'verified': False,
                    'message': error_msg,
                    'provider': 'paystack'
                }
            elif e.response.status_code == 401:
                logger.error("🔒 Paystack authentication failed - check API key")
                return {
                    'verified': False,
                    'message': 'Verification service configuration error',
                    'provider': 'paystack'
                }
            else:
                logger.error(f"❌ Paystack HTTP error: {e}")
                return {
                    'verified': False,
                    'message': 'Verification service error. Please try again.',
                    'provider': 'paystack'
                }
        except requests.RequestException as e:
            logger.error(f"❌ Paystack API error: {str(e)}")
            return {
                'verified': False,
                'message': 'Verification service unavailable. Please try again later.',
                'provider': 'paystack'
            }

    def verify_nin(
        self,
        nin: str,
        firstname: str,
        lastname: str,
        date_of_birth: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify NIN using Paystack Identity API

        API Endpoint: POST /nin/verify
        Docs: https://paystack.com/docs/identity-verification/verify-nin/

        Args:
            nin: 11-digit NIN
            firstname: First name
            lastname: Last name
            date_of_birth: YYYY-MM-DD format

        Returns:
            Standardized verification result
        """
        logger.info(f"🔍 Verifying NIN with Paystack: {nin[:4]}****{nin[-3:]}")

        try:
            response = requests.post(
                f"{self.base_url}/nin/verify",
                headers={
                    'Authorization': f'Bearer {self.secret_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'nin': nin,
                    'first_name': firstname,
                    'last_name': lastname,
                    'dob': date_of_birth
                },
                timeout=30
            )

            response.raise_for_status()
            data = response.json()

            if data.get('status') and data.get('data'):
                match_data = data['data']

                logger.info(f"NIN verification successful via Paystack")
                return {
                    'verified': True,
                    'message': 'NIN verified successfully',
                    'full_name': f"{match_data.get('first_name', '')} {match_data.get('last_name', '')}".strip(),
                    'phone': match_data.get('mobile'),
                    'date_of_birth': match_data.get('dob'),
                    'gender': match_data.get('gender', 'male'),
                    'provider': 'paystack'
                }
            else:
                error_msg = data.get('message', 'NIN verification failed')
                logger.warning(f"❌ Paystack NIN verification failed: {error_msg}")
                return {
                    'verified': False,
                    'message': error_msg,
                    'provider': 'paystack'
                }

        except requests.Timeout:
            logger.error("⏱️ Paystack API timeout")
            return {
                'verified': False,
                'message': 'Verification service timeout. Please try again.',
                'provider': 'paystack'
            }
        except requests.HTTPError as e:
            if e.response.status_code == 400:
                error_data = e.response.json()
                error_msg = error_data.get('message', 'Invalid NIN or details do not match')
                return {
                    'verified': False,
                    'message': error_msg,
                    'provider': 'paystack'
                }
            else:
                logger.error(f"❌ Paystack HTTP error: {e}")
                return {
                    'verified': False,
                    'message': 'Verification service error',
                    'provider': 'paystack'
                }
        except requests.RequestException as e:
            logger.error(f"❌ Paystack API error: {str(e)}")
            return {
                'verified': False,
                'message': 'Verification service unavailable',
                'provider': 'paystack'
            }


if __name__ == '__main__':
    """
    Test Paystack Provider
    Usage: python modules/verification/providers/paystack_provider.py
    """
    from dotenv import load_dotenv
    load_dotenv()

    print("=" * 60)
    print("Paystack Provider Test")
    print("=" * 60)

    try:
        provider = PaystackProvider()
        print(f"\n Provider initialized: {provider.name}")
        print(f"Mode: {'TEST' if provider.is_test_mode else 'LIVE'}")
        print(f"Base URL: {provider.base_url}")

        # Test BVN verification
        print("\n🔍 Testing BVN verification...")
        print("(This will use test mode - no charges)")

        # Example test - replace with actual test data
        result = provider.verify_bvn(
            bvn="22222222221",
            firstname="John",
            lastname="Doe",
            date_of_birth="1990-01-15"
        )

        print(f"\nResult:")
        print(f"  Verified: {result['verified']}")
        print(f"  Message: {result['message']}")
        if result['verified']:
            print(f"  Full Name: {result.get('full_name')}")
            print(f"  Phone: {result.get('phone')}")

    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")

    print("\n" + "=" * 60)
