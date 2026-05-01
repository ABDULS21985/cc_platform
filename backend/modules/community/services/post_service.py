"""
Community Post Service
Business logic for community posts and explicit mentions.
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from modules.auth_v2.extensions import db
from modules.community.constants import CommunityPostStatus, CommunityPostType
from modules.community.models.community_post import CommunityPost
from modules.community.repositories import CommunityRepository, MemberRepository
from modules.community.repositories.post_repository import CommunityPostRepository

logger = logging.getLogger(__name__)


class CommunityPostService:
    """Service for community post operations."""

    def __init__(self):
        self.post_repo = CommunityPostRepository()
        self.community_repo = CommunityRepository()
        self.member_repo = MemberRepository()

    def create_post(self, community_id: int, author_user_id: int, data: Dict[str, Any]) -> Tuple[Optional[CommunityPost], Optional[str]]:
        """Create a community post for an active member."""
        try:
            community = self.community_repo.find_by_id(community_id)
            if not community:
                return None, 'Community not found'
            if not self.member_repo.is_member(community_id, author_user_id):
                return None, 'Only active community members can create posts'

            body = self._normalize_body(data.get('body'))
            media_urls = self._normalize_media_urls(data.get('media_urls'))
            mentioned_user_ids = self._normalize_mentioned_user_ids(data.get('mentioned_user_ids'))

            self._validate_post_content(body, media_urls)
            self._validate_mentions(community_id, mentioned_user_ids)

            post_type = data.get('post_type', CommunityPostType.POST.value)
            is_pinned = bool(data.get('is_pinned', False))
            if (post_type == CommunityPostType.ANNOUNCEMENT.value or is_pinned) and not self.member_repo.is_admin_or_owner(community_id, author_user_id):
                return None, 'Only admins or owners can create announcements or pinned posts'

            post = self.post_repo.create(
                data={
                    'community_id': community_id,
                    'author_user_id': author_user_id,
                    'body': body,
                    'media_urls': media_urls,
                    'post_type': post_type,
                    'status': CommunityPostStatus.ACTIVE.value,
                    'is_pinned': is_pinned,
                    'comments_enabled': bool(data.get('comments_enabled', True)),
                },
                mentioned_user_ids=mentioned_user_ids,
            )

            db.session.commit()
            logger.info("Created community post %s by user %s", post.id, author_user_id)
            self._handle_mentions(post)
            return self.post_repo.find_by_id(post.id), None

        except Exception as exc:
            logger.error("Error creating community post: %s", exc, exc_info=True)
            db.session.rollback()
            return None, str(exc)

    def list_posts(self, community_id: int, requester_user_id: int, args: Dict[str, Any]) -> Tuple[Optional[Tuple[List[CommunityPost], int]], Optional[str]]:
        """List active posts for a community member."""
        community = self.community_repo.find_by_id(community_id)
        if not community:
            return None, 'Community not found'
        if not self.member_repo.is_member(community_id, requester_user_id):
            return None, 'Only active community members can view posts'

        posts, total = self.post_repo.find_by_community(
            community_id=community_id,
            limit=args.get('limit', 20),
            offset=args.get('offset', 0),
            post_type=args.get('post_type'),
            pinned_only=bool(args.get('pinned_only', False)),
        )
        return (posts, total), None

    def get_post(self, post_id: int, requester_user_id: int) -> Tuple[Optional[CommunityPost], Optional[str]]:
        """Retrieve a single post if requester is an active community member."""
        post = self.post_repo.find_by_id(post_id)
        if not post or post.status != CommunityPostStatus.ACTIVE.value:
            return None, 'Post not found'
        if not self.member_repo.is_member(post.community_id, requester_user_id):
            return None, 'Only active community members can view posts'
        return post, None

    def update_post(self, post_id: int, requester_user_id: int, data: Dict[str, Any]) -> Tuple[Optional[CommunityPost], Optional[str]]:
        """Update a post as author or community admin/owner."""
        try:
            post = self.post_repo.find_by_id(post_id)
            if not post or post.status != CommunityPostStatus.ACTIVE.value:
                return None, 'Post not found'
            if not self.member_repo.is_member(post.community_id, requester_user_id):
                return None, 'Only active community members can update posts'

            is_admin = self.member_repo.is_admin_or_owner(post.community_id, requester_user_id)
            is_author = post.author_user_id == requester_user_id
            if not (is_author or is_admin):
                return None, 'Not authorized to update this post'

            body = self._normalize_body(data['body']) if 'body' in data else post.body
            media_urls = self._normalize_media_urls(data['media_urls']) if 'media_urls' in data else (post.media_urls or [])
            mentioned_user_ids = self._normalize_mentioned_user_ids(data['mentioned_user_ids']) if 'mentioned_user_ids' in data else [mention.mentioned_user_id for mention in post.mentions]
            self._validate_post_content(body, media_urls)
            self._validate_mentions(post.community_id, mentioned_user_ids)

            if 'post_type' in data and data['post_type'] != post.post_type and not is_admin:
                return None, 'Only admins or owners can change post type'
            if 'is_pinned' in data and bool(data['is_pinned']) != post.is_pinned and not is_admin:
                return None, 'Only admins or owners can pin or unpin posts'

            post.body = body
            post.media_urls = media_urls
            post.comments_enabled = bool(data['comments_enabled']) if 'comments_enabled' in data else post.comments_enabled
            post.post_type = data.get('post_type', post.post_type)
            post.is_pinned = bool(data['is_pinned']) if 'is_pinned' in data else post.is_pinned
            post.edited_at = datetime.utcnow()
            self.post_repo.replace_mentions(post, mentioned_user_ids)

            db.session.commit()
            logger.info("Updated community post %s by user %s", post.id, requester_user_id)
            self._handle_mentions(post)
            return self.post_repo.find_by_id(post.id), None

        except Exception as exc:
            logger.error("Error updating community post %s: %s", post_id, exc, exc_info=True)
            db.session.rollback()
            return None, str(exc)

    def delete_post(self, post_id: int, requester_user_id: int) -> Tuple[bool, Optional[str]]:
        """Soft delete a post as author or community admin/owner."""
        try:
            post = self.post_repo.find_by_id(post_id)
            if not post or post.status != CommunityPostStatus.ACTIVE.value:
                return False, 'Post not found'
            if not self.member_repo.is_member(post.community_id, requester_user_id):
                return False, 'Only active community members can delete posts'

            is_admin = self.member_repo.is_admin_or_owner(post.community_id, requester_user_id)
            is_author = post.author_user_id == requester_user_id
            if not (is_author or is_admin):
                return False, 'Not authorized to delete this post'

            self.post_repo.soft_delete(post)
            db.session.commit()
            logger.info("Deleted community post %s by user %s", post.id, requester_user_id)
            return True, None

        except Exception as exc:
            logger.error("Error deleting community post %s: %s", post_id, exc, exc_info=True)
            db.session.rollback()
            return False, str(exc)

    def _normalize_body(self, body: Optional[str]) -> Optional[str]:
        if body is None:
            return None
        cleaned = body.strip()
        return cleaned or None

    def _normalize_media_urls(self, media_urls: Optional[List[str]]) -> List[str]:
        if not media_urls:
            return []
        return [url.strip() for url in media_urls if isinstance(url, str) and url.strip()]

    def _normalize_mentioned_user_ids(self, mentioned_user_ids: Optional[List[int]]) -> List[int]:
        if not mentioned_user_ids:
            return []
        deduped: List[int] = []
        seen = set()
        for user_id in mentioned_user_ids:
            if user_id in seen:
                continue
            seen.add(user_id)
            deduped.append(user_id)
        return deduped

    def _validate_post_content(self, body: Optional[str], media_urls: List[str]) -> None:
        if not body and not media_urls:
            raise ValueError('Post must contain body text or at least one media URL')

    def _validate_mentions(self, community_id: int, mentioned_user_ids: List[int]) -> None:
        for user_id in mentioned_user_ids:
            if not self.member_repo.is_member(community_id, user_id):
                raise ValueError(f'User {user_id} is not an active member of this community')

    def _handle_mentions(self, post: CommunityPost) -> None:
        """Internal seam for future mention notifications."""
        mentioned_user_ids = [mention.mentioned_user_id for mention in post.mentions]
        if mentioned_user_ids:
            logger.info("Post %s stored explicit mentions for users %s", post.id, mentioned_user_ids)
