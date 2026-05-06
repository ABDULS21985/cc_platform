"""Unit tests for SessionService — record_login, list, revoke, revoke-all-others."""

from datetime import datetime
from unittest.mock import MagicMock

from flask import Flask

from modules.auth_v2.services.session_service import SessionService


def _make_service():
    svc = SessionService()
    svc.repo = MagicMock()
    return svc


def _request_context(headers=None, remote_addr='127.0.0.1'):
    """Build a Flask test request context with the given headers."""
    app = Flask(__name__)
    return app.test_request_context(
        '/',
        headers=headers or {'User-Agent': 'Mozilla/5.0 (Mac OS X) Chrome/120'},
        environ_base={'REMOTE_ADDR': remote_addr},
    )


class TestRecordLogin:
    def test_record_login_inserts_session(self):
        svc = _make_service()
        created = MagicMock()
        created.id = 42
        svc.repo.create.return_value = created

        with _request_context():
            session_id = svc.record_login(user_id=1)

        assert session_id == 42
        svc.repo.create.assert_called_once()
        kwargs = svc.repo.create.call_args.kwargs
        assert kwargs['user_id'] == 1
        assert kwargs['os'] == 'macOS'
        assert kwargs['browser'] == 'Chrome'

    def test_record_login_swallows_exceptions(self):
        svc = _make_service()
        svc.repo.create.side_effect = RuntimeError('db down')

        with _request_context(headers={'User-Agent': ''}):
            session_id = svc.record_login(user_id=1)

        assert session_id is None  # best-effort: never raises


class TestListAndRevoke:
    def test_list_for_user_returns_active_sessions(self):
        svc = _make_service()
        s = MagicMock()
        s.to_dict.return_value = {'id': 1, 'is_active': True}
        svc.repo.list_for_user.return_value = [s]

        result, status = svc.list_for_user(user_id=1)
        assert status == 200
        assert result['data']['total'] == 1
        assert result['data']['sessions'] == [{'id': 1, 'is_active': True}]

    def test_revoke_unknown_session_returns_404(self):
        svc = _make_service()
        svc.repo.find_by_id.return_value = None
        result, status = svc.revoke(session_id=99, user_id=1)
        assert status == 404

    def test_revoke_other_users_session_returns_404(self):
        svc = _make_service()
        s = MagicMock()
        s.user_id = 2
        s.revoked_at = None
        svc.repo.find_by_id.return_value = s
        result, status = svc.revoke(session_id=1, user_id=1)
        assert status == 404

    def test_revoke_already_revoked_is_idempotent(self):
        svc = _make_service()
        s = MagicMock()
        s.user_id = 1
        s.revoked_at = datetime.utcnow()
        s.to_dict.return_value = {'id': 1, 'is_active': False}
        svc.repo.find_by_id.return_value = s
        result, status = svc.revoke(session_id=1, user_id=1)
        assert status == 200
        svc.repo.revoke.assert_not_called()

    def test_revoke_all_others_returns_count(self):
        svc = _make_service()
        svc.repo.revoke_all_others.return_value = 3
        result, status = svc.revoke_all_others(user_id=1, current_session_id=99)
        assert status == 200
        assert result['data']['revoked_count'] == 3
        svc.repo.revoke_all_others.assert_called_once_with(1, 99)


class TestUserAgentParsing:
    def test_parse_iphone(self):
        from modules.auth_v2.services.session_service import _parse_user_agent
        device, browser, os = _parse_user_agent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Safari/16.0'
        )
        assert device == 'iPhone'
        assert os == 'iOS'

    def test_parse_windows_chrome(self):
        from modules.auth_v2.services.session_service import _parse_user_agent
        device, browser, os = _parse_user_agent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
        )
        assert os == 'Windows'
        assert browser == 'Chrome'
        assert 'Windows' in device

    def test_parse_empty(self):
        from modules.auth_v2.services.session_service import _parse_user_agent
        device, _, _ = _parse_user_agent('')
        assert device == 'Unknown device'
