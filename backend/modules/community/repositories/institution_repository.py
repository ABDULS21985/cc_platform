"""
Institution Repository
Data access for institutions.
"""
import logging
from typing import Optional, Dict, Any, List
from modules.auth_v2.extensions import db
from modules.community.models.institution import Institution

logger = logging.getLogger(__name__)


class InstitutionRepository:
    """Repository for institution database operations."""

    def create(self, data: Dict[str, Any]) -> Institution:
        institution = Institution(
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            status=data.get('status', 'active'),
            created_by=data['created_by'],
        )
        db.session.add(institution)
        db.session.flush()
        return institution

    def find_by_id(self, institution_id: int) -> Optional[Institution]:
        return Institution.query.filter_by(id=institution_id).first()

    def find_by_slug(self, slug: str) -> Optional[Institution]:
        return Institution.query.filter_by(slug=slug).first()

    def find_by_creator(self, user_id: int) -> List[Institution]:
        return Institution.query.filter_by(created_by=user_id).order_by(Institution.id.desc()).all()

    def list_active(self, limit: int = 50, offset: int = 0) -> tuple:
        query = Institution.query.filter_by(status='active')
        total = query.count()
        items = query.order_by(Institution.id.desc()).limit(limit).offset(offset).all()
        return items, total
