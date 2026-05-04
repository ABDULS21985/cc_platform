"""Unit tests for AuditService — focuses on category/severity coercion."""

from unittest.mock import MagicMock

from modules.audit.services.audit_service import AuditService


def _make_service():
    svc = AuditService()
    svc.repo = MagicMock()
    svc.repo.create.return_value = MagicMock()
    return svc


def test_record_passes_through_known_category_and_severity():
    svc = _make_service()
    svc.record(
        user_id=1,
        action='Sign-in',
        category='security',
        severity='warning',
    )
    kwargs = svc.repo.create.call_args.kwargs
    assert kwargs['category'] == 'security'
    assert kwargs['severity'] == 'warning'


def test_record_coerces_unknown_category_to_system():
    svc = _make_service()
    svc.record(user_id=1, action='Test', category='gibberish')
    assert svc.repo.create.call_args.kwargs['category'] == 'system'


def test_record_coerces_unknown_severity_to_info():
    svc = _make_service()
    svc.record(user_id=1, action='Test', severity='extreme')
    assert svc.repo.create.call_args.kwargs['severity'] == 'info'


def test_record_swallows_repo_errors():
    """A failing audit write must not bubble up — auditing is best-effort."""
    svc = AuditService()
    svc.repo = MagicMock()
    svc.repo.create.side_effect = RuntimeError('db down')
    # Should NOT raise — audit failures are silent.
    result = svc.record(user_id=1, action='Test')
    assert result is None


def test_list_filters_unknown_category_or_severity_to_none():
    svc = AuditService()
    svc.repo = MagicMock()
    svc.repo.list_for_user.return_value = ([], 0)
    svc.list(user_id=1, category='garbage', severity='garbage')
    # Both args coerced to None when invalid.
    args = svc.repo.list_for_user.call_args.kwargs
    assert args['category'] is None
    assert args['severity'] is None
