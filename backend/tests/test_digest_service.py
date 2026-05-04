"""Unit tests for DigestService — HTML rendering and dispatch gating."""

from datetime import datetime
from unittest.mock import MagicMock

import pytest

from modules.notifications.services.digest_service import DigestService
from modules.notifications.models.notification import Notification
from modules.notifications.models.preference import NotificationPreference
from modules.auth_v2.models.user import User


@pytest.fixture(scope='module')
def app_ctx():
    """Push an app context once per module so SQLAlchemy queries can resolve
    Flask's globals during patching. Inside the tests, every query is mocked
    to a controlled return — the app context is just there to satisfy the
    `current_app` lookup that some descriptors hit."""
    from app import application
    with application.app_context():
        yield


def _fake_user(email='u@example.com', firstname='Sam'):
    user = MagicMock()
    user.email = email
    user.firstname = firstname
    return user


def _fake_notif(category='money', title='Funded', body='ok', source='Wallet',
                amount_value=None, amount_direction=None):
    n = MagicMock()
    n.category = category
    n.title = title
    n.body = body
    n.source = source
    n.amount_value = amount_value
    n.amount_direction = amount_direction
    return n


def _stub_query(monkeypatch, model, results=None, single=None):
    """Patch model.query so the chained `filter(...).order_by(...).all()` /
    `filter_by(...).first()` calls return controlled values without disturbing
    the SQLAlchemy column descriptors used in `>=` etc.
    """
    q = MagicMock()
    if results is not None:
        q.filter.return_value.order_by.return_value.all.return_value = results
    if single is not None:
        q.filter_by.return_value.first.return_value = single
    monkeypatch.setattr(model, 'query', q)
    return q


def test_render_html_groups_by_category_and_escapes():
    svc = DigestService()
    user = _fake_user(firstname='<script>')
    items = [
        _fake_notif(category='money', title='Top-up', amount_value='40,000', amount_direction='in'),
        _fake_notif(category='bills', title='Rent due'),
        _fake_notif(category='money', title='Withdrawal', amount_value='5,000', amount_direction='out'),
    ]
    html = svc._render_html(user, items)
    # First name is escaped — no raw <script>.
    assert '<script>' not in html
    assert '&lt;script&gt;' in html
    # Categories appear with counts.
    assert 'Money (2)' in html
    assert 'Bills (1)' in html
    # Amount formatting reflects direction.
    assert '+₦40,000' in html
    assert '−₦5,000' in html


def test_send_digest_skips_when_no_unread(monkeypatch, app_ctx):
    svc = DigestService()
    _stub_query(monkeypatch, User, single=_fake_user())
    _stub_query(monkeypatch, Notification, results=[])

    svc.email = MagicMock()
    result = svc.send_digest_for_user(user_id=1)
    assert result is False
    svc.email._send_email.assert_not_called()


def test_send_digest_advances_last_digest_at_on_success(monkeypatch, app_ctx):
    svc = DigestService()
    user = _fake_user()
    _stub_query(monkeypatch, User, single=user)
    _stub_query(monkeypatch, Notification, results=[_fake_notif()])

    pref = MagicMock(last_digest_at=None)
    _stub_query(monkeypatch, NotificationPreference, single=pref)

    db_mock = MagicMock()
    monkeypatch.setattr(
        'modules.notifications.services.digest_service.db', db_mock,
    )

    svc.email = MagicMock()
    svc.email._send_email.return_value = True
    result = svc.send_digest_for_user(user_id=1)

    assert result is True
    svc.email._send_email.assert_called_once()
    assert isinstance(pref.last_digest_at, datetime)
    db_mock.session.commit.assert_called_once()
