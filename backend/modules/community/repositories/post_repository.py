"""
Community Post Repository
Data access layer for community feed posts and mentions.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import joinedload, selectinload

from modules.auth_v2.extensions import db
from modules.community.constants import CommunityPostStatus
from modules.community.models.community_post import (
    CommunityPost,
    CommunityPostComment,
    CommunityPostMention,
    CommunityPostReaction,
)

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
        sort: str = 'recent',
    ) -> Tuple[List[CommunityPost], int]:
        """List posts for a community with pluggable ordering.

        Sort options:
            ``recent``  (default) — pinned-first, then ``created_at`` desc.
            ``newest``  — strict ``created_at`` desc; pinned posts are NOT
                          floated to the top so the FE can render a strict
                          chronological view.
            ``popular`` — weighted score ``reactions_count + comments_count * 2``
                          over the last 14 days, with ``created_at`` desc as
                          the tiebreaker.

        Args:
            community_id: Owning community.
            limit/offset: Pagination window.
            post_type: Optional post-type filter (post / announcement / …).
            pinned_only: If True, restrict the result set to pinned posts.
            status: Status filter (defaults to active).
            sort: One of ``recent`` | ``newest`` | ``popular``.

        Returns:
            ``(posts, total)`` — total reflects the filtered set so the FE
            can render `total` and `has_more` for infinite scroll.
        """
        query = self._base_query().filter(CommunityPost.community_id == community_id)
        if status:
            query = query.filter(CommunityPost.status == status)
        if post_type:
            query = query.filter(CommunityPost.post_type == post_type)
        if pinned_only:
            query = query.filter(CommunityPost.is_pinned.is_(True))

        sort = (sort or 'recent').lower()

        if sort == 'newest':
            # Strict chronological — exclude the pinned-first bias so this
            # variant can power "All posts in chronological order" UIs.
            query = query.filter(CommunityPost.is_pinned.is_(False))
            total = query.count()
            posts = (
                query.order_by(CommunityPost.created_at.desc(), CommunityPost.id.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return posts, total

        if sort == 'popular':
            # Weighted score over the last 14 days; subqueries are filtered
            # to the same window so we don't return stale-but-popular posts.
            window_start = datetime.utcnow() - timedelta(days=14)
            query = query.filter(CommunityPost.created_at >= window_start)

            reactions_subq = (
                db.session.query(
                    CommunityPostReaction.post_id.label('post_id'),
                    func.count(CommunityPostReaction.id).label('cnt'),
                )
                .group_by(CommunityPostReaction.post_id)
                .subquery()
            )
            comments_subq = (
                db.session.query(
                    CommunityPostComment.post_id.label('post_id'),
                    func.count(CommunityPostComment.id).label('cnt'),
                )
                .filter(CommunityPostComment.status == CommunityPostStatus.ACTIVE.value)
                .group_by(CommunityPostComment.post_id)
                .subquery()
            )

            query = (
                query.outerjoin(reactions_subq, reactions_subq.c.post_id == CommunityPost.id)
                .outerjoin(comments_subq, comments_subq.c.post_id == CommunityPost.id)
            )
            score_expr = (
                func.coalesce(reactions_subq.c.cnt, 0)
                + func.coalesce(comments_subq.c.cnt, 0) * 2
            )

            total = query.count()
            posts = (
                query.order_by(
                    score_expr.desc(),
                    CommunityPost.created_at.desc(),
                    CommunityPost.id.desc(),
                )
                .offset(offset)
                .limit(limit)
                .all()
            )
            return posts, total

        # Default: pinned-first then chronological.
        total = query.count()
        posts = (
            query.order_by(
                CommunityPost.is_pinned.desc(),
                CommunityPost.created_at.desc(),
                CommunityPost.id.desc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )
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

    def create_comment(self, post_id: int, author_user_id: int, body: str) -> CommunityPostComment:
        """Create a persisted post comment."""
        comment = CommunityPostComment(
            post_id=post_id,
            author_user_id=author_user_id,
            body=body,
            status=CommunityPostStatus.ACTIVE.value,
        )
        db.session.add(comment)
        db.session.flush()
        logger.info("Created community post comment %s on post %s", comment.id, post_id)
        return comment

    def find_comment_by_id(self, comment_id: int) -> Optional[CommunityPostComment]:
        """Find a comment by id with author and post loaded."""
        return (
            CommunityPostComment.query.options(
                joinedload(CommunityPostComment.author),
                joinedload(CommunityPostComment.post),
            )
            .filter(CommunityPostComment.id == comment_id)
            .first()
        )

    def find_comments_by_post(
        self,
        post_id: int,
        limit: int = 20,
        offset: int = 0,
        status: str = CommunityPostStatus.ACTIVE.value,
    ) -> Tuple[List[CommunityPostComment], int]:
        """List comments for a post oldest-first for conversation readability."""
        query = CommunityPostComment.query.options(
            joinedload(CommunityPostComment.author),
        ).filter(CommunityPostComment.post_id == post_id)
        if status:
            query = query.filter(CommunityPostComment.status == status)

        total = query.count()
        comments = (
            query.order_by(CommunityPostComment.created_at.asc(), CommunityPostComment.id.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return comments, total

    def soft_delete_comment(self, comment: CommunityPostComment) -> CommunityPostComment:
        """Soft delete a comment."""
        comment.status = CommunityPostStatus.DELETED.value
        db.session.flush()
        return comment

    def find_reaction(
        self,
        post_id: int,
        user_id: int,
        reaction_type: str = 'like',
    ) -> Optional[CommunityPostReaction]:
        """Find a user's reaction for a post."""
        return CommunityPostReaction.query.filter_by(
            post_id=post_id,
            user_id=user_id,
            reaction_type=reaction_type,
        ).first()

    def create_reaction(
        self,
        post_id: int,
        user_id: int,
        reaction_type: str = 'like',
    ) -> CommunityPostReaction:
        """Create a post reaction."""
        reaction = CommunityPostReaction(
            post_id=post_id,
            user_id=user_id,
            reaction_type=reaction_type,
        )
        db.session.add(reaction)
        db.session.flush()
        logger.info("Created community post reaction %s on post %s", reaction.id, post_id)
        return reaction

    def delete_reaction(self, reaction: CommunityPostReaction) -> None:
        """Remove a post reaction."""
        db.session.delete(reaction)
        db.session.flush()

    def count_reactions(self, post_id: int) -> int:
        """Count all reactions for a post."""
        return CommunityPostReaction.query.filter_by(post_id=post_id).count()
