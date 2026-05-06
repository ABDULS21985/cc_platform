"""Event service — business logic."""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from modules.community.models.community_member import CommunityMember
from modules.events.repositories.event_repository import EventRepository

logger = logging.getLogger(__name__)


class EventService:
    def __init__(self):
        self.repo = EventRepository()

    def create(
        self,
        creator_id: int,
        title: str,
        starts_at: datetime,
        community_id: Optional[int] = None,
        ends_at: Optional[datetime] = None,
        description: str = '',
        category: Optional[str] = None,
        location: str = '',
        is_online: bool = False,
        is_private: bool = False,
        capacity: int = 0,
        ticket_price: Optional[str] = None,
        duration_label: Optional[str] = None,
        cover_image: Optional[str] = None,
        auto_approve_members: bool = False,
    ) -> Tuple[Dict[str, Any], int]:
        if community_id:
            membership = CommunityMember.query.filter_by(
                community_id=community_id, user_id=creator_id
            ).first()
            if not membership:
                return {'error': 'You must be a community member to host an event there', 'code': 'FORBIDDEN'}, 403
        event = self.repo.create(
            community_id=community_id,
            creator_id=creator_id,
            title=title,
            description=description or '',
            category=category,
            starts_at=starts_at,
            ends_at=ends_at,
            duration_label=duration_label,
            location=location or '',
            is_online=is_online,
            is_private=is_private,
            capacity=capacity or 0,
            ticket_price=ticket_price,
            cover_image=cover_image,
            auto_approve_members=bool(auto_approve_members),
        )
        # Creator auto-attends.
        self.repo.attend(event.id, creator_id)
        community_name = self.repo.community_name(community_id)

        # Best-effort: notify community members + audit the host.
        try:
            from modules.notifications.services.notification_service import NotificationService
            from modules.audit.services.audit_service import AuditService
            from modules.community.repositories.member_repository import MemberRepository
            notif_service = NotificationService()
            if community_id:
                members, _ = MemberRepository().find_by_community(community_id, status='active', limit=500)
                for m in members:
                    if m.user_id == creator_id:
                        continue
                    notif_service.create_for_user(
                        user_id=m.user_id,
                        title=f"New event: {event.title}",
                        body=f"{community_name or 'A community'} is hosting on {event.starts_at.strftime('%d %b at %H:%M')}.",
                        category='events',
                        source=community_name or 'CCPay',
                        action_href='/dashboard/events',
                        community_id=community_id,
                    )
            AuditService().record(
                user_id=creator_id,
                action='Event created',
                details=f"Created event '{event.title}'",
                category='admin',
                severity='info',
                actor='You',
                target=community_name or 'Public',
            )
        except Exception as exc:
            logger.warning('post-event notify/audit failed: %s', exc)

        return {'event': event.to_dict(current_user_id=creator_id, community_name=community_name)}, 201

    def list_for_user(
        self,
        user_id: int,
        scope: str = 'upcoming',
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[Dict[str, Any], int]:
        items, total = self.repo.list_for_user(user_id, limit=limit, offset=offset, scope=scope)
        events = []
        for ev in items:
            events.append(
                ev.to_dict(
                    current_user_id=user_id,
                    community_name=self.repo.community_name(ev.community_id),
                )
            )
        if scope == 'live':
            events = [e for e in events if e['status'] == 'live']
        return {
            'events': events,
            'pagination': {'total': total, 'limit': limit, 'offset': offset},
        }, 200

    def get(self, event_id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        event = self.repo.find_by_id(event_id)
        if not event:
            return {'error': 'Event not found', 'code': 'NOT_FOUND'}, 404
        community_name = self.repo.community_name(event.community_id)
        return {'event': event.to_dict(current_user_id=user_id, community_name=community_name)}, 200

    def attend(self, event_id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        event = self.repo.find_by_id(event_id)
        if not event:
            return {'error': 'Event not found', 'code': 'NOT_FOUND'}, 404
        was_attending = event.is_user_attending(user_id)
        if event.requires_payment and not was_attending:
            return {
                'error': 'Paid event ticketing is not available yet',
                'code': 'PAID_EVENT_UNSUPPORTED',
            }, 402
        if event.capacity and event.attendee_count() >= event.capacity and not was_attending:
            return {'error': 'Event is at capacity', 'code': 'AT_CAPACITY'}, 409
        self.repo.attend(event_id, user_id)
        community_name = self.repo.community_name(event.community_id)

        # Audit only on first RSVP, not silent re-confirmation.
        if not was_attending:
            try:
                from modules.audit.services.audit_service import AuditService
                AuditService().record(
                    user_id=user_id,
                    action='Event RSVP',
                    details=f"You're attending '{event.title}'",
                    category='admin',
                    severity='info',
                    actor='You',
                    target=community_name or 'Public',
                )
            except Exception as exc:
                logger.warning('post-rsvp audit failed: %s', exc)

        return {'event': event.to_dict(current_user_id=user_id, community_name=community_name)}, 200

    def cancel_attendance(self, event_id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        event = self.repo.find_by_id(event_id)
        if not event:
            return {'error': 'Event not found', 'code': 'NOT_FOUND'}, 404
        self.repo.cancel_attendance(event_id, user_id)
        community_name = self.repo.community_name(event.community_id)
        return {'event': event.to_dict(current_user_id=user_id, community_name=community_name)}, 200

    def cancel(self, event_id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        event = self.repo.find_by_id(event_id)
        if not event:
            return {'error': 'Event not found', 'code': 'NOT_FOUND'}, 404
        if event.creator_id != user_id:
            return {'error': 'Only the event host can cancel', 'code': 'FORBIDDEN'}, 403
        self.repo.update(event_id, cancelled_at=datetime.utcnow())
        return {'cancelled': True}, 200
