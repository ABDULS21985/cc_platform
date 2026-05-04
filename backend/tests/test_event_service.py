"""Unit tests for EventService — capacity, attendance, host-only cancel."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from modules.events.services.event_service import EventService


def _make_event(*, capacity=10, attendees=0, attending_user_ids=(), creator_id=1, cancelled=False):
    evt = MagicMock()
    evt.id = 1
    evt.creator_id = creator_id
    evt.community_id = None
    evt.capacity = capacity
    evt.title = 'Test Event'
    evt.starts_at = datetime.utcnow() + timedelta(days=1)
    evt.ends_at = None
    evt.cancelled_at = datetime.utcnow() if cancelled else None
    evt.attendee_count.return_value = attendees
    evt.is_user_attending.side_effect = lambda uid: uid in attending_user_ids
    evt.to_dict.return_value = {'id': 1, 'title': 'Test Event'}
    return evt


def _make_service(*, event=None):
    svc = EventService()
    svc.repo = MagicMock()
    svc.repo.find_by_id.return_value = event
    svc.repo.community_name.return_value = None
    svc.repo.attend.return_value = MagicMock()
    svc.repo.cancel_attendance.return_value = True
    svc.repo.update.return_value = MagicMock()
    return svc


def test_attend_404_when_event_missing():
    svc = _make_service(event=None)
    result, status = svc.attend(event_id=999, user_id=1)
    assert status == 404


def test_attend_blocks_at_capacity_for_new_rsvp():
    """Capacity check fires only when the user isn't already attending."""
    full = _make_event(capacity=2, attendees=2, attending_user_ids=())
    svc = _make_service(event=full)
    result, status = svc.attend(event_id=1, user_id=99)
    assert status == 409
    assert result['code'] == 'AT_CAPACITY'
    svc.repo.attend.assert_not_called()


def test_attend_allows_re_rsvp_even_at_capacity():
    """A user already attending can re-confirm without tripping capacity."""
    full = _make_event(capacity=2, attendees=2, attending_user_ids=(7,))
    svc = _make_service(event=full)
    with patch(
        'modules.audit.services.audit_service.AuditService'
    ) as audit_cls:
        audit_cls.return_value.record = MagicMock()
        result, status = svc.attend(event_id=1, user_id=7)
    assert status == 200
    svc.repo.attend.assert_called_once_with(1, 7)


def test_attend_records_audit_only_on_first_rsvp():
    """Re-RSVP shouldn't double-log."""
    new_evt = _make_event(capacity=10, attendees=0, attending_user_ids=())
    svc = _make_service(event=new_evt)
    with patch(
        'modules.audit.services.audit_service.AuditService'
    ) as audit_cls:
        audit_inst = MagicMock()
        audit_cls.return_value = audit_inst
        svc.attend(event_id=1, user_id=2)
    audit_inst.record.assert_called_once()

    # Now simulate the user already attending — no new audit row.
    re_evt = _make_event(capacity=10, attendees=1, attending_user_ids=(2,))
    svc2 = _make_service(event=re_evt)
    with patch(
        'modules.audit.services.audit_service.AuditService'
    ) as audit_cls2:
        audit_inst2 = MagicMock()
        audit_cls2.return_value = audit_inst2
        svc2.attend(event_id=1, user_id=2)
    audit_inst2.record.assert_not_called()


def test_cancel_blocks_non_host():
    evt = _make_event(creator_id=42)
    svc = _make_service(event=evt)
    result, status = svc.cancel(event_id=1, user_id=99)
    assert status == 403
    svc.repo.update.assert_not_called()


def test_cancel_allowed_for_host():
    evt = _make_event(creator_id=42)
    svc = _make_service(event=evt)
    result, status = svc.cancel(event_id=1, user_id=42)
    assert status == 200
    assert result['cancelled'] is True
    svc.repo.update.assert_called_once()
