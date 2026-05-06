"""Unit tests for NotificationService.

Focused on the gating logic (preferences + per-community mute) so that
regressions in the create_for_user path are caught fast. We mock the
repository layer so these tests don't touch the database.
"""

from unittest.mock import MagicMock, patch

import pytest

from modules.notifications.services.notification_service import (
    NotificationService,
)


class _FakePref:
    """Stand-in for a NotificationPreference row."""

    def __init__(self, **flags):
        self.money_enabled = flags.get('money', True)
        self.bills_enabled = flags.get('bills', True)
        self.communities_enabled = flags.get('communities', True)
        self.events_enabled = flags.get('events', True)
        self.security_enabled = True
        self.system_enabled = flags.get('system', True)

    def is_enabled(self, category: str) -> bool:
        if category == 'security':
            return True
        return getattr(self, f'{category}_enabled', True)


def _make_service(*, pref=None, muted_communities=None):
    """Construct a service with a stubbed repo."""
    svc = NotificationService()
    svc.repo = MagicMock()
    svc.repo.get_or_create_preferences.return_value = pref or _FakePref()
    svc.repo.is_community_muted.side_effect = lambda uid, cid: cid in (
        muted_communities or set()
    )
    # repo.create returns a "notification" object — we'll only check it
    # was called with the right args.
    svc.repo.create.return_value = MagicMock(to_dict=lambda: {'id': 1})
    svc.repo.count_unread.return_value = 0
    return svc


def test_create_persists_when_category_allowed():
    svc = _make_service(pref=_FakePref(money=True))
    with patch('extension.extensions.get_socketio', return_value=None):
        result = svc.create_for_user(
            user_id=1,
            title='Funded',
            category='money',
            source='Wallet',
            community_id=42,
        )
    assert result is not None
    svc.repo.create.assert_called_once()
    kwargs = svc.repo.create.call_args.kwargs
    assert kwargs['user_id'] == 1
    assert kwargs['category'] == 'money'
    assert kwargs['community_id'] == 42


def test_create_skipped_when_category_muted():
    svc = _make_service(pref=_FakePref(money=False))
    result = svc.create_for_user(
        user_id=1, title='Funded', category='money', source='Wallet',
    )
    assert result is None
    svc.repo.create.assert_not_called()


def test_security_always_delivered_even_when_pref_off():
    pref = _FakePref()
    pref.security_enabled = False  # malicious / corrupted state
    svc = _make_service(pref=pref)
    with patch('extension.extensions.get_socketio', return_value=None):
        result = svc.create_for_user(
            user_id=1,
            title='Failed sign-in',
            category='security',
            source='Security',
        )
    assert result is not None
    svc.repo.create.assert_called_once()


def test_create_skipped_when_community_muted():
    svc = _make_service(muted_communities={42})
    result = svc.create_for_user(
        user_id=1,
        title='New post',
        category='communities',
        community_id=42,
    )
    assert result is None
    svc.repo.create.assert_not_called()


def test_create_required_bypasses_mutes_and_uses_existing_transaction():
    svc = _make_service(pref=_FakePref(communities=False), muted_communities={42})
    result = svc.create_required_for_user(
        user_id=1,
        title='Mentioned',
        category='communities',
        community_id=42,
        commit=False,
    )
    assert result is not None
    svc.repo.get_or_create_preferences.assert_not_called()
    svc.repo.is_community_muted.assert_not_called()
    kwargs = svc.repo.create.call_args.kwargs
    assert kwargs['commit'] is False
    assert kwargs['category'] == 'communities'
    assert kwargs['community_id'] == 42


def test_security_bypasses_community_mute():
    """Security category must override per-community mutes too."""
    svc = _make_service(muted_communities={42})
    with patch('extension.extensions.get_socketio', return_value=None):
        result = svc.create_for_user(
            user_id=1,
            title='Suspended',
            category='security',
            community_id=42,
        )
    assert result is not None
    svc.repo.create.assert_called_once()


def test_unknown_category_falls_back_to_system():
    svc = _make_service()
    with patch('extension.extensions.get_socketio', return_value=None):
        svc.create_for_user(user_id=1, title='Test', category='garbage')
    kwargs = svc.repo.create.call_args.kwargs
    assert kwargs['category'] == 'system'


def test_unread_by_category_returns_all_keys():
    svc = NotificationService()
    svc.repo = MagicMock()
    svc.repo.count_unread_by_category.return_value = {'money': 3, 'bills': 1}
    result, status = svc.unread_by_category(user_id=1)
    assert status == 200
    buckets = result['unread_by_category']
    # Categories with no unread are emitted as 0, not omitted.
    assert buckets == {
        'money': 3, 'bills': 1, 'communities': 0,
        'events': 0, 'security': 0, 'system': 0,
    }
    assert result['total'] == 4


def test_mark_unread_delegates_to_repo():
    svc = NotificationService()
    svc.repo = MagicMock()
    notif = MagicMock(to_dict=lambda: {'id': 10, 'is_read': False})
    svc.repo.mark_unread.return_value = notif

    result, status = svc.mark_unread(notification_id=10, user_id=1)

    assert status == 200
    assert result == {'notification': {'id': 10, 'is_read': False}}
    svc.repo.mark_unread.assert_called_once_with(10, 1)


def test_unread_for_community_delegates_to_repo():
    svc = NotificationService()
    svc.repo = MagicMock()
    svc.repo.count_unread_for_community.return_value = 6

    result, status = svc.unread_for_community(user_id=1, community_id=42)

    assert status == 200
    assert result == {'community_id': 42, 'unread_count': 6}
    svc.repo.count_unread_for_community.assert_called_once_with(1, 42)


def test_mute_and_unmute_community_delegate_to_repo():
    svc = NotificationService()
    svc.repo = MagicMock()
    svc.repo.unmute_community.return_value = True
    result, status = svc.mute_community(user_id=1, community_id=99)
    assert status == 200 and result['muted'] is True
    svc.repo.mute_community.assert_called_once_with(1, 99)

    result, status = svc.unmute_community(user_id=1, community_id=99)
    assert status == 200 and result['muted'] is False
    svc.repo.unmute_community.assert_called_once_with(1, 99)
