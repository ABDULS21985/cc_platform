"""
IDCheck.ng Identity API Provider
https://v1.idcheck.ng/

Supports:
- BVN verification
- NIN verification
- Face verification (liveness check)
"""
import os
import requests
import logging
from typing import Dict, Any
from modules.verification.providers.base_provider import VerificationProvider

logger = logging.getLogger(__name__)


class IDCheckProvider(VerificationProvider):
    """
    IDCheck.ng identity verification provider

    Supports:
    - BVN verification with name/DOB matching
    - NIN verification with name/DOB matching
    - Face verification/liveness check

    Test Mode: Uses test API key (free)
    Production: Uses live API key (paid per verification)
    """

    def __init__(self):
        """Initialize IDCheck provider with public key from environment"""
        self.public_key = os.getenv('IDCHECK_PUBLIC_KEY')
        self.base_url = os.getenv('IDCHECK_BASE_URL', 'https://devapi.idcheck.ng')

        if not self.public_key:
            raise ValueError(
                "IDCHECK_PUBLIC_KEY not set in environment. "
                "Get your key from: https://v1.idcheck.ng/"
            )

        self.is_test_mode = self.public_key.startswith('pk_test_')
        if self.is_test_mode:
            logger.info("🧪 IDCheck running in TEST MODE (free)")
        else:
            logger.info("💰 IDCheck running in LIVE MODE")

        logger.info(f"IDCheckProvider initialized with base_url: {self.base_url}")

    @property
    def name(self) -> str:
        """Provider name"""
        return "IDCheck.ng"

    def verify_bvn(
        self,
        bvn: str,
        firstname: str,
        lastname: str,
        date_of_birth: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify BVN with IDCheck.ng

        Args:
            bvn: Bank Verification Number (11 digits)
            firstname: First name
            lastname: Last name
            date_of_birth: Date of birth (YYYY-MM-DD)
            **kwargs: Additional parameters

        Returns:
            {
                'success': bool,
                'verified': bool,
                'message': str,
                'data': {
                    'bvn': str,
                    'name': str,
                    'date_of_birth': str,
                    'account_number': str,
                    'bank_code': str,
                    ...
                }
            }

        Raises:
            requests.RequestException: If API call fails
        """
        logger.info(f"🔍 Verifying BVN with IDCheck: {bvn[-4:].rjust(11, '*')}")

        try:
            endpoint = f"{self.base_url}/v1/rest-api/verification/bvn/basic"
            
            payload = {
                "bvn": bvn,
                "firstName": firstname,
                "lastName": lastname,
                "birthday": date_of_birth
            }

            headers = {
                "Content-Type": "application/json",
                "apiKey": self.public_key
            }

            logger.debug(f"Calling IDCheck BVN endpoint: {endpoint}")
            response = requests.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'success' or data.get('success'):
                logger.info("BVN verification successful via IDCheck")
                return {
                    'success': True,
                    'verified': True,
                    'message': 'BVN verified successfully',
                    'data': data.get('data', {})
                }
            else:
                error_msg = data.get('message', 'BVN verification failed')
                logger.warning(f"❌ IDCheck verification failed: {error_msg}")
                return {
                    'success': False,
                    'verified': False,
                    'message': error_msg,
                    'data': data.get('data', {})
                }

        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            logger.error(f"❌ IDCheck API error: {error_msg}")
            raise Exception(f"IDCheck BVN verification failed: {error_msg}")

    def verify_nin(
        self,
        nin: str,
        firstname: str,
        lastname: str,
        date_of_birth: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify NIN with IDCheck.ng

        Args:
            nin: National Identification Number (11 digits)
            firstname: First name
            lastname: Last name
            date_of_birth: Date of birth (YYYY-MM-DD)
            **kwargs: Additional parameters

        Returns:
            {
                'success': bool,
                'verified': bool,
                'message': str,
                'data': {
                    'nin': str,
                    'name': str,
                    'date_of_birth': str,
                    ...
                }
            }

        Raises:
            requests.RequestException: If API call fails
        """
        logger.info(f"🔍 Verifying NIN with IDCheck: {nin[-4:].rjust(11, '*')}")

        try:
            endpoint = f"{self.base_url}/v1/rest-api/verification/nin/basic"
            
            payload = {
                "nin": nin,
                "firstName": firstname,
                "lastName": lastname,
                "birthday": date_of_birth
            }

            headers = {
                "Content-Type": "application/json",
                "apiKey": self.public_key
            }

            logger.debug(f"Calling IDCheck NIN endpoint: {endpoint}")
            response = requests.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'success' or data.get('success'):
                logger.info("NIN verification successful via IDCheck")
                return {
                    'success': True,
                    'verified': True,
                    'message': 'NIN verified successfully',
                    'data': data.get('data', {})
                }
            else:
                error_msg = data.get('message', 'NIN verification failed')
                logger.warning(f"❌ IDCheck verification failed: {error_msg}")
                return {
                    'success': False,
                    'verified': False,
                    'message': error_msg,
                    'data': data.get('data', {})
                }

        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            logger.error(f"❌ IDCheck API error: {error_msg}")
            raise Exception(f"IDCheck NIN verification failed: {error_msg}")

    def verify_face(
        self,
        face_image: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Verify face/liveness with IDCheck.ng

        Args:
            face_image: Base64 encoded image or image path
            **kwargs: Additional parameters

        Returns:
            {
                'success': bool,
                'verified': bool,
                'liveness_score': float,
                'message': str
            }
        """
        logger.info("🔍 Verifying face/liveness with IDCheck")

        try:
            endpoint = f"{self.base_url}/verification/liveness"
            
            payload = {
                "image": face_image
            }

            headers = {
                "Content-Type": "application/json",
                "X-API-Key": self.public_key
            }

            response = requests.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'success' or data.get('success'):
                liveness_score = data.get('data', {}).get('liveness_score', 0)
                logger.info(f"Face verification successful. Liveness score: {liveness_score}")
                return {
                    'success': True,
                    'verified': liveness_score > 0.7,  # 70% threshold
                    'liveness_score': liveness_score,
                    'message': 'Face verified successfully'
                }
            else:
                error_msg = data.get('message', 'Face verification failed')
                logger.warning(f"❌ IDCheck face verification failed: {error_msg}")
                return {
                    'success': False,
                    'verified': False,
                    'message': error_msg
                }

        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            logger.error(f"❌ IDCheck face verification API error: {error_msg}")
            raise Exception(f"IDCheck face verification failed: {error_msg}")
