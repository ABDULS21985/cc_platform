"""
Organization Repository
Data access for organizations.
"""
from typing import Optional, Dict, Any
from modules.auth_v2.extensions import db
from modules.community.models.organization import Organization


class OrganizationRepository:
    """Repository for organization database operations."""

    def create(self, data: Dict[str, Any]) -> Organization:
        organization = Organization(
            institution_id=data.get('institution_id'),
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            is_default=data.get('is_default', False),
            status=data.get('status', 'active'),
            created_by=data['created_by'],
        )
        db.session.add(organization)
        db.session.flush()
        return organization

    def find_by_id(self, organization_id: int) -> Optional[Organization]:
        return Organization.query.filter_by(id=organization_id).first()

    def find_by_slug(self, slug: str) -> Optional[Organization]:
        return Organization.query.filter_by(slug=slug).first()

    def list_by_institution(self, institution_id: Optional[int], limit: int = 50, offset: int = 0) -> tuple:
        query = Organization.query.filter_by(status='active')
        if institution_id is not None:
            query = query.filter_by(institution_id=institution_id)
        total = query.count()
        items = query.order_by(Organization.id.desc()).limit(limit).offset(offset).all()
        return items, total

    def find_default_for_user(self, user_id: int, institution_id: Optional[int] = None) -> Optional[Organization]:
        query = Organization.query.filter_by(created_by=user_id, is_default=True, status='active')
        if institution_id is not None:
            query = query.filter_by(institution_id=institution_id)
        return query.order_by(Organization.id.asc()).first()
