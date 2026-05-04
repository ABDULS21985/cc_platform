"""Bookmark service — business logic for saved items."""
import logging
from typing import Any, Dict, Optional, Tuple

from modules.bookmarks.models.bookmark import BOOKMARK_KINDS
from modules.bookmarks.repositories.bookmark_repository import BookmarkRepository

logger = logging.getLogger(__name__)


class BookmarkService:
    def __init__(self):
        self.repo = BookmarkRepository()

    def save(
        self,
        user_id: int,
        kind: str,
        target_ref: str,
        title: str,
        description: str = '',
        source: str = '',
        href: str = '',
        amount: Optional[str] = None,
        community_id: Optional[int] = None,
        community_name: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], int]:
        if kind not in BOOKMARK_KINDS:
            return {'error': 'Invalid kind', 'code': 'INVALID_KIND'}, 400
        existing = self.repo.find_for_user(user_id, kind, target_ref)
        if existing:
            return {'bookmark': existing.to_dict(), 'already_saved': True}, 200
        bookmark = self.repo.create(
            user_id=user_id,
            kind=kind,
            target_ref=target_ref,
            title=title,
            description=description or '',
            source=source or '',
            href=href or '',
            amount=amount,
            community_id=community_id,
            community_name=community_name,
        )
        return {'bookmark': bookmark.to_dict(), 'already_saved': False}, 201

    def list(
        self,
        user_id: int,
        limit: int = 100,
        offset: int = 0,
        kind: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], int]:
        items, total = self.repo.list_for_user(
            user_id, limit=limit, offset=offset, kind=kind if kind in BOOKMARK_KINDS else None
        )
        return {
            'bookmarks': [b.to_dict() for b in items],
            'pagination': {'total': total, 'limit': limit, 'offset': offset},
        }, 200

    def remove(self, bookmark_id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        ok = self.repo.delete(bookmark_id, user_id)
        if not ok:
            return {'error': 'Bookmark not found', 'code': 'NOT_FOUND'}, 404
        return {'deleted': True}, 200

    def remove_by_target(
        self, user_id: int, kind: str, target_ref: str
    ) -> Tuple[Dict[str, Any], int]:
        ok = self.repo.delete_by_target(user_id, kind, target_ref)
        if not ok:
            return {'error': 'Bookmark not found', 'code': 'NOT_FOUND'}, 404
        return {'deleted': True}, 200
