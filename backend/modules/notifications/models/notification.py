"""Notification model — user-facing in-app notifications."""
from sqlalchemy import func
from modules.auth_v2.extensions import db


CATEGORIES = ('money', 'bills', 'communities', 'events', 'security', 'system')


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=True,
        index=True,
    )
    category = db.Column(db.String(32), nullable=False, default='system', index=True)
    title = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False, default='')
    source = db.Column(db.String(120), nullable=False, default='System')
    action_href = db.Column(db.String(512), nullable=True)
    action_label = db.Column(db.String(64), nullable=True)
    amount_value = db.Column(db.String(32), nullable=True)
    amount_direction = db.Column(db.String(8), nullable=True)
    initials = db.Column(db.String(4), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        amount = None
        if self.amount_value and self.amount_direction:
            amount = {'value': self.amount_value, 'direction': self.amount_direction}
        return {
            'id': self.id,
            'user_id': self.user_id,
            'community_id': self.community_id,
            'category': self.category,
            'title': self.title,
            'body': self.body,
            'source': self.source,
            'action_href': self.action_href,
            'action_label': self.action_label,
            'amount': amount,
            'initials': self.initials,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
