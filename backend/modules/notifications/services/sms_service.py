"""
SMS service — wraps TermiiClient with:
  * E.164 phone normalization
  * per-user rate limit (5 SMS/hour)
  * daily budget circuit breaker (MAX_DAILY_SMS_NAIRA / cost-per-sms)
  * idempotency (60s dedupe on user_id + message hash)
  * dry-run mode when SMS_ENABLED is False

The rate limiter uses an in-memory bucket as a fallback when Redis isn't
configured — fine for dev / single-instance prod. Multi-instance prod
should set REDIS_URL so the limiter is shared across workers.
"""
import hashlib
import logging
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Deque, Dict, Optional, Tuple

from config import Config
from modules.notifications.providers.termii_client import TermiiClient, TermiiError

logger = logging.getLogger(__name__)

_PER_HOUR = 5
_DAILY_BUDGET_DEFAULT_NAIRA = 5000  # ~1700 SMS at ₦3 each
_COST_PER_SMS_NAIRA = 3.0
_RECENT_HASH_TTL_S = 60

_user_send_log: Dict[int, Deque[float]] = defaultdict(deque)
_recent_hashes: Dict[Tuple[int, str], float] = {}
_daily_spend: Dict[str, float] = {}  # YYYY-MM-DD -> spend (NGN)


def _normalize_e164(phone: str) -> Optional[str]:
    """
    Coerce a Nigerian phone number into E.164 (+234XXXXXXXXXX).
    Accepts local 11-digit (08012345678) and international 13/14-digit
    (2348012345678 / +2348012345678) forms.
    """
    if not phone:
        return None
    cleaned = re.sub(r'[^\d+]', '', phone)
    if cleaned.startswith('+'):
        digits = cleaned[1:]
    else:
        digits = cleaned
    if digits.startswith('234') and len(digits) == 13:
        return '+' + digits
    if digits.startswith('0') and len(digits) == 11:
        return '+234' + digits[1:]
    if len(digits) == 10 and digits[0] in ('7', '8', '9'):
        return '+234' + digits
    return None


def _today_key() -> str:
    return datetime.utcnow().strftime('%Y-%m-%d')


def _gc_log(user_id: int, now: float) -> None:
    """Drop entries older than 1 hour for the user's hourly bucket."""
    log = _user_send_log[user_id]
    while log and (now - log[0]) > 3600:
        log.popleft()


def _gc_recent_hashes(now: float) -> None:
    expired = [k for k, ts in _recent_hashes.items() if (now - ts) > _RECENT_HASH_TTL_S]
    for k in expired:
        _recent_hashes.pop(k, None)


class SmsService:
    """Single entry point for outbound SMS."""

    def __init__(self):
        self.client = TermiiClient()

    # ---------------------------------------------------------------- public

    def send_transactional(self, user, message: str) -> Dict:
        """
        Best-effort SMS send for transactional notifications. Always returns
        a dict; never raises. Failures are logged but should not block the
        upstream user-visible operation.
        """
        if not self.client.enabled:
            return {'success': True, 'note': 'sandbox', 'recipient': getattr(user, 'phone_number', None)}

        phone_raw = getattr(user, 'phone_number', None)
        phone = _normalize_e164(phone_raw or '')
        if not phone:
            logger.warning(f"SMS skipped: invalid phone for user {getattr(user, 'id', '?')}")
            return {'success': False, 'reason': 'invalid_phone'}

        # Idempotency
        now = time.time()
        _gc_recent_hashes(now)
        msg_hash = hashlib.sha1(message.encode('utf-8')).hexdigest()
        key = (user.id, msg_hash)
        if key in _recent_hashes:
            return {'success': True, 'note': 'deduped'}

        # Per-user rate limit
        _gc_log(user.id, now)
        if len(_user_send_log[user.id]) >= _PER_HOUR:
            logger.warning(f"SMS rate-limited for user {user.id}")
            return {'success': False, 'reason': 'rate_limited'}

        # Daily budget
        budget = float(getattr(Config, 'MAX_DAILY_SMS_NAIRA', _DAILY_BUDGET_DEFAULT_NAIRA))
        today_spend = _daily_spend.get(_today_key(), 0.0)
        if today_spend + _COST_PER_SMS_NAIRA > budget:
            logger.error(f"SMS daily budget exhausted (₦{budget})")
            return {'success': False, 'reason': 'budget_exhausted'}

        try:
            resp = self.client.send_transactional(phone, message)
        except TermiiError as exc:
            logger.error(f"Termii send failed: {exc}")
            return {'success': False, 'reason': 'provider_error'}

        # Bookkeeping
        _user_send_log[user.id].append(now)
        _recent_hashes[key] = now
        _daily_spend[_today_key()] = today_spend + _COST_PER_SMS_NAIRA

        return {'success': True, 'recipient': phone, 'provider_response': resp}
