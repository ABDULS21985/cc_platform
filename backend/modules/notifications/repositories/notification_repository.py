"""Notification repository — data access only."""
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import desc

from modules.auth_v2.extensions import db
from modules.notifications.models.notification import Notification


class NotificationRepository:
    def create(self, **kwargs) -> Notification:
        notif = Notification(**kwargs)
        db.session.add(notif)
        db.session.commit()
        return notif

    def find_by_id(self, notification_id: int) -> Optional[Notification]:
        return Notification.query.filter_by(id=notification_id).first()

    def list_for_user(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
        category: Optional[str] = None,
    ) -> Tuple[List[Notification], int]:
        query = Notification.query.filter_by(user_id=user_id)
        if unread_only:
            query = query.filter_by(is_read=False)
        if category:
            query = query.filter_by(category=category)
        total = query.count()
        items = (
            query.order_by(desc(Notification.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def count_unread(self, user_id: int) -> int:
        return Notification.query.filter_by(user_id=user_id, is_read=False).count()

    def mark_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        if not notif:
            return None
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = datetime.utcnow()
            db.session.commit()
        return notif

    def mark_all_read(self, user_id: int) -> int:
        now = datetime.utcnow()
        rows = (
            Notification.query.filter_by(user_id=user_id, is_read=False)
            .update({'is_read': True, 'read_at': now}, synchronize_session=False)
        )
        db.session.commit()
        return rows

    def delete(self, notification_id: int, user_id: int) -> bool:
        notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        if not notif:
            return False
        db.session.delete(notif)
        db.session.commit()
        return True
