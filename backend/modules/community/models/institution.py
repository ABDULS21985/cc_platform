"""
Institution Model
Represents a parent container for organizations and communities.
"""
from typing import Dict, Any
from sqlalchemy import func
from modules.auth_v2.extensions import db


class Institution(db.Model):
    """Institution database model."""

    __tablename__ = 'institutions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    slug = db.Column(db.String(255), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='active', index=True)
    created_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    creator = db.relationship('User', foreign_keys=[created_by], backref='created_institutions')
    organizations = db.relationship(
        'Organization',
        back_populates='institution',
        cascade='all, delete-orphan',
        lazy='dynamic',
    )
    members = db.relationship(
        'InstitutionMember',
        back_populates='institution',
        cascade='all, delete-orphan',
        lazy='dynamic',
    )

    def __repr__(self) -> str:
        return f"<Institution(id={self.id}, name='{self.name}')>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
