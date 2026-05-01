"""
AdminAuditLog Model

Stores security-relevant actions performed by platform admins.
"""

from typing import Any, Dict, Optional

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB

from modules.auth_v2.extensions import db


class AdminAuditLog(db.Model):
    __tablename__ = "admin_audit_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    actor_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action = db.Column(db.String(100), nullable=False, index=True)
    target_type = db.Column(db.String(50), nullable=False, index=True)
    target_id = db.Column(db.String(50), nullable=True, index=True)

    metadata_json = db.Column("metadata", JSONB, nullable=True, default=dict)
    ip_address = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)

    actor = db.relationship("User", foreign_keys=[actor_user_id], backref="admin_audit_logs")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "actor_user_id": self.actor_user_id,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "metadata": self.metadata_json,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

