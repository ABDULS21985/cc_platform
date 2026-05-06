"""Unit tests for the FCM-aware verification notification service."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest


def _service_with_push_enabled():
    """Build a NotificationService in a state where push gating is enabled."""
    from modules.verification.services.notification_service import (
        NotificationService,
    )

    svc = NotificationService()
    svc.push_enabled = True  # bypass ENABLE_PUSH_NOTIFICATIONS env gate
    return svc


def test_send_push_short_circuits_when_fcm_disabled(monkeypatch):
    """When ``Config.FCM_ENABLED`` is False the service must not call Firebase."""
    from config import Config

    monkeypatch.setattr(Config, 'FCM_ENABLED', False, raising=False)

    svc = _service_with_push_enabled()
    user = SimpleNamespace(id=1, firstname='Sam', email='sam@example.com')

    result = svc._send_push(user, 'bvn', 'verified')

    assert result == {'success': False, 'error': 'FCM disabled'}


def test_send_push_invokes_messaging_when_enabled(monkeypatch):
    """When FCM is enabled and tokens resolve, ``send_multicast`` is called."""
    from config import Config

    monkeypatch.setattr(Config, 'FCM_ENABLED', True, raising=False)

    svc = _service_with_push_enabled()

    # Resolved Firebase singleton — must look configured.
    fake_firebase = SimpleNamespace(app=MagicMock())
    monkeypatch.setattr(
        'firebase.service.FirebaseService.get_instance',
        classmethod(lambda cls: fake_firebase),
    )

    # Bypass the device-token DB lookup with an explicit token list.
    monkeypatch.setattr(
        svc, '_resolve_fcm_tokens', lambda user, tokens=None: ['tok-a', 'tok-b']
    )

    sent = {}

    class _Resp:
        success_count = 2
        failure_count = 0
        responses = [SimpleNamespace(success=True), SimpleNamespace(success=True)]

    def _fake_send_multicast(message):
        sent['called'] = True
        sent['message'] = message
        return _Resp()

    # Patch firebase_admin.messaging.send_multicast — the service imports
    # ``messaging`` lazily inside ``_dispatch_multicast``.
    fake_messaging = MagicMock()
    fake_messaging.send_multicast.side_effect = _fake_send_multicast
    fake_messaging.MulticastMessage = MagicMock(return_value=MagicMock(name='multicast'))
    fake_messaging.Notification = MagicMock()
    fake_messaging.WebpushConfig = MagicMock()
    fake_messaging.WebpushNotification = MagicMock()
    fake_messaging.WebpushFCMOptions = MagicMock()

    with patch.dict(
        'sys.modules', {'firebase_admin': MagicMock(messaging=fake_messaging)}
    ), patch('firebase_admin.messaging', fake_messaging, create=True):
        user = SimpleNamespace(id=1, firstname='Sam', email='sam@example.com')
        result = svc._send_push(user, 'bvn', 'verified', tokens=['tok-a', 'tok-b'])

    assert sent.get('called') is True
    assert result['success'] is True
    assert result['success_count'] == 2
    assert result['failure_count'] == 0


def test_send_push_returns_no_tokens_error_when_user_has_none(monkeypatch):
    from config import Config

    monkeypatch.setattr(Config, 'FCM_ENABLED', True, raising=False)
    svc = _service_with_push_enabled()

    fake_firebase = SimpleNamespace(app=MagicMock())
    monkeypatch.setattr(
        'firebase.service.FirebaseService.get_instance',
        classmethod(lambda cls: fake_firebase),
    )

    monkeypatch.setattr(svc, '_resolve_fcm_tokens', lambda user, tokens=None: [])

    user = SimpleNamespace(id=1)
    result = svc._send_push(user, 'bvn', 'verified')

    assert result['success'] is False
    assert 'No device tokens' in result['error']


def test_send_transaction_push_short_circuits_when_fcm_disabled(monkeypatch):
    from config import Config

    monkeypatch.setattr(Config, 'FCM_ENABLED', False, raising=False)
    svc = _service_with_push_enabled()

    user = SimpleNamespace(id=1)
    txn = SimpleNamespace(amount=100, reference='REF1', description='Test', id=10)

    result = svc._send_transaction_push(user, txn)

    assert result == {'success': False, 'error': 'FCM disabled'}


def test_send_push_handles_firebase_exception_gracefully(monkeypatch):
    """A Firebase exception during send_multicast must not bubble out."""
    from config import Config

    monkeypatch.setattr(Config, 'FCM_ENABLED', True, raising=False)
    svc = _service_with_push_enabled()

    fake_firebase = SimpleNamespace(app=MagicMock())
    monkeypatch.setattr(
        'firebase.service.FirebaseService.get_instance',
        classmethod(lambda cls: fake_firebase),
    )

    monkeypatch.setattr(svc, '_resolve_fcm_tokens', lambda user, tokens=None: ['t'])

    fake_messaging = MagicMock()
    fake_messaging.send_multicast.side_effect = RuntimeError('FCM down')
    fake_messaging.MulticastMessage = MagicMock(return_value=MagicMock())
    fake_messaging.Notification = MagicMock()
    fake_messaging.WebpushConfig = MagicMock()
    fake_messaging.WebpushNotification = MagicMock()
    fake_messaging.WebpushFCMOptions = MagicMock()

    with patch.dict(
        'sys.modules', {'firebase_admin': MagicMock(messaging=fake_messaging)}
    ), patch('firebase_admin.messaging', fake_messaging, create=True):
        user = SimpleNamespace(id=1)
        result = svc._send_push(user, 'bvn', 'verified', tokens=['t'])

    assert result['success'] is False
    assert 'FCM down' in (result.get('errors') or [''])[0] or 'FCM down' in result.get('error', '')
