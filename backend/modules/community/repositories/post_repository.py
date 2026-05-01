"""
Community Post Repository
Data access layer for community feed posts and mentions.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import joinedload, selectinload

from modules.auth_v2.extensions import db
from modules.community.constants import CommunityPostStatus
from modules.community.models.community_post import CommunityPost, CommunityPostMention

logger = logging.getLogger(__name__)


class CommunityPostRepository:
    """Repository for community post operations."""

    def _base_query(self):
        return CommunityPost.query.options(
            joinedload(CommunityPost.author),
            selectinload(CommunityPost.mentions).joinedload(CommunityPostMention.mentioned_user),
        )

    def create(self, data: Dict[str, Any], mentioned_user_ids: List[int]) -> CommunityPost:
        """Create a post and its explicit mentions."""
        post = CommunityPost(
            community_id=data['community_id'],
            author_user_id=data['author_user_id'],
            body=data.get('body'),
            media_urls=data.get('media_urls') or [],
            post_type=data.get('post_type', 'post'),
            status=data.get('status', CommunityPostStatus.ACTIVE.value),
            is_pinned=data.get('is_pinned', False),
            comments_enabled=data.get('comments_enabled', True),
        )
        db.session.add(post)
        db.session.flush()
        self.replace_mentions(post, mentioned_user_ids)
        logger.info("Created community post %s in community %s", post.id, post.community_id)
        return post

    def find_by_id(self, post_id: int) -> Optional[CommunityPost]:
        """Find a post by id with author and mention relationships loaded."""
        return self._base_query().filter(CommunityPost.id == post_id).first()

    def find_by_community(
        self,
        community_id: int,
        limit: int = 20,
        offset: int = 0,
        post_type: Optional[str] = None,
        pinned_only: bool = False,
        status: str = CommunityPostStatus.ACTIVE.value,
    ) -> Tuple[List[CommunityPost], int]:
        """List posts for a community ordered with pinned posts first."""
        query = self._base_query().filter(CommunityPost.community_id == community_id)
        if status:
            query = query.filter(CommunityPost.status == status)
        if post_type:
            query = query.filter(CommunityPost.post_type == post_type)
        if pinned_only:
            query = query.filter(CommunityPost.is_pinned.is_(True))

        total = query.count()
        posts = query.order_by(
            CommunityPost.is_pinned.desc(),
            CommunityPost.created_at.desc(),
        ).offset(offset).limit(limit).all()
        return posts, total

    def replace_mentions(self, post: CommunityPost, mentioned_user_ids: List[int]) -> None:
        """Replace explicit mentions for a post."""
        post.mentions.clear()
        for user_id in mentioned_user_ids:
            post.mentions.append(CommunityPostMention(mentioned_user_id=user_id))
        db.session.flush()

    def soft_delete(self, post: CommunityPost) -> CommunityPost:
        """Soft delete a post."""
        post.status = CommunityPostStatus.DELETED.value
        post.is_pinned = False
        db.session.flush()
        return post
