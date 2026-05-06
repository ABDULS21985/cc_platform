"""Notification repository — data access only."""
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import desc

from modules.auth_v2.extensions import db
from modules.notifications.models.notification import Notification
from modules.notifications.models.preference import NotificationPreference
from modules.notifications.models.community_mute import CommunityMute
from sqlalchemy import func as sa_func


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
        community_id: Optional[int] = None,
    ) -> Tuple[List[Notification], int]:
        query = Notification.query.filter_by(user_id=user_id)
        if unread_only:
            query = query.filter_by(is_read=False)
        if category:
            query = query.filter_by(category=category)
        if community_id is not None:
            query = query.filter_by(community_id=community_id)
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

    def count_unread_for_community(self, user_id: int, community_id: int) -> int:
        return Notification.query.filter_by(
            user_id=user_id,
            community_id=community_id,
            is_read=False,
        ).count()

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

    def get_or_create_preferences(self, user_id: int) -> NotificationPreference:
        pref = NotificationPreference.query.filter_by(user_id=user_id).first()
        if pref is None:
            pref = NotificationPreference(user_id=user_id)
            db.session.add(pref)
            db.session.commit()
        return pref

    def count_unread_by_category(self, user_id: int) -> dict:
        """Return {category: int} for unread notifications.

        Categories with zero unread are omitted from the result; the caller
        should treat missing keys as 0.
        """
        rows = (
            db.session.query(Notification.category, sa_func.count(Notification.id))
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .group_by(Notification.category)
            .all()
        )
        return {category: int(count) for category, count in rows}

    def list_muted_community_ids(self, user_id: int) -> list[int]:
        rows = (
            db.session.query(CommunityMute.community_id)
            .filter(CommunityMute.user_id == user_id)
            .all()
        )
        return [r[0] for r in rows]

    def is_community_muted(self, user_id: int, community_id: int) -> bool:
        return (
            CommunityMute.query.filter_by(user_id=user_id, community_id=community_id).first()
            is not None
        )

    def mute_community(self, user_id: int, community_id: int) -> CommunityMute:
        existing = CommunityMute.query.filter_by(
            user_id=user_id, community_id=community_id
        ).first()
        if existing:
            return existing
        mute = CommunityMute(user_id=user_id, community_id=community_id)
        db.session.add(mute)
        db.session.commit()
        return mute

    def unmute_community(self, user_id: int, community_id: int) -> bool:
        mute = CommunityMute.query.filter_by(
            user_id=user_id, community_id=community_id
        ).first()
        if not mute:
            return False
        db.session.delete(mute)
        db.session.commit()
        return True

    def update_preferences(self, user_id: int, **flags) -> NotificationPreference:
        pref = self.get_or_create_preferences(user_id)
        # Map external category names to model column names.
        column_map = {
            'money': 'money_enabled',
            'bills': 'bills_enabled',
            'communities': 'communities_enabled',
            'events': 'events_enabled',
            'system': 'system_enabled',
        }
        channel_columns = {'channel_email', 'channel_sms', 'channel_push'}
        for category, value in flags.items():
            if category == 'digest_frequency' and isinstance(value, str):
                if value in ('off', 'daily', 'weekly'):
                    pref.digest_frequency = value
                continue
            if category in channel_columns and isinstance(value, bool):
                setattr(pref, category, value)
                continue
            col = column_map.get(category)
            if col and isinstance(value, bool):
                setattr(pref, col, value)
        db.session.commit()
        return pref
