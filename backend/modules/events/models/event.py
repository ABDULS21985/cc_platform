"""Event and EventAttendee models."""
from datetime import datetime, timedelta

from sqlalchemy import func
from modules.auth_v2.extensions import db


class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=True,
        index=True,
    )
    creator_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False, default='')
    category = db.Column(db.String(64), nullable=True)
    starts_at = db.Column(db.DateTime, nullable=False, index=True)
    ends_at = db.Column(db.DateTime, nullable=True)
    duration_label = db.Column(db.String(64), nullable=True)
    location = db.Column(db.String(255), nullable=False, default='')
    is_online = db.Column(db.Boolean, default=False, nullable=False)
    is_private = db.Column(db.Boolean, default=False, nullable=False, index=True)
    capacity = db.Column(db.Integer, nullable=False, default=0)
    ticket_price = db.Column(db.String(64), nullable=True)
    cover_image = db.Column(db.String(512), nullable=True)
    auto_approve_members = db.Column(db.Boolean, default=False, nullable=False)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def status(self) -> str:
        if self.cancelled_at:
            return 'past'
        now = datetime.utcnow()
        end = self.ends_at or (self.starts_at + timedelta(hours=2))
        if now < self.starts_at:
            return 'upcoming'
        if now <= end:
            return 'live'
        return 'past'

    def attendee_count(self) -> int:
        return EventAttendee.query.filter_by(event_id=self.id, cancelled=False).count()

    def is_user_attending(self, user_id: int) -> bool:
        if not user_id:
            return False
        return (
            EventAttendee.query.filter_by(
                event_id=self.id, user_id=user_id, cancelled=False
            ).first()
            is not None
        )

    @property
    def requires_payment(self) -> bool:
        if self.ticket_price in (None, ''):
            return False
        try:
            normalized = str(self.ticket_price).replace(',', '').strip()
            return float(normalized) > 0
        except (TypeError, ValueError):
            return True

    def to_dict(self, current_user_id: int | None = None, community_name: str | None = None) -> dict:
        community_initial = (community_name or 'C').strip()[:1].upper() or 'C'
        requires_payment = self.requires_payment
        return {
            'id': self.id,
            'community_id': self.community_id,
            'creator_id': self.creator_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'duration_label': self.duration_label,
            'location': self.location,
            'is_online': self.is_online,
            'is_private': self.is_private,
            'capacity': self.capacity,
            'ticket_price': self.ticket_price,
            'cover_image': self.cover_image,
            'auto_approve_members': self.auto_approve_members,
            'requires_payment': requires_payment,
            # Event ticketing is intentionally gated until a real payment
            # flow exists. The attend endpoint enforces this same state.
            'payment_supported': not requires_payment,
            'ticketing_status': 'paid_unsupported' if requires_payment else 'free',
            'community_name': community_name,
            'community_initial': community_initial,
            'status': self.status,
            'attendees': self.attendee_count(),
            'is_attending': self.is_user_attending(current_user_id) if current_user_id else False,
            'is_hosting': bool(current_user_id) and self.creator_id == current_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class EventAttendee(db.Model):
    __tablename__ = 'event_attendees'
    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='uq_event_attendees_event_user'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    event_id = db.Column(
        db.Integer,
        db.ForeignKey('events.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    cancelled = db.Column(db.Boolean, default=False, nullable=False)
    joined_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
