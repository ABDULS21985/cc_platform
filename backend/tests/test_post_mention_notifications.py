"""Unit tests for post mention notification side effects."""
from types import SimpleNamespace
from unittest.mock import MagicMock

from modules.community.services.post_service import CommunityPostService


def test_handle_mentions_creates_notifications_and_skips_author(monkeypatch):
    notif_service = MagicMock()

    class _NotificationService:
        def __new__(cls):
            return notif_service

    monkeypatch.setattr(
        "modules.notifications.services.notification_service.NotificationService",
        _NotificationService,
    )

    post = SimpleNamespace(
        id=99,
        community_id=5,
        author_user_id=10,
        author=SimpleNamespace(full_name="Ada Lovelace"),
        community=SimpleNamespace(name="Estate Circle"),
    )

    CommunityPostService()._handle_mentions(post, mentioned_user_ids=[10, 20, 21])

    assert notif_service.create_for_user.call_count == 2
    notified_user_ids = [
        call.kwargs["user_id"] for call in notif_service.create_for_user.call_args_list
    ]
    assert notified_user_ids == [20, 21]
    assert notif_service.create_for_user.call_args_list[0].kwargs["category"] == "communities"
