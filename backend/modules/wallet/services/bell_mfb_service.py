"""
Bell MFB Service - Payment Provider API Integration
Handles all interactions with Bell MFB API
Follows Single Responsibility Principle
"""
import os
import requests
import logging
import hmac
import hashlib
from typing import Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class BellMFBService:
    """
    Service for Bell MFB API operations
    
    Responsibilities:
    - Generate and cache authentication tokens
    - Create individual client accounts
    - Query client information
    - Verify webhook signatures
    
    Single Responsibility: Bell MFB API communication only
    """
    
    def __init__(self):
        """
        Initialize Bell MFB service with credentials from environment
        
        Environment Variables Required:
        - BELL_MFB_CLIENT_ID
        - BELL_MFB_CLIENT_SECRET
        - BELL_MFB_BASE_URL
        """
        self.base_url = os.getenv('BELL_MFB_BASE_URL')
        self.client_id = os.getenv('BELL_MFB_CLIENT_ID')
        self.client_secret = os.getenv('BELL_MFB_CLIENT_SECRET')
        
        # Validate configuration
        if not all([self.base_url, self.client_id, self.client_secret]):
            raise ValueError(
                "Missing Bell MFB configuration. Required: "
                "BELL_MFB_CLIENT_ID, BELL_MFB_CLIENT_SECRET, BELL_MFB_BASE_URL"
            )
        
        # Token caching
        self.token = None
        self.token_expiry = None
        
        logger.info(f"BellMFBService initialized with base_url: {self.base_url}")

    def _is_sandbox(self) -> bool:
        """
        Detect whether this service is targeting Bell MFB sandbox.

        Sandbox detection prefers the base URL (matches the deployed
        environment we are talking to), and falls back to FLASK_ENV.
        """
        try:
            from config import Config  # local import to avoid circular imports
            base_url = getattr(Config, "BELL_MFB_BASE_URL", None) or self.base_url or ""
            flask_env = getattr(Config, "FLASK_ENV", None) or os.getenv("FLASK_ENV", "")
        except Exception:
            base_url = self.base_url or ""
            flask_env = os.getenv("FLASK_ENV", "")

        base_url_l = (base_url or "").lower()
        if "sandbox" in base_url_l or "staging" in base_url_l or "test" in base_url_l:
            return True
        if (flask_env or "").lower() in ("development", "dev", "testing", "test", "staging"):
            return True
        return False

    def _timeout_message(self) -> str:
        """Environment-aware timeout copy used in surfaced exceptions."""
        if self._is_sandbox():
            return "Bell MFB sandbox returned a timeout — typical for sandbox load."
        return "Bell MFB API timed out. Please retry shortly."
    
    def generate_token(self, validity_minutes: int = 60) -> str:
        """
        Generate authentication token for Bell MFB API
        Caches token to avoid unnecessary API calls
        
        Args:
            validity_minutes: How long token should be valid (default 60 minutes)
            
        Returns:
            JWT token string
            
        Raises:
            requests.RequestException: If API call fails
            
        API Endpoint: POST /generate-token
        """
        # Return cached token if still valid (with 5-minute buffer)
        if self.token and self.token_expiry and datetime.now() < self.token_expiry:
            logger.debug("Using cached Bell MFB token")
            return self.token
        
        logger.info(f"Generating new Bell MFB token (validity: {validity_minutes} minutes)")
        
        try:
            response = requests.post(
                f"{self.base_url}/generate-token",
                headers={
                    'Content-Type': 'application/json',
                    'consumerKey': self.client_id,
                    'consumerSecret': self.client_secret,
                    'validityTime': str(validity_minutes)
                },
                timeout=10
            )
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('success'):
                self.token = data['token']
                # Set expiry with 5-minute buffer for safety
                self.token_expiry = datetime.now() + timedelta(minutes=validity_minutes - 5)
                
                logger.info("Bell MFB token generated successfully")
                return self.token
            else:
                error_msg = data.get('message', 'Unknown error')
                logger.error(f"Bell MFB token generation failed: {error_msg}")
                raise Exception(f"Token generation failed: {error_msg}")
                
        except requests.RequestException as e:
            logger.error(f"Bell MFB API error during token generation: {str(e)}")
            raise
    
    def create_individual_client(self, client_data: Dict) -> Dict:
        """
        Create individual client account on Bell MFB
        
        Args:
            client_data: Dictionary with client information:
                - title (str): Mr, Mrs, Miss, etc.
                - firstName (str): First name
                - middleName (str): Middle name (optional)
                - lastName (str): Last name
                - dateOfBirth (str): Format YYYY-MM-DD
                - email (str): Email address
                - phone (str): Phone number (format: 2348012345678)
                - bvn (str): Bank Verification Number (11 digits)
                - gender (str): male/female
                - address (str): Residential address
                
        Returns:
            Dictionary with client information:
                - clientId (str): Bell MFB client ID
                - accountNumber (str): Virtual account number
                - accountName (str): Account name
                - bankCode (str): Bank code
                
        Raises:
            requests.RequestException: If API call fails
            
        API Endpoint: POST /account/clients/individual
        """
        token = self.generate_token()
        
        logger.info(f"Creating Bell MFB individual client for email: {client_data.get('email')}")
        
        try:
            response = requests.post(
                f"{self.base_url}/account/clients/individual",
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {token}'
                },
                json=client_data,
                timeout=30  # Client creation can take 20-30 seconds
            )
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('success'):
                client_info = data['data']
                logger.info(
                    f"Bell MFB client created successfully. "
                    f"ClientID: {client_info.get('clientId')}, "
                    f"Account: {client_info.get('accountNumber')}"
                )
                return client_info
            else:
                error_msg = data.get('message', 'Unknown error')
                logger.error(f"Bell MFB client creation failed: {error_msg}")
                raise Exception(f"Client creation failed: {error_msg}")
                
        except requests.Timeout:
            logger.error("Bell MFB client creation timed out (30s)")
            raise Exception(self._timeout_message())
        except requests.RequestException as e:
            logger.error(f"Bell MFB API error during client creation: {str(e)}")
            raise
    
    def get_client_info(self, account_number: str) -> Dict:
        """
        Query client information by account number
        
        Args:
            account_number: Bell MFB virtual account number
            
        Returns:
            Dictionary with client information
            
        Raises:
            requests.RequestException: If API call fails
            
        API Endpoint: GET /client-enquiry/{accountNumber}
        """
        token = self.generate_token()
        
        logger.info(f"Querying Bell MFB client info for account: {account_number}")
        
        try:
            response = requests.get(
                f"{self.base_url}/client-enquiry/{account_number}",
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {token}'
                },
                timeout=10
            )
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('success'):
                logger.info(f"Client info retrieved for account: {account_number}")
                return data['data']
            else:
                error_msg = data.get('message', 'Unknown error')
                logger.error(f"Bell MFB client enquiry failed: {error_msg}")
                raise Exception(f"Client enquiry failed: {error_msg}")
                
        except requests.RequestException as e:
            logger.error(f"Bell MFB API error during client enquiry: {str(e)}")
            raise
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify webhook signature using HMAC-SHA256
        
        Bell MFB signs webhook payloads using BELL_MFB_CLIENT_SECRET
        
        Args:
            payload: Raw request body as string
            signature: Signature from webhook header (X-Signature or similar)
            
        Returns:
            True if signature is valid, False otherwise
            
        Security Note:
        - Always verify webhook signatures to prevent spoofing
        - Use constant-time comparison to prevent timing attacks
        """
        try:
            # Generate expected signature using client secret
            expected_signature = hmac.new(
                self.client_secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Constant-time comparison to prevent timing attacks
            is_valid = hmac.compare_digest(expected_signature, signature)
            
            if is_valid:
                logger.info("Webhook signature verified successfully")
            else:
                logger.warning("Invalid webhook signature detected")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False
    
    def get_transaction_details(self, reference: str) -> Dict:
        """
        Get transaction details by reference
        
        Args:
            reference: Transaction reference
            
        Returns:
            Dictionary with transaction details
            
        Raises:
            requests.RequestException: If API call fails
            
        API Endpoint: GET /transaction/{reference}
        """
        token = self.generate_token()
        
        logger.info(f"Querying Bell MFB transaction: {reference}")
        
        try:
            response = requests.get(
                f"{self.base_url}/transaction/{reference}",
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {token}'
                },
                timeout=10
            )
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('success'):
                logger.info(f"Transaction details retrieved: {reference}")
                return data['data']
            else:
                error_msg = data.get('message', 'Unknown error')
                logger.error(f"Bell MFB transaction query failed: {error_msg}")
                raise Exception(f"Transaction query failed: {error_msg}")
                
        except requests.RequestException as e:
            logger.error(f"Bell MFB API error during transaction query: {str(e)}")
            raise

    def initiate_transfer(
        self,
        source_account: str,
        recipient_account: str,
        recipient_bank_code: str,
        recipient_name: str,
        amount: float,
        narration: str,
        reference: str,
    ) -> Dict:
        """
        Initiate an outbound NIP transfer from a Bell MFB virtual account.

        Args:
            source_account: Bell MFB virtual account number (source of funds)
            recipient_account: Destination account number
            recipient_bank_code: NIBSS bank code of destination bank
            recipient_name: Beneficiary name
            amount: Amount in NGN (not kobo)
            narration: Transfer narration / description
            reference: Unique client reference for idempotency

        Returns:
            Dictionary with transfer details (transactionReference, status, etc.)

        Raises:
            Exception: If transfer is rejected or API call fails

        API Endpoint: POST /account/transfer
        """
        token = self.generate_token()
        payload = {
            "sourceAccountNumber": source_account,
            "destinationBankCode": recipient_bank_code,
            "destinationAccountNumber": recipient_account,
            "destinationAccountName": recipient_name,
            "amount": amount,
            "narration": narration,
            "clientReference": reference,
        }
        logger.info(
            f"Initiating Bell MFB transfer: {amount} NGN from {source_account} "
            f"to {recipient_account} ({recipient_bank_code}), ref={reference}"
        )
        try:
            response = requests.post(
                f"{self.base_url}/account/transfer",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            if data.get("success"):
                logger.info(f"Bell MFB transfer successful, ref={reference}")
                return data.get("data", {})
            else:
                error_msg = data.get("message", "Unknown error")
                logger.error(f"Bell MFB transfer rejected: {error_msg}, ref={reference}")
                raise Exception(f"Transfer failed: {error_msg}")

        except requests.RequestException as e:
            logger.error(f"Bell MFB API error during transfer: {str(e)}, ref={reference}")
            raise


if __name__ == '__main__':
    """
    Test Bell MFB Service
    Usage: python modules/wallet/services/bell_mfb_service.py
    """
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    print("=" * 60)
    print("Bell MFB Service Test")
    print("=" * 60)
    
    try:
        service = BellMFBService()
        print(f"\n Service initialized")
        print(f"Base URL: {service.base_url}")
        print(f"Client ID: {service.client_id[:10]}...")
        
        # Test token generation
        print("\n  Testing token generation...")
        token = service.generate_token()
        print(f"Token generated: {token[:20]}...")
        print(f"Token expiry: {service.token_expiry}")
        
        # Test cached token
        print("\n  Testing token caching...")
        token2 = service.generate_token()
        print(f"Same token returned: {token == token2}")
        
        print("\n All tests passed!")
        
    except Exception as e:
        print(f"\n Test failed: {str(e)}")
    
    print("=" * 60)
