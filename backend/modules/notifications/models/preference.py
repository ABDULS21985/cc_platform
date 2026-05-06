"""Per-user notification preferences (mute by category)."""
from sqlalchemy import func
from modules.auth_v2.extensions import db


class NotificationPreference(db.Model):
    __tablename__ = 'notification_preferences'

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True,
    )
    money_enabled = db.Column(db.Boolean, default=True, nullable=False)
    bills_enabled = db.Column(db.Boolean, default=True, nullable=False)
    communities_enabled = db.Column(db.Boolean, default=True, nullable=False)
    events_enabled = db.Column(db.Boolean, default=True, nullable=False)
    # Security cannot be muted — included for completeness but the service
    # always honors security notifications regardless of this flag.
    security_enabled = db.Column(db.Boolean, default=True, nullable=False)
    system_enabled = db.Column(db.Boolean, default=True, nullable=False)
    # Email digest scheduling: 'off' | 'daily' | 'weekly'.
    digest_frequency = db.Column(db.String(8), default='off', nullable=False)
    # Wall-clock when the last digest email was sent, used to gate the next.
    last_digest_at = db.Column(db.DateTime, nullable=True)
    # Per-channel toggles (in-app is always on; the others gate dispatchers).
    channel_email = db.Column(db.Boolean, default=True, nullable=False)
    channel_sms = db.Column(db.Boolean, default=False, nullable=False)
    channel_push = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        return {
            'user_id': self.user_id,
            'money': self.money_enabled,
            'bills': self.bills_enabled,
            'communities': self.communities_enabled,
            'events': self.events_enabled,
            'security': True,  # always on; surfaced as locked in the UI
            'system': self.system_enabled,
            'digest_frequency': self.digest_frequency or 'off',
            'last_digest_at': self.last_digest_at.isoformat() if self.last_digest_at else None,
            'channel_email': self.channel_email,
            'channel_sms': self.channel_sms,
            'channel_push': self.channel_push,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def is_enabled(self, category: str) -> bool:
        # Security notifications can never be muted.
        if category == 'security':
            return True
        attr = f"{category}_enabled"
        return bool(getattr(self, attr, True))
