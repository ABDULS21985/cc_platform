"""
Subscription Repository — DB queries for the subscriptions table.
"""
import logging
from datetime import datetime
from typing import List, Optional

from modules.auth_v2.extensions import db
from modules.subscriptions.models.subscription import Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


class SubscriptionRepository:
    def create(self, **kwargs) -> Subscription:
        item = Subscription(**kwargs)
        db.session.add(item)
        db.session.commit()
        return item

    def find_by_id(self, sub_id: int) -> Optional[Subscription]:
        return Subscription.query.filter_by(id=sub_id).first()

    def list_for_user(
        self,
        user_id: int,
        kind: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Subscription]:
        q = Subscription.query.filter_by(user_id=user_id)
        if kind:
            q = q.filter(Subscription.kind == kind)
        if status:
            q = q.filter(Subscription.status == status)
        q = q.order_by(Subscription.next_charge_at.asc().nulls_last())
        return q.offset(offset).limit(limit).all()

    def find_due(
        self,
        limit: int = 100,
        now: Optional[datetime] = None,
        for_update: bool = False,
    ) -> List[Subscription]:
        """Return active subscriptions whose next_charge_at is due (<= now).

        When `for_update=True` and the dialect is PostgreSQL, rows are locked
        via `SELECT ... FOR UPDATE SKIP LOCKED` so concurrent cron workers
        do not pick up the same row. On other dialects (e.g. SQLite used in
        tests) it falls back to a plain SELECT — that is acceptable because
        SQLite is single-writer.
        """
        if now is None:
            now = datetime.utcnow()

        q = (
            Subscription.query.filter(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.next_charge_at.isnot(None),
                Subscription.next_charge_at <= now,
            )
            .order_by(Subscription.next_charge_at.asc(), Subscription.id.asc())
            .limit(limit)
        )

        if for_update:
            try:
                bind = db.session.get_bind()
                dialect = getattr(getattr(bind, 'dialect', None), 'name', '')
                if dialect == 'postgresql':
                    q = q.with_for_update(skip_locked=True)
            except Exception:
                logger.debug(
                    "find_due: skipping FOR UPDATE SKIP LOCKED",
                    exc_info=True,
                )

        return q.all()

    # Backwards-compatible alias previously used by callers.
    def list_due_active(self, now: datetime, limit: int = 100) -> List[Subscription]:
        return self.find_due(limit=limit, now=now, for_update=True)

    def update(self, sub_id: int, **kwargs) -> Optional[Subscription]:
        item = self.find_by_id(sub_id)
        if not item:
            return None
        for key, value in kwargs.items():
            if hasattr(item, key):
                setattr(item, key, value)
        db.session.commit()
        db.session.refresh(item)
        return item

    def delete(self, sub_id: int) -> bool:
        item = self.find_by_id(sub_id)
        if not item:
            return False
        db.session.delete(item)
        db.session.commit()
        return True
