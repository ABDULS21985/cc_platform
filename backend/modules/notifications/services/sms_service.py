"""
SMS service — wraps TermiiClient with:
  * E.164 phone normalization
  * per-user rate limit (5 SMS/hour)
  * daily budget circuit breaker (MAX_DAILY_SMS_NAIRA / cost-per-sms)
  * idempotency (60s dedupe on user_id + message hash)
  * dry-run mode when SMS_ENABLED is False

Redis backs the limiter, idempotency window, and budget counter whenever SMS is
enabled in production. The in-memory bucket is only a dev/test fallback.
"""
import hashlib
import logging
import os
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Deque, Dict, Optional, Tuple

import redis

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
_redis_client = None


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


def _get_redis_client():
    global _redis_client
    if os.getenv('PYTEST_CURRENT_TEST') and not os.getenv('SMS_TEST_REDIS_URL'):
        return None
    redis_url = os.getenv('REDIS_URL') or getattr(Config, 'REDIS_URL', None)
    if not redis_url:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        _redis_client = redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
    except Exception as exc:  # noqa: BLE001
        logger.warning("SMS Redis limiter unavailable; falling back to memory: %s", exc)
        _redis_client = None
    return _redis_client


def _gc_log(user_id: int, now: float) -> None:
    """Drop entries older than 1 hour for the user's hourly bucket."""
    log = _user_send_log[user_id]
    while log and (now - log[0]) > 3600:
        log.popleft()


def _gc_recent_hashes(now: float) -> None:
    expired = [k for k, ts in _recent_hashes.items() if (now - ts) > _RECENT_HASH_TTL_S]
    for k in expired:
        _recent_hashes.pop(k, None)


def _redis_key(*parts: object) -> str:
    return "sms:" + ":".join(str(part) for part in parts)


def _check_dedup(user_id: int, msg_hash: str, redis_client=None) -> bool:
    if redis_client is not None:
        return bool(redis_client.exists(_redis_key('dedupe', user_id, msg_hash)))

    now = time.time()
    _gc_recent_hashes(now)
    return (user_id, msg_hash) in _recent_hashes


def _record_dedup(user_id: int, msg_hash: str, now: float, redis_client=None) -> None:
    if redis_client is not None:
        redis_client.setex(_redis_key('dedupe', user_id, msg_hash), _RECENT_HASH_TTL_S, '1')
        return
    _recent_hashes[(user_id, msg_hash)] = now


def _rate_limited(user_id: int, now: float, redis_client=None) -> bool:
    if redis_client is not None:
        key = _redis_key('rate', 'user', user_id)
        cutoff = now - 3600
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, cutoff)
        pipe.zcard(key)
        _, count = pipe.execute()
        return int(count or 0) >= _PER_HOUR

    _gc_log(user_id, now)
    return len(_user_send_log[user_id]) >= _PER_HOUR


def _record_rate_send(user_id: int, now: float, redis_client=None) -> None:
    if redis_client is not None:
        key = _redis_key('rate', 'user', user_id)
        redis_client.zadd(key, {str(now): now})
        redis_client.expire(key, 3700)
        return
    _user_send_log[user_id].append(now)


def _budget_exhausted(redis_client=None) -> bool:
    budget = float(getattr(Config, 'MAX_DAILY_SMS_NAIRA', _DAILY_BUDGET_DEFAULT_NAIRA))
    if redis_client is not None:
        today_spend = float(redis_client.get(_redis_key('budget', _today_key())) or 0)
    else:
        today_spend = _daily_spend.get(_today_key(), 0.0)
    return today_spend + _COST_PER_SMS_NAIRA > budget


def _record_budget_spend(redis_client=None) -> None:
    if redis_client is not None:
        key = _redis_key('budget', _today_key())
        redis_client.incrbyfloat(key, _COST_PER_SMS_NAIRA)
        redis_client.expire(key, 172800)
        return
    _daily_spend[_today_key()] = _daily_spend.get(_today_key(), 0.0) + _COST_PER_SMS_NAIRA


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
        redis_client = _get_redis_client()
        if redis_client is None and bool(getattr(Config, 'PRODUCTION', False)):
            logger.error("SMS skipped: REDIS_URL is required when SMS is enabled in production")
            return {'success': False, 'reason': 'redis_required'}
        msg_hash = hashlib.sha1(message.encode('utf-8')).hexdigest()
        if _check_dedup(user.id, msg_hash, redis_client=redis_client):
            return {'success': True, 'note': 'deduped'}

        # Per-user rate limit
        if _rate_limited(user.id, now, redis_client=redis_client):
            logger.warning(f"SMS rate-limited for user {user.id}")
            return {'success': False, 'reason': 'rate_limited'}

        # Daily budget
        if _budget_exhausted(redis_client=redis_client):
            logger.error("SMS daily budget exhausted")
            return {'success': False, 'reason': 'budget_exhausted'}

        try:
            resp = self.client.send_transactional(phone, message)
        except TermiiError as exc:
            logger.error(f"Termii send failed: {exc}")
            return {'success': False, 'reason': 'provider_error'}

        # Bookkeeping
        _record_rate_send(user.id, now, redis_client=redis_client)
        _record_dedup(user.id, msg_hash, now, redis_client=redis_client)
        _record_budget_spend(redis_client=redis_client)

        return {'success': True, 'recipient': phone, 'provider_response': resp}
