"""Event repository — DB access for events and attendees."""
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import asc, desc, or_

from modules.auth_v2.extensions import db
from modules.community.models.community import Community
from modules.community.models.community_member import CommunityMember
from modules.events.models.event import Event, EventAttendee


class EventRepository:
    def create(self, **kwargs) -> Event:
        event = Event(**kwargs)
        db.session.add(event)
        db.session.commit()
        return event

    def find_by_id(self, event_id: int) -> Optional[Event]:
        return Event.query.filter_by(id=event_id).first()

    def update(self, event_id: int, **kwargs) -> Optional[Event]:
        event = self.find_by_id(event_id)
        if not event:
            return None
        for key, value in kwargs.items():
            if hasattr(event, key):
                setattr(event, key, value)
        db.session.commit()
        return event

    def delete(self, event_id: int) -> bool:
        event = self.find_by_id(event_id)
        if not event:
            return False
        db.session.delete(event)
        db.session.commit()
        return True

    def list_for_community(
        self, community_id: int, limit: int = 50, offset: int = 0
    ) -> Tuple[List[Event], int]:
        query = Event.query.filter_by(community_id=community_id)
        total = query.count()
        items = (
            query.order_by(asc(Event.starts_at)).offset(offset).limit(limit).all()
        )
        return items, total

    def list_for_user(
        self,
        user_id: int,
        limit: int = 100,
        offset: int = 0,
        scope: str = 'upcoming',
        community_id: Optional[int] = None,
    ) -> Tuple[List[Event], int]:
        """Aggregate events visible to a user across joined communities + public events."""
        joined_ids_subq = (
            db.session.query(CommunityMember.community_id)
            .filter(CommunityMember.user_id == user_id)
            .subquery()
        )
        # Visible events: public events OR events from a community the user is in
        # OR events the user is hosting.
        query = Event.query.filter(
            or_(
                Event.is_private.is_(False),
                Event.community_id.in_(joined_ids_subq),
                Event.creator_id == user_id,
            )
        )
        now = datetime.utcnow()
        if scope == 'upcoming':
            query = query.filter(Event.starts_at >= now)
        elif scope == 'past':
            query = query.filter(Event.starts_at < now)
        elif scope == 'hosting':
            query = Event.query.filter(Event.creator_id == user_id)
        elif scope == 'suggested':
            # Suggested = upcoming public events in joined communities,
            # excluding ones the user already RSVP'd to or is hosting.
            attended_ids_subq = (
                db.session.query(EventAttendee.event_id)
                .filter(EventAttendee.user_id == user_id)
                .filter(EventAttendee.cancelled.is_(False))
                .subquery()
            )
            query = Event.query.filter(
                Event.starts_at >= now,
                Event.creator_id != user_id,
                Event.id.notin_(attended_ids_subq),
                or_(
                    Event.is_private.is_(False),
                    Event.community_id.in_(joined_ids_subq),
                ),
            )
        # 'live' and 'all' return everything; the service decides slicing by status

        if community_id is not None:
            query = query.filter(Event.community_id == community_id)

        total = query.count()
        if scope == 'past':
            items = (
                query.order_by(desc(Event.starts_at)).offset(offset).limit(limit).all()
            )
        else:
            items = (
                query.order_by(asc(Event.starts_at)).offset(offset).limit(limit).all()
            )
        return items, total

    def attend(self, event_id: int, user_id: int) -> Optional[EventAttendee]:
        existing = EventAttendee.query.filter_by(
            event_id=event_id, user_id=user_id
        ).first()
        if existing:
            if existing.cancelled:
                existing.cancelled = False
                db.session.commit()
            return existing
        attendee = EventAttendee(event_id=event_id, user_id=user_id, cancelled=False)
        db.session.add(attendee)
        db.session.commit()
        return attendee

    def cancel_attendance(self, event_id: int, user_id: int) -> bool:
        attendee = EventAttendee.query.filter_by(
            event_id=event_id, user_id=user_id
        ).first()
        if not attendee:
            return False
        attendee.cancelled = True
        db.session.commit()
        return True

    def community_name(self, community_id: int | None) -> Optional[str]:
        if not community_id:
            return None
        c = Community.query.filter_by(id=community_id).first()
        return c.name if c else None
