"""Unit tests for SmsService — phone normalization + rate limit + dedup + budget."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from modules.notifications.services import sms_service as sms_module
from modules.notifications.services.sms_service import (
    SmsService,
    _normalize_e164,
    _user_send_log,
    _recent_hashes,
    _daily_spend,
)


def _user(phone='+2348012345678', uid=1):
    return SimpleNamespace(id=uid, phone_number=phone)


def _reset_state():
    _user_send_log.clear()
    _recent_hashes.clear()
    _daily_spend.clear()


class TestNormalize:
    def test_already_e164(self):
        assert _normalize_e164('+2348012345678') == '+2348012345678'

    def test_local_with_leading_zero(self):
        assert _normalize_e164('08012345678') == '+2348012345678'

    def test_country_code_no_plus(self):
        assert _normalize_e164('2348012345678') == '+2348012345678'

    def test_strips_formatting(self):
        assert _normalize_e164('+234 (801) 234-5678') == '+2348012345678'

    def test_invalid_returns_none(self):
        assert _normalize_e164('not a number') is None
        assert _normalize_e164('') is None
        assert _normalize_e164(None) is None  # type: ignore[arg-type]

    def test_too_short_returns_none(self):
        assert _normalize_e164('+234801') is None


class TestSendTransactional:
    def setup_method(self):
        _reset_state()

    def test_sandbox_returns_success_without_sending(self):
        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = False
        result = svc.send_transactional(_user(), 'hello')
        assert result['success'] is True
        assert result['note'] == 'sandbox'
        svc.client.send_transactional.assert_not_called()

    def test_invalid_phone_skipped(self):
        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = True
        result = svc.send_transactional(_user(phone='abc'), 'hi')
        assert result['success'] is False
        assert result['reason'] == 'invalid_phone'
        svc.client.send_transactional.assert_not_called()

    def test_first_send_succeeds(self):
        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = True
        svc.client.send_transactional.return_value = {'ok': True}

        result = svc.send_transactional(_user(uid=1), 'hello')
        assert result['success'] is True
        svc.client.send_transactional.assert_called_once()
        assert len(_user_send_log[1]) == 1

    def test_dedupes_identical_message_within_60s(self):
        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = True
        svc.client.send_transactional.return_value = {'ok': True}

        svc.send_transactional(_user(uid=2), 'identical')
        result = svc.send_transactional(_user(uid=2), 'identical')
        assert result['note'] == 'deduped'
        # Only one provider call.
        assert svc.client.send_transactional.call_count == 1

    def test_rate_limits_after_5_per_hour(self):
        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = True
        svc.client.send_transactional.return_value = {'ok': True}

        for i in range(5):
            r = svc.send_transactional(_user(uid=3), f'msg-{i}')
            assert r['success'] is True
        result = svc.send_transactional(_user(uid=3), 'msg-6')
        assert result['success'] is False
        assert result['reason'] == 'rate_limited'

    def test_budget_breaker_short_circuits(self):
        from config import Config

        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = True
        svc.client.send_transactional.return_value = {'ok': True}

        # Set today's spend just under the cap so the next send blows past it.
        with patch.object(Config, 'MAX_DAILY_SMS_NAIRA', 1):
            result = svc.send_transactional(_user(uid=4), 'broke')
        assert result['success'] is False
        assert result['reason'] == 'budget_exhausted'

    def test_provider_error_is_not_raised(self):
        from modules.notifications.providers.termii_client import TermiiError

        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = True
        svc.client.send_transactional.side_effect = TermiiError('500')

        result = svc.send_transactional(_user(uid=5), 'will fail')
        assert result['success'] is False
        assert result['reason'] == 'provider_error'

    def test_redis_limiter_and_dedupe_used_when_available(self, monkeypatch):
        class FakePipeline:
            def __init__(self, client):
                self.client = client

            def zremrangebyscore(self, key, min_score, max_score):
                self.client.zsets.setdefault(key, {})
                return self

            def zcard(self, key):
                self.key = key
                return self

            def execute(self):
                return [0, len(self.client.zsets.get(self.key, {}))]

        class FakeRedis:
            def __init__(self):
                self.values = {}
                self.zsets = {}

            def exists(self, key):
                return key in self.values

            def setex(self, key, ttl, value):
                self.values[key] = value

            def pipeline(self):
                return FakePipeline(self)

            def zadd(self, key, mapping):
                self.zsets.setdefault(key, {}).update(mapping)

            def expire(self, key, ttl):
                return True

            def get(self, key):
                return self.values.get(key)

            def incrbyfloat(self, key, amount):
                self.values[key] = str(float(self.values.get(key, 0)) + float(amount))

        fake_redis = FakeRedis()
        monkeypatch.setattr(sms_module, "_get_redis_client", lambda: fake_redis)

        svc = SmsService()
        svc.client = MagicMock()
        svc.client.enabled = True
        svc.client.send_transactional.return_value = {'ok': True}

        first = svc.send_transactional(_user(uid=6), 'redis-backed')
        second = svc.send_transactional(_user(uid=6), 'redis-backed')

        assert first['success'] is True
        assert second['note'] == 'deduped'
        assert svc.client.send_transactional.call_count == 1
        assert _user_send_log == {}
