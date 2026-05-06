"""
Subscription Repository — DB queries for the subscriptions table.
"""
from typing import List, Optional

from modules.auth_v2.extensions import db
from modules.subscriptions.models.subscription import Subscription


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

    def update(self, sub_id: int, **kwargs) -> Optional[Subscription]:
        item = self.find_by_id(sub_id)
        if not item:
            return None
        for key, value in kwargs.items():
            if hasattr(item, key) and value is not None:
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
