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
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def is_enabled(self, category: str) -> bool:
        # Security notifications can never be muted.
        if category == 'security':
            return True
        attr = f"{category}_enabled"
        return bool(getattr(self, attr, True))
