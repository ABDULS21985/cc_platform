"""
Institution Service
Business logic for institution management.
"""
import logging
from typing import Any, Dict, Optional, Tuple
from modules.auth_v2.extensions import db
from modules.community.constants import InstitutionRole, InstitutionStatus
from modules.community.repositories import InstitutionRepository, InstitutionMemberRepository
from modules.community.utils import generate_slug

logger = logging.getLogger(__name__)


class InstitutionService:
    """Service for institution operations."""

    def __init__(self):
        self.institution_repo = InstitutionRepository()
        self.member_repo = InstitutionMemberRepository()

    def create_institution(self, creator_id: int, data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        try:
            slug = generate_slug(data['name'])
            institution = self.institution_repo.create(
                {
                    'name': data['name'],
                    'slug': slug,
                    'description': data.get('description'),
                    'status': InstitutionStatus.ACTIVE.value,
                    'created_by': creator_id,
                }
            )
            self.member_repo.create(
                {
                    'institution_id': institution.id,
                    'user_id': creator_id,
                    'role': InstitutionRole.OWNER.value,
                    'status': 'active',
                }
            )
            db.session.commit()
            return institution.to_dict(), None
        except Exception as exc:
            logger.error(f"Error creating institution: {exc}", exc_info=True)
            db.session.rollback()
            return None, str(exc)

    def get_institution(self, institution_id: int) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        institution = self.institution_repo.find_by_id(institution_id)
        if not institution:
            return None, 'Institution not found'
        return institution.to_dict(), None

    def list_institutions(self, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        items, total = self.institution_repo.list_active(limit=limit, offset=offset)
        return {
            'institutions': [item.to_dict() for item in items],
            'pagination': {'total': total, 'limit': limit, 'offset': offset},
        }
