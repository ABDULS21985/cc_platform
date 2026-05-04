"""User-facing audit event model."""
import hashlib
from sqlalchemy import func
from modules.auth_v2.extensions import db


AUDIT_CATEGORIES = ('money', 'security', 'admin', 'system')
AUDIT_SEVERITIES = ('info', 'warning', 'critical')


class AuditEvent(db.Model):
    __tablename__ = 'user_audit_events'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    category = db.Column(db.String(32), nullable=False, default='system', index=True)
    severity = db.Column(db.String(16), nullable=False, default='info', index=True)
    action = db.Column(db.String(255), nullable=False)
    details = db.Column(db.Text, nullable=False, default='')
    actor = db.Column(db.String(120), nullable=False, default='You')
    target = db.Column(db.String(255), nullable=True)
    ip = db.Column(db.String(64), nullable=True)
    device = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False, index=True)

    @property
    def hash_prefix(self) -> str:
        """7-char hash for visual immutability cue (deterministic from row)."""
        seed = f"{self.id}:{self.user_id}:{self.action}:{self.created_at}"
        return hashlib.sha256(seed.encode()).hexdigest()[:7]

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'severity': self.severity,
            'action': self.action,
            'details': self.details,
            'actor': self.actor,
            'target': self.target,
            'ip': self.ip,
            'device': self.device,
            'hashPrefix': self.hash_prefix,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
