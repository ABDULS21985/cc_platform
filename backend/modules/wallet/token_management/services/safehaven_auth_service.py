"""
SafeHaven OAuth2 authentication service.
Manages JWT client assertions, token exchange, and automatic token refresh.
"""
import logging
import os
import time
import jwt
import requests
import re
from typing import Dict, Any, Optional
from modules.wallet.token_management.models import PaymentTokenStore
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


class SafeHavenAuthService:
    """
    Handles SafeHaven OAuth2 authentication with JWT client assertion.
    
    Flow:
    1. Sign JWT with private key → client_assertion
    2. Exchange assertion for access_token + refresh_token
    3. Auto-refresh when access_token expires
    4. Full re-auth when refresh_token expires
    """
    
    PROVIDER_NAME = "safehaven"
    
    def __init__(self):
        """Initialize with credentials from environment."""
        # Support both SAFEHAVEN_* and legacy/mistyped SAFEHEAVEN_* env var prefixes.
        # We prefer SAFEHAVEN_* but fall back to SAFEHEAVEN_* for compatibility.
        def _env(*names: str, default: str = None) -> Optional[str]:
            for name in names:
                value = os.getenv(name)
                if value is not None and str(value).strip() != "":
                    return value
            return default

        self.base_url = _env("SAFEHAVEN_BASE_URL", "SAFEHEAVEN_BASE_URL")
        self.oauth_client_id = _env("SAFEHAVEN_OAUTH_APP_CLIENT_ID", "SAFEHEAVEN_OAUTH_APP_CLIENT_ID")
        # SafeHaven uses "Company Url" for the `iss` claim (docs).
        # Support a clearer env name, but fall back for older configs.
        self.oauth_issuer = _env(
            "SAFEHAVEN_COMPANY_URL",
            "SAFEHEAVEN_COMPANY_URL",
            "SAFEHAVEN_OAUTH_ISSUER",
            "SAFEHEAVEN_OAUTH_ISSUER",
        )
        self.client_id = _env("SAFEHAVEN_CLIENT_ID", "SAFEHEAVEN_CLIENT_ID")
        self.user_id = _env("SAFEHAVEN_USER_ID", "SAFEHEAVEN_USER_ID")
        private_key_raw = _env("SAFEHAVEN_PRIVATE_KEY_PEM", "SAFEHEAVEN_PRIVATE_KEY_PEM", default="")
        self.private_key_pem = str(private_key_raw).replace("\\n", "\n")

        def _looks_like_url(value: Optional[str]) -> bool:
            if not value:
                return False
            return bool(re.match(r"^https?://", str(value).strip(), flags=re.IGNORECASE))

        if self.oauth_issuer and not _looks_like_url(self.oauth_issuer):
            raise ValueError(
                "Invalid SafeHaven issuer configuration. `iss` must be your Company URL (e.g. https://yourcompany.com). "
                "Set SAFEHAVEN_COMPANY_URL (preferred) or SAFEHAVEN_OAUTH_ISSUER."
            )
        
        if not all([self.base_url, self.oauth_client_id, self.oauth_issuer, self.private_key_pem]):
            raise ValueError(
                "Missing SafeHaven config. Required: "
                "SAFEHAVEN_BASE_URL, SAFEHAVEN_OAUTH_APP_CLIENT_ID, SAFEHAVEN_OAUTH_ISSUER, SAFEHAVEN_PRIVATE_KEY_PEM"
            )
    
    def get_valid_token(self) -> str:
        """
        Get a valid access token (auto-refreshes if needed).
        
        Returns:
            Valid access_token string
        """
        token_record = self._get_stored_tokens()
        now = int(time.time())
        
        # No stored tokens - full auth
        if not token_record:
            logger.info("No stored SafeHaven tokens, performing full auth")
            return self._perform_full_auth()
        
        # Access token still valid
        if token_record.access_token_expiry > now:
            logger.debug("Using cached SafeHaven access token")
            return token_record.access_token
        
        # Access token expired, try refresh
        logger.info("SafeHaven access token expired, refreshing")
        
        # Check if client assertion needs refresh
        client_assertion = token_record.client_assertion
        if token_record.client_assertion_expiry <= now:
            logger.info("Client assertion expired, creating new one")
            client_assertion = self._create_client_assertion()
        
        # Check if refresh token is still valid
        if token_record.refresh_token_expiry > now:
            logger.info("Refreshing access token with refresh token")
            try:
                return self._refresh_access_token(
                    token_record.refresh_token,
                    client_assertion,
                    token_record,
                )
            except Exception as exc:
                # SafeHaven may return a 200 with an error payload or omit expected fields.
                # In that case, fall back to full auth instead of crashing with KeyError.
                logger.warning(
                    f"SafeHaven token refresh failed, falling back to full auth: {exc}",
                    exc_info=True,
                )
                return self._perform_full_auth()
        
        # Refresh token expired - full re-auth
        logger.info("Refresh token expired, performing full re-auth")
        return self._perform_full_auth()
    
    def _create_client_assertion(self) -> str:
        """Sign JWT client assertion with private key."""
        payload = {
            "iss": self.oauth_issuer,     # Issuer (SAFEHAVEN_OAUTH_ISSUER)
            "sub": self.oauth_client_id,  # Subject
            "aud": self.base_url,         # Audience
            "exp": int(time.time()) + 3600,  # Expires in 1 hour
            "iat": int(time.time())       # Issued at
        }
        
        try:
            assertion = jwt.encode(
                payload,
                self.private_key_pem,
                algorithm="RS256"
            )
            logger.debug("Created SafeHaven client assertion")
            return assertion
        except Exception as e:
            logger.error(f"Failed to sign client assertion: {e}")
            raise ValueError(f"JWT signing failed: {e}")
    
    def _exchange_client_assertion(self, client_assertion: str) -> Dict[str, Any]:
        """Exchange client assertion for access + refresh tokens."""
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.oauth_client_id,
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": client_assertion,
        }
        
        try:
            data = self._request_tokens(payload)

            if "access_token" not in data or "refresh_token" not in data:
                # SafeHaven may respond with an error object while still returning 200.
                logger.error(
                    "SafeHaven token exchange response missing expected tokens",
                    extra={
                        "keys": list(data.keys()) if isinstance(data, dict) else None,
                        "error": data.get("error") if isinstance(data, dict) else None,
                        "provider_message": data.get("message") if isinstance(data, dict) else None,
                    },
                )
                raise Exception(f"Token exchange returned unexpected response: {data}")
            
            # Decode tokens to get expiry times
            access_payload = jwt.decode(data["access_token"], options={"verify_signature": False})
            refresh_payload = jwt.decode(data["refresh_token"], options={"verify_signature": False})
            assertion_payload = jwt.decode(client_assertion, options={"verify_signature": False})
            
            return {
                "access_token": data["access_token"],
                "access_token_expiry": access_payload["exp"],
                "refresh_token": data["refresh_token"],
                "refresh_token_expiry": refresh_payload["exp"],
                "client_assertion": client_assertion,
                "client_assertion_expiry": assertion_payload["exp"]
            }
        except requests.RequestException as e:
            logger.error(f"SafeHaven token exchange failed: {e}", exc_info=True)
            raise Exception(f"Token exchange failed: {e}")
    
    def _refresh_access_token(
        self, 
        refresh_token: str, 
        client_assertion: str,
        token_record: PaymentTokenStore
    ) -> str:
        """Use refresh token to get new access token."""
        payload = {
            "grant_type": "refresh_token",
            "client_id": self.oauth_client_id,
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": client_assertion,
            "refresh_token": refresh_token
        }
        
        try:
            data = self._request_tokens(payload)

            if "access_token" not in data:
                logger.error(
                    "SafeHaven refresh response missing access_token",
                    extra={
                        "keys": list(data.keys()) if isinstance(data, dict) else None,
                        "error": data.get("error") if isinstance(data, dict) else None,
                        "provider_message": data.get("message") if isinstance(data, dict) else None,
                    },
                )
                raise Exception(f"Token refresh returned unexpected response: {data}")
            
            # Decode new access token
            access_payload = jwt.decode(data["access_token"], options={"verify_signature": False})
            assertion_payload = jwt.decode(client_assertion, options={"verify_signature": False})
            
            # Update stored tokens
            token_record.access_token = data["access_token"]
            token_record.access_token_expiry = access_payload["exp"]
            token_record.client_assertion = client_assertion
            token_record.client_assertion_expiry = assertion_payload["exp"]
            
            db.session.commit()
            
            logger.info("SafeHaven access token refreshed successfully")
            return data["access_token"]
            
        except requests.RequestException as e:
            logger.error(f"SafeHaven token refresh failed: {e}", exc_info=True)
            raise

    def _request_tokens(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Request tokens from SafeHaven.

        SafeHaven deployments vary between:
        - `/oauth/token` (form-encoded; common in docs/blogs)
        - `/oauth2/token` (JSON; observed in some integrations)

        This method tries both against the configured API host unless explicitly overridden.
        """
        explicit_url = os.getenv("SAFEHAVEN_OAUTH_TOKEN_URL") or os.getenv("SAFEHEAVEN_OAUTH_TOKEN_URL")
        candidates = [explicit_url] if explicit_url else [
            f"{self.base_url}/oauth/token",
            f"{self.base_url}/oauth2/token",
        ]

        last_exc: Optional[Exception] = None
        for url in [c for c in candidates if c]:
            # 1) Try form-encoded (docs)
            try:
                resp = requests.post(
                    url,
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30,
                )
                if resp.status_code == 404:
                    raise requests.HTTPError(f"404 Not Found for url: {url}", response=resp)
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                last_exc = exc

            # 2) Try JSON (fallback)
            try:
                resp = requests.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=30,
                )
                if resp.status_code == 404:
                    raise requests.HTTPError(f"404 Not Found for url: {url}", response=resp)
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                last_exc = exc

        raise Exception(f"Token exchange failed: {last_exc}")
    
    def _perform_full_auth(self) -> str:
        """Perform full OAuth2 flow from scratch."""
        try:
            # Create client assertion
            client_assertion = self._create_client_assertion()
            
            # Exchange for tokens
            token_data = self._exchange_client_assertion(client_assertion)
            
            # Store or update in database
            token_record = self._get_stored_tokens()
            
            if token_record:
                # Update existing
                token_record.access_token = token_data["access_token"]
                token_record.access_token_expiry = token_data["access_token_expiry"]
                token_record.refresh_token = token_data["refresh_token"]
                token_record.refresh_token_expiry = token_data["refresh_token_expiry"]
                token_record.client_assertion = token_data["client_assertion"]
                token_record.client_assertion_expiry = token_data["client_assertion_expiry"]
            else:
                # Create new
                token_record = PaymentTokenStore(
                    provider=self.PROVIDER_NAME,
                    access_token=token_data["access_token"],
                    access_token_expiry=token_data["access_token_expiry"],
                    refresh_token=token_data["refresh_token"],
                    refresh_token_expiry=token_data["refresh_token_expiry"],
                    client_assertion=token_data["client_assertion"],
                    client_assertion_expiry=token_data["client_assertion_expiry"]
                )
                db.session.add(token_record)
            
            db.session.commit()
            
            logger.info("SafeHaven full auth completed successfully")
            return token_data["access_token"]
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"SafeHaven full auth failed: {e}", exc_info=True)
            raise
    
    def _get_stored_tokens(self) -> Optional[PaymentTokenStore]:
        """Retrieve stored tokens from database."""
        return PaymentTokenStore.query.filter_by(provider=self.PROVIDER_NAME).first()
