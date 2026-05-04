"""Notification service — business logic for in-app notifications."""
import logging
from typing import Optional, Tuple, Dict, Any

from modules.notifications.models.notification import CATEGORIES
from modules.notifications.repositories.notification_repository import NotificationRepository

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        self.repo = NotificationRepository()

    def create_for_user(
        self,
        user_id: int,
        title: str,
        body: str = '',
        category: str = 'system',
        source: str = 'System',
        action_href: Optional[str] = None,
        action_label: Optional[str] = None,
        amount_value: Optional[str] = None,
        amount_direction: Optional[str] = None,
        initials: Optional[str] = None,
    ):
        if category not in CATEGORIES:
            category = 'system'
        notif = self.repo.create(
            user_id=user_id,
            category=category,
            title=title,
            body=body or '',
            source=source or 'System',
            action_href=action_href,
            action_label=action_label,
            amount_value=amount_value,
            amount_direction=amount_direction,
            initials=initials,
        )
        # Best-effort: push the new notification to the user's Socket.IO room.
        # Sockets are subscribed via the `join_notifications` event after auth.
        try:
            from extension.extensions import get_socketio
            sio = get_socketio()
            if sio is not None:
                unread = self.repo.count_unread(user_id)
                sio.emit(
                    'notification_created',
                    {'notification': notif.to_dict(), 'unread_count': unread},
                    room=f'notifications_{user_id}',
                )
        except Exception as exc:
            logger.debug('socket emit for notification failed: %s', exc)
        return notif

    def list(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
        category: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], int]:
        items, total = self.repo.list_for_user(
            user_id=user_id,
            limit=limit,
            offset=offset,
            unread_only=unread_only,
            category=category if category in CATEGORIES else None,
        )
        unread_count = self.repo.count_unread(user_id)
        return {
            'notifications': [n.to_dict() for n in items],
            'pagination': {'total': total, 'limit': limit, 'offset': offset},
            'unread_count': unread_count,
        }, 200

    def mark_read(self, notification_id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        notif = self.repo.mark_read(notification_id, user_id)
        if not notif:
            return {'error': 'Notification not found', 'code': 'NOT_FOUND'}, 404
        return {'notification': notif.to_dict()}, 200

    def mark_all_read(self, user_id: int) -> Tuple[Dict[str, Any], int]:
        n = self.repo.mark_all_read(user_id)
        return {'updated': n}, 200

    def delete(self, notification_id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        ok = self.repo.delete(notification_id, user_id)
        if not ok:
            return {'error': 'Notification not found', 'code': 'NOT_FOUND'}, 404
        return {'deleted': True}, 200
