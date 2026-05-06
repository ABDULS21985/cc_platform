"""
AuthSession Model

Persistent record of every authenticated browser/device session for a user.
Surfaced through /v2/auth/sessions for the user-facing "Login history" UI.
"""
from modules.auth_v2.extensions import db
from sqlalchemy import func


class AuthSession(db.Model):
    """
    AuthSession database model.

    A row is created on every successful login (password or OTP).
    `revoked_at` is set when the user signs out OR an admin revokes the session.
    `last_seen_at` is updated by the presence middleware (debounced 60s).
    """
    __tablename__ = 'auth_sessions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )

    # Optional opaque link to the JWT JTI Redis store (token_service tracks
    # actual revocation there). We don't enforce a uniqueness constraint —
    # a user can refresh tokens within the same logical session.
    jwt_jti = db.Column(db.String(64), nullable=True, index=True)

    device_label = db.Column(db.String(120), nullable=True)
    browser = db.Column(db.String(80), nullable=True)
    os = db.Column(db.String(80), nullable=True)
    ip = db.Column(db.String(64), nullable=True)
    location = db.Column(db.String(120), nullable=True)
    user_agent_raw = db.Column(db.String(512), nullable=True)

    last_seen_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True, index=True)

    user = db.relationship(
        'User',
        backref=db.backref('auth_sessions', lazy='dynamic', cascade='all, delete-orphan'),
    )

    def __repr__(self) -> str:
        return f"<AuthSession id={self.id} user={self.user_id} revoked={self.revoked_at is not None}>"

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'device_label': self.device_label or 'Unknown device',
            'browser': self.browser,
            'os': self.os,
            'ip': self.ip,
            'location': self.location,
            'last_seen_at': self.last_seen_at.isoformat() if self.last_seen_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'is_active': self.is_active,
        }
