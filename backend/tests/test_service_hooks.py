"""Integration-style tests for the service-layer notification + audit hooks.

These tests verify that the right side-effects fire when a domain action
succeeds: bill creation notifies members, joining a community greets the
member and pings owners, suspending a member emits a security audit, etc.

Hooks are best-effort by design (they wrap their own try/except so a
failure can't roll back the parent transaction). To keep the tests fast
and deterministic we patch the notification + audit services and assert
on the call shape — we don't reach the database.
"""
from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest


# ----------------------------------------------------------------------
# Bill creation hook
# ----------------------------------------------------------------------
def test_bill_create_notifies_members_and_audits_creator(monkeypatch):
    from modules.community.services import bill_service as mod

    bill = MagicMock(
        id=1,
        title='Estate dues',
        amount=Decimal('5000'),
        is_recurring=False,
        community_id=10,
        creator_id=42,
    )
    bill_repo = MagicMock()
    bill_repo.create.return_value = bill
    member_repo = MagicMock()
    member_repo.is_admin_or_owner.return_value = True
    # Two other members + the creator (creator should be skipped).
    member_repo.find_by_community.return_value = (
        [MagicMock(user_id=42), MagicMock(user_id=7), MagicMock(user_id=8)],
        3,
    )
    session_repo = MagicMock()

    svc = mod.BillService()
    svc.bill_repo = bill_repo
    svc.member_repo = member_repo
    svc.session_repo = session_repo
    monkeypatch.setattr(mod, 'db', MagicMock())

    notif_calls = []
    audit_calls = []

    notif_service = MagicMock()
    notif_service.create_for_user = lambda **kw: notif_calls.append(kw) or MagicMock()
    audit_service = MagicMock()
    audit_service.record = lambda **kw: audit_calls.append(kw)

    community_repo = MagicMock()
    community_repo.find_by_id.return_value = MagicMock(name='Lekki Block')

    with patch(
        'modules.notifications.services.notification_service.NotificationService',
        return_value=notif_service,
    ), patch(
        'modules.audit.services.audit_service.AuditService',
        return_value=audit_service,
    ), patch(
        'modules.community.repositories.community_repository.CommunityRepository',
        return_value=community_repo,
    ):
        result, error = svc.create_bill(
            community_id=10,
            creator_id=42,
            data={
                'title': 'Estate dues',
                'description': 'May',
                'amount': '5000',
                'type': 'fixed',
                'due_date': datetime.utcnow(),
                'is_recurring': False,
            },
        )

    assert error is None and result is bill
    # Two notifications (creator skipped), one audit row.
    assert len(notif_calls) == 2
    notified_users = {c['user_id'] for c in notif_calls}
    assert 42 not in notified_users  # creator excluded
    assert {7, 8} == notified_users
    # Each notification carries community_id so per-community mute applies.
    assert all(c['community_id'] == 10 for c in notif_calls)
    assert all(c['category'] == 'bills' for c in notif_calls)

    assert len(audit_calls) == 1
    assert audit_calls[0]['user_id'] == 42
    assert audit_calls[0]['action'] == 'Bill created'
    assert audit_calls[0]['category'] == 'admin'


# ----------------------------------------------------------------------
# Community join hook
# ----------------------------------------------------------------------
def test_join_community_welcomes_user_and_pings_owners(monkeypatch):
    from modules.community.services import membership_service as mod

    member_obj = MagicMock(user_id=99, role='member')
    member_repo = MagicMock()
    member_repo.find_by_community_and_user.return_value = None
    member_repo.create.return_value = member_obj
    member_repo.find_owners.return_value = [
        MagicMock(user_id=99),  # joiner is the owner — skip
        MagicMock(user_id=1),  # actual owner
    ]
    community_repo = MagicMock()
    community_repo.find_by_id.return_value = MagicMock(name='Trinity Co-op')

    svc = mod.MembershipService()
    svc.member_repo = member_repo
    svc.community_repo = community_repo
    monkeypatch.setattr(mod, 'db', MagicMock())

    welcome_calls = []
    audit_calls = []
    notif_service = MagicMock()
    notif_service.create_for_user = lambda **kw: welcome_calls.append(kw) or MagicMock()
    audit_service = MagicMock()
    audit_service.record = lambda **kw: audit_calls.append(kw)

    with patch(
        'modules.notifications.services.notification_service.NotificationService',
        return_value=notif_service,
    ), patch(
        'modules.audit.services.audit_service.AuditService',
        return_value=audit_service,
    ):
        member, error = svc.add_member(community_id=10, user_id=99, role='member')

    assert error is None and member is member_obj
    # 1 welcome to joiner + 1 ping to the non-joiner owner = 2 notifications.
    targets = [c['user_id'] for c in welcome_calls]
    assert targets.count(99) == 1  # welcome
    assert 1 in targets  # owner notification
    assert 99 not in [t for c, t in zip(welcome_calls[1:], targets[1:])
                       if c.get('title', '').startswith('New member')]
    # Joiner audit row created.
    assert len(audit_calls) == 1
    assert audit_calls[0]['user_id'] == 99
    assert audit_calls[0]['action'] == 'Joined community'


