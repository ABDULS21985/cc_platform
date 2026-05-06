"""
Termii API client.

Termii is the chosen SMS provider for Nigerian deliverability. The free
TermiiClient wraps just the two endpoints we use today:

- POST /api/sms/send       — transactional (notifications, audit alerts)
- POST /api/sms/otp/send   — OTP delivery (signup, login, transaction PIN)

Sandbox mode (TERMII_API_KEY unset, or SMS_ENABLED=false) returns a fake
"sent" response so dev environments don't burn real SMS credits.
"""
import logging
from typing import Dict, Optional

import requests

from config import Config

logger = logging.getLogger(__name__)


class TermiiError(Exception):
    """Wrapper around Termii API errors."""


class TermiiClient:
    BASE_URL = 'https://api.ng.termii.com/api'
    DEFAULT_TIMEOUT = 12  # seconds

    def __init__(self, api_key: Optional[str] = None, sender_id: Optional[str] = None):
        self.api_key = api_key or getattr(Config, 'TERMII_API_KEY', None) or ''
        self.sender_id = sender_id or getattr(Config, 'TERMII_SENDER_ID', None) or 'CCPay'
        self.enabled = bool(self.api_key) and getattr(Config, 'SMS_ENABLED', False)

    # ---------------------------------------------------------------- public

    def send_transactional(self, phone: str, message: str) -> Dict:
        """Send a non-OTP transactional message to a single recipient."""
        if not self.enabled:
            logger.info(f"[termii sandbox] SMS to {phone}: {message[:80]}")
            return {'sandbox': True, 'phone': phone}

        payload = {
            'to': phone,
            'from': self.sender_id,
            'sms': message,
            'type': 'plain',
            'channel': 'generic',
            'api_key': self.api_key,
        }
        return self._post('/sms/send', payload)

    def send_otp(self, phone: str, message: str, pin_attempts: int = 3, pin_time_to_live: int = 10) -> Dict:
        """
        Send an OTP. Termii's OTP endpoint generates the PIN itself; we
        receive a `pinId` we'd normally use to verify. We don't use that
        endpoint here — auth_v2 already issues OTPs via Redis. This method
        exists so flows that prefer Termii's PIN service can opt in later.
        """
        if not self.enabled:
            logger.info(f"[termii sandbox] OTP to {phone}: {message[:80]}")
            return {'sandbox': True, 'phone': phone}

        payload = {
            'api_key': self.api_key,
            'message_type': 'NUMERIC',
            'to': phone,
            'from': self.sender_id,
            'channel': 'generic',
            'pin_attempts': pin_attempts,
            'pin_time_to_live': pin_time_to_live,
            'pin_length': 6,
            'pin_placeholder': '< 1234 >',
            'message_text': message,
            'pin_type': 'NUMERIC',
        }
        return self._post('/sms/otp/send', payload)

    # ---------------------------------------------------------------- internal

    def _post(self, path: str, payload: Dict) -> Dict:
        url = f"{self.BASE_URL}{path}"
        try:
            resp = requests.post(url, json=payload, timeout=self.DEFAULT_TIMEOUT)
        except requests.RequestException as exc:
            logger.error(f"Termii request failed: {exc}")
            raise TermiiError(f"Termii network error: {exc}") from exc

        if resp.status_code >= 400:
            logger.error(f"Termii {resp.status_code}: {resp.text[:300]}")
            raise TermiiError(
                f"Termii returned {resp.status_code}: {resp.text[:300]}"
            )
        try:
            return resp.json()
        except ValueError:
            return {'raw': resp.text}
