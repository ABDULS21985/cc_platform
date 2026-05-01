"""
Organization Model
Represents an organization under an institution.
"""
from typing import Dict, Any
from sqlalchemy import func
from modules.auth_v2.extensions import db


class Organization(db.Model):
    """Organization database model."""

    __tablename__ = 'organizations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    institution_id = db.Column(
        db.Integer,
        db.ForeignKey('institutions.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    name = db.Column(db.String(255), nullable=False, index=True)
    slug = db.Column(db.String(255), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    is_default = db.Column(db.Boolean, nullable=False, default=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='active', index=True)
    created_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    institution = db.relationship('Institution', back_populates='organizations', foreign_keys=[institution_id])
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_organizations')
    communities = db.relationship('Community', back_populates='organization', lazy='dynamic')

    def __repr__(self) -> str:
        return f"<Organization(id={self.id}, name='{self.name}', institution_id={self.institution_id})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'institution_id': self.institution_id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'is_default': self.is_default,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