# ----------------------------------------------------------------------
# Role change hook
# ----------------------------------------------------------------------
def test_role_change_audit_severity_warning_when_promoting_to_admin(monkeypatch):
    from modules.community.services import membership_service as mod

    member_obj = MagicMock(role='member')
    member_repo = MagicMock()
    member_repo.find_by_community_and_user.return_value = member_obj
    community_repo = MagicMock()
    community_repo.find_by_id.return_value = MagicMock(name='Cryptos NG')

    svc = mod.MembershipService()
    svc.member_repo = member_repo
    svc.community_repo = community_repo
    monkeypatch.setattr(mod, 'db', MagicMock())

    audit_calls = []
    notif_service = MagicMock()
    notif_service.create_for_user = lambda **kw: MagicMock()
    audit_service = MagicMock()
    audit_service.record = lambda **kw: audit_calls.append(kw)

    with patch(
        'modules.notifications.services.notification_service.NotificationService',
        return_value=notif_service,
    ), patch(
        'modules.audit.services.audit_service.AuditService',
        return_value=audit_service,
    ):
        svc.update_member_role(community_id=10, user_id=7, new_role='admin')

    assert len(audit_calls) == 1
    assert audit_calls[0]['severity'] == 'warning'  # admin elevation


def test_role_change_audit_severity_info_for_demotion(monkeypatch):
    from modules.community.services import membership_service as mod

    member_obj = MagicMock(role='admin')
    member_repo = MagicMock()
    member_repo.find_by_community_and_user.return_value = member_obj
    community_repo = MagicMock()
    community_repo.find_by_id.return_value = MagicMock(name='Cryptos NG')

    svc = mod.MembershipService()
    svc.member_repo = member_repo
    svc.community_repo = community_repo
    monkeypatch.setattr(mod, 'db', MagicMock())

    audit_calls = []
    with patch(
        'modules.notifications.services.notification_service.NotificationService',
        return_value=MagicMock(create_for_user=lambda **kw: MagicMock()),
    ), patch(
        'modules.audit.services.audit_service.AuditService',
        return_value=MagicMock(record=lambda **kw: audit_calls.append(kw)),
    ):
        svc.update_member_role(community_id=10, user_id=7, new_role='member')

    assert audit_calls[0]['severity'] == 'info'  # demotion


# ----------------------------------------------------------------------
# Suspend hook
# ----------------------------------------------------------------------
def test_suspend_member_records_security_warning(monkeypatch):
    from modules.community.services import membership_service as mod
    from modules.community.constants import MemberStatus

    member_obj = MagicMock(status=MemberStatus.ACTIVE.value)
    member_repo = MagicMock()
    member_repo.find_by_community_and_user.return_value = member_obj
    community_repo = MagicMock()
    community_repo.find_by_id.return_value = MagicMock(name='Lekki Runners')

    svc = mod.MembershipService()
    svc.member_repo = member_repo
    svc.community_repo = community_repo
    monkeypatch.setattr(mod, 'db', MagicMock())

    audit_calls = []
    notif_calls = []
    with patch(
        'modules.notifications.services.notification_service.NotificationService',
        return_value=MagicMock(
            create_for_user=lambda **kw: notif_calls.append(kw) or MagicMock()
        ),
    ), patch(
        'modules.audit.services.audit_service.AuditService',
        return_value=MagicMock(record=lambda **kw: audit_calls.append(kw)),
    ):
        svc.suspend_member(community_id=10, user_id=7)

    # User gets a security notification + a security/warning audit row.
    assert any(
        c['category'] == 'security' and 'Suspended' in c['title']
        for c in notif_calls
    )
    assert any(
        a['category'] == 'security' and a['severity'] == 'warning'
        for a in audit_calls
    )
