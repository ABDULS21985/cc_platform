"""Bookmark repository — data access only."""
from typing import List, Optional, Tuple

from sqlalchemy import desc

from modules.auth_v2.extensions import db
from modules.bookmarks.models.bookmark import Bookmark


class BookmarkRepository:
    def create(self, **kwargs) -> Bookmark:
        b = Bookmark(**kwargs)
        db.session.add(b)
        db.session.commit()
        return b

    def find_by_id(self, bookmark_id: int) -> Optional[Bookmark]:
        return Bookmark.query.filter_by(id=bookmark_id).first()

    def find_for_user(
        self, user_id: int, kind: str, target_ref: str
    ) -> Optional[Bookmark]:
        return Bookmark.query.filter_by(
            user_id=user_id, kind=kind, target_ref=target_ref
        ).first()

    def list_for_user(
        self,
        user_id: int,
        limit: int = 100,
        offset: int = 0,
        kind: Optional[str] = None,
    ) -> Tuple[List[Bookmark], int]:
        query = Bookmark.query.filter_by(user_id=user_id)
        if kind:
            query = query.filter_by(kind=kind)
        total = query.count()
        items = (
            query.order_by(desc(Bookmark.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def delete(self, bookmark_id: int, user_id: int) -> bool:
        b = Bookmark.query.filter_by(id=bookmark_id, user_id=user_id).first()
        if not b:
            return False
        db.session.delete(b)
        db.session.commit()
        return True

    def delete_by_target(self, user_id: int, kind: str, target_ref: str) -> bool:
        b = self.find_for_user(user_id, kind, target_ref)
        if not b:
            return False
        db.session.delete(b)
        db.session.commit()
        return True
