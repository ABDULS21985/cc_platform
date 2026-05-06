"""
Community Post Service
Business logic for community posts and explicit mentions.
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from modules.auth_v2.extensions import db
from modules.community.constants import (
    CommunityPostReactionType,
    CommunityPostStatus,
    CommunityPostType,
)
from modules.community.models.community_post import CommunityPost, CommunityPostComment
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
            self._handle_mentions(post, mentioned_user_ids=mentioned_user_ids)
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
            sort=(args.get('sort') or 'recent'),
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

    def list_comments(self, post_id: int, requester_user_id: int, args: Dict[str, Any]) -> Tuple[Optional[Tuple[List[CommunityPostComment], int]], Optional[str]]:
        """List persisted comments for a post if requester can view the post."""
        post, error = self.get_post(post_id, requester_user_id)
        if error:
            return None, error

        comments, total = self.post_repo.find_comments_by_post(
            post_id=post.id,
            limit=args.get('limit', 20),
            offset=args.get('offset', 0),
        )
        return (comments, total), None

    def create_comment(self, post_id: int, author_user_id: int, data: Dict[str, Any]) -> Tuple[Optional[CommunityPostComment], Optional[str]]:
        """Create a persisted comment on a post."""
        try:
            post, error = self.get_post(post_id, author_user_id)
            if error:
                return None, error
            if not post.comments_enabled:
                return None, 'Comments are disabled for this post'

            body = self._normalize_body(data.get('body'))
            if not body:
                return None, 'Comment must contain body text'

            comment = self.post_repo.create_comment(
                post_id=post.id,
                author_user_id=author_user_id,
                body=body,
            )
            db.session.commit()
            logger.info("Created community post comment %s by user %s", comment.id, author_user_id)
            return self.post_repo.find_comment_by_id(comment.id), None

        except Exception as exc:
            logger.error("Error creating comment for post %s: %s", post_id, exc, exc_info=True)
            db.session.rollback()
            return None, str(exc)

    def delete_comment(self, comment_id: int, requester_user_id: int) -> Tuple[bool, Optional[str]]:
        """Soft delete a comment as author or community admin/owner."""
        try:
            comment = self.post_repo.find_comment_by_id(comment_id)
            if not comment or comment.status != CommunityPostStatus.ACTIVE.value or not comment.post:
                return False, 'Comment not found'
            post = comment.post
            if post.status != CommunityPostStatus.ACTIVE.value:
                return False, 'Post not found'
            if not self.member_repo.is_member(post.community_id, requester_user_id):
                return False, 'Only active community members can delete comments'

            is_admin = self.member_repo.is_admin_or_owner(post.community_id, requester_user_id)
            is_author = comment.author_user_id == requester_user_id
            if not (is_author or is_admin):
                return False, 'Not authorized to delete this comment'

            self.post_repo.soft_delete_comment(comment)
            db.session.commit()
            logger.info("Deleted community post comment %s by user %s", comment.id, requester_user_id)
            return True, None

        except Exception as exc:
            logger.error("Error deleting comment %s: %s", comment_id, exc, exc_info=True)
            db.session.rollback()
            return False, str(exc)

    def toggle_reaction(self, post_id: int, user_id: int, data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Toggle the current user's reaction on a post and return authoritative counts."""
        try:
            post, error = self.get_post(post_id, user_id)
            if error:
                return None, error

            reaction_type = self._normalize_reaction_type(data.get('reaction_type'))
            existing = self.post_repo.find_reaction(post.id, user_id, reaction_type)
            reacted = existing is None
            if existing:
                self.post_repo.delete_reaction(existing)
            else:
                self.post_repo.create_reaction(post.id, user_id, reaction_type)

            db.session.commit()
            reactions_count = self.post_repo.count_reactions(post.id)
            return {
                'post_id': post.id,
                'reaction_type': reaction_type,
                'reacted': reacted,
                'reactions_count': reactions_count,
            }, None

        except Exception as exc:
            logger.error("Error toggling reaction for post %s: %s", post_id, exc, exc_info=True)
            db.session.rollback()
            return None, str(exc)

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
            previous_mentioned_user_ids = {mention.mentioned_user_id for mention in post.mentions}
            mentioned_user_ids = self._normalize_mentioned_user_ids(data['mentioned_user_ids']) if 'mentioned_user_ids' in data else list(previous_mentioned_user_ids)
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
            new_mentions = [
                user_id for user_id in mentioned_user_ids
                if user_id not in previous_mentioned_user_ids
            ]
            self._handle_mentions(post, mentioned_user_ids=new_mentions)
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

    def _normalize_reaction_type(self, reaction_type: Optional[str]) -> str:
        value = (reaction_type or CommunityPostReactionType.LIKE.value).strip().lower()
        if value not in CommunityPostReactionType.values():
            raise ValueError(f'Unsupported reaction type: {value}')
        return value

    def _validate_post_content(self, body: Optional[str], media_urls: List[str]) -> None:
        if not body and not media_urls:
            raise ValueError('Post must contain body text or at least one media URL')

    def _validate_mentions(self, community_id: int, mentioned_user_ids: List[int]) -> None:
        for user_id in mentioned_user_ids:
            if not self.member_repo.is_member(community_id, user_id):
                raise ValueError(f'User {user_id} is not an active member of this community')

    def _handle_mentions(self, post: CommunityPost, mentioned_user_ids: List[int]) -> None:
        """Fan-out hook for explicit @-mentions on a post.

        Records a per-user audit-log entry for each mentioned user via
        :class:`AuditService` so the activity surfaces in the recipient's
        Activity Log (community category). Also emits a structured
        ``community.post.mentions`` log so the eventual notification
        fan-out (deferred to a later round — see ``TODO(round-3)`` below) is
        easy to wire.

        The notifications-module call is wrapped in a defensive try/except so
        a failing inbox dispatch never bubbles up into post creation.
        """
        recipients = [user_id for user_id in mentioned_user_ids if user_id != post.author_user_id]
        if not recipients:
            return

        # Structured info log — single source of truth for downstream replay.
        logger.info(
            'community.post.mentions',
            extra={
                'event': 'community.post.mentions',
                'post_id': post.id,
                'community_id': post.community_id,
                'author_user_id': post.author_user_id,
                'mentioned_user_ids': recipients,
                'mention_count': len(recipients),
            },
        )

        # Best-effort audit fan-out. Lazy import so this module stays
        # importable even if AuditService is temporarily unavailable.
        try:
            from modules.audit.services.audit_service import AuditService

            audit_service = AuditService()
            author_label = (
                post.author.full_name if getattr(post, 'author', None) else str(post.author_user_id)
            )
            for mentioned_user_id in recipients:
                try:
                    audit_service.record(
                        user_id=int(mentioned_user_id),
                        category='community',
                        severity='info',
                        action='mentioned_in_post',
                        actor=author_label,
                        target=f'post:{post.id}',
                        details=(
                            f'Mentioned by user {post.author_user_id} '
                            f'in community {post.community_id}, post {post.id}'
                        ),
                    )
                except Exception as audit_exc:  # noqa: BLE001
                    logger.warning(
                        'Failed to record mention audit for user %s on post %s: %s',
                        mentioned_user_id,
                        post.id,
                        audit_exc,
                    )
        except Exception as import_exc:  # noqa: BLE001
            logger.info(
                'community.post.mentions.audit_skipped',
                extra={
                    'event': 'community.post.mentions.audit_skipped',
                    'post_id': post.id,
                    'reason': str(import_exc),
                    'mentioned_user_ids': recipients,
                },
            )

        # Best-effort in-app notification fan-out. The in-app notifications
        # module is the long-term home for this; we keep the call here behind
        # a try/except so a partial outage in that module never breaks post
        # creation. See TODO below for the hardened fan-out.
        try:
            from modules.notifications.services.notification_service import NotificationService

            author_name = post.author.full_name if post.author else 'A member'
            community_name = post.community.name if post.community else 'your community'
            service = NotificationService()
            for user_id in recipients:
                service.create_for_user(
                    user_id=user_id,
                    title=f"{author_name} mentioned you",
                    body=f"{author_name} mentioned you in {community_name}.",
                    category='communities',
                    source=community_name,
                    action_href=f"/dashboard/community/{post.community_id}/posts/{post.id}",
                    community_id=post.community_id,
                )
            logger.info("Post %s notified mentioned users %s", post.id, recipients)
        except Exception as exc:  # noqa: BLE001
            logger.warning("post mention notification failed for post %s: %s", post.id, exc)

        # TODO(round-3): create Notification rows once notifications module
        # work lands so the @-tagged user receives a guaranteed in-app + push
        # fan-out (the call above is best-effort; this round we additionally
        # rely on the audit row + structured logs above).
        logger.info(
            'community.post.mentions.notify_pending',
            extra={
                'event': 'community.post.mentions.notify_pending',
                'post_id': post.id,
                'community_id': post.community_id,
                'mentioned_user_ids': recipients,
            },
        )
