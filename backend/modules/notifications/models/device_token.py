"""
DeviceToken model — Firebase Cloud Messaging registration tokens for a user.
"""
from modules.auth_v2.extensions import db
from sqlalchemy import func


class DeviceToken(db.Model):
    __tablename__ = 'device_tokens'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )

    # FCM registration token. Tokens can be very long (~150 chars typical,
    # up to ~512 in edge cases), so we use TEXT to be safe.
    fcm_token = db.Column(db.Text, nullable=False)
    platform = db.Column(db.String(16), nullable=False, default='web')  # web | ios | android
    last_seen_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship(
        'User',
        backref=db.backref('device_tokens', lazy='dynamic', cascade='all, delete-orphan'),
    )

    __table_args__ = (
        db.Index('ix_device_tokens_user_revoked', 'user_id', 'revoked_at'),
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'platform': self.platform,
            'last_seen_at': self.last_seen_at.isoformat() if self.last_seen_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
        }
