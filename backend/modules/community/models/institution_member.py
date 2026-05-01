"""
InstitutionMember Model
Tracks institution-level access and roles for users.
"""
from typing import Dict, Any
from sqlalchemy import func, UniqueConstraint
from modules.auth_v2.extensions import db


class InstitutionMember(db.Model):
    """Institution membership and role mapping."""

    __tablename__ = 'institution_members'
    __table_args__ = (
        UniqueConstraint('institution_id', 'user_id', name='uq_institution_user'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    institution_id = db.Column(
        db.Integer,
        db.ForeignKey('institutions.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    role = db.Column(db.String(20), nullable=False, default='member', index=True)
    status = db.Column(db.String(20), nullable=False, default='active', index=True)
    joined_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    institution = db.relationship('Institution', back_populates='members', foreign_keys=[institution_id])
    user = db.relationship('User', backref='institution_memberships')

    def __repr__(self) -> str:
        return f"<InstitutionMember(id={self.id}, institution_id={self.institution_id}, user_id={self.user_id})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'institution_id': self.institution_id,
            'user_id': self.user_id,
            'role': self.role,
            'status': self.status,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
