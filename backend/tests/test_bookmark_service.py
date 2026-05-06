"""Unit tests for BookmarkService — kind validation and dedup behavior."""

from unittest.mock import MagicMock

from modules.bookmarks.services.bookmark_service import BookmarkService


def _make_service(*, existing=None):
    svc = BookmarkService()
    svc.repo = MagicMock()
    svc.repo.find_for_user.return_value = existing
    svc.repo.create.return_value = MagicMock(to_dict=lambda: {'id': 7})
    svc.repo.delete.return_value = True
    svc.repo.delete_by_target.return_value = True
    return svc


def test_save_rejects_invalid_kind():
    svc = _make_service()
    result, status = svc.save(
        user_id=1,
        kind='wallet-balance',  # not in BOOKMARK_KINDS
        target_ref='x',
        title='Test',
    )
    assert status == 400
    assert result['code'] == 'INVALID_KIND'
    svc.repo.create.assert_not_called()


def test_save_creates_when_missing():
    svc = _make_service(existing=None)
    result, status = svc.save(
        user_id=1, kind='post', target_ref='post-12', title='Hello',
    )
    assert status == 201
    assert result['already_saved'] is False
    svc.repo.create.assert_called_once()


def test_save_accepts_member_kind():
    svc = _make_service(existing=None)
    result, status = svc.save(
        user_id=1, kind='member', target_ref='member:12', title='Ada Member',
    )
    assert status == 201
    assert result['already_saved'] is False
    svc.repo.create.assert_called_once()


def test_save_dedupes_existing():
    """Saving the same target twice should NOT create a second row."""
    existing = MagicMock(to_dict=lambda: {'id': 5})
    svc = _make_service(existing=existing)
    result, status = svc.save(
        user_id=1, kind='post', target_ref='post-12', title='Hello',
    )
    assert status == 200
    assert result['already_saved'] is True
    svc.repo.create.assert_not_called()


def test_remove_returns_404_when_missing():
    svc = BookmarkService()
    svc.repo = MagicMock()
    svc.repo.delete.return_value = False
    result, status = svc.remove(bookmark_id=99, user_id=1)
    assert status == 404


def test_list_filters_unknown_kind_to_none():
    svc = BookmarkService()
    svc.repo = MagicMock()
    svc.repo.list_for_user.return_value = ([], 0)
    svc.list(user_id=1, kind='nonsense')
    assert svc.repo.list_for_user.call_args.kwargs['kind'] is None
