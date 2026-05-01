"""
Organization Service
Business logic for organizations and default organization fallback.
"""
import logging
from typing import Any, Dict, Optional, Tuple
from modules.auth_v2.extensions import db
from modules.community.constants import OrganizationStatus, InstitutionRole, InstitutionStatus
from modules.community.repositories import (
    OrganizationRepository,
    InstitutionRepository,
    InstitutionMemberRepository,
)
from modules.community.utils import generate_slug

logger = logging.getLogger(__name__)


class OrganizationService:
    """Service for organization operations."""

    def __init__(self):
        self.organization_repo = OrganizationRepository()
        self.institution_repo = InstitutionRepository()
        self.institution_member_repo = InstitutionMemberRepository()

    def create_organization(self, creator_id: int, data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        institution_id = data.get('institution_id')
        if institution_id is not None and not self.institution_member_repo.can_create_structure(institution_id, creator_id):
            return None, 'Not authorized to create organization in this institution'

        try:
            organization = self.organization_repo.create(
                {
                    'institution_id': institution_id,
                    'name': data['name'],
                    'slug': generate_slug(data['name']),
                    'description': data.get('description'),
                    'is_default': bool(data.get('is_default', False)),
                    'status': OrganizationStatus.ACTIVE.value,
                    'created_by': creator_id,
                }
            )
            db.session.commit()
            return organization.to_dict(), None
        except Exception as exc:
            logger.error(f"Error creating organization: {exc}", exc_info=True)
            db.session.rollback()
            return None, str(exc)

    def get_organization(self, organization_id: int) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        organization = self.organization_repo.find_by_id(organization_id)
        if not organization:
            return None, 'Organization not found'
        return organization.to_dict(), None

    def list_organizations(self, institution_id: Optional[int], limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        items, total = self.organization_repo.list_by_institution(institution_id, limit=limit, offset=offset)
        return {
            'organizations': [item.to_dict() for item in items],
            'pagination': {'total': total, 'limit': limit, 'offset': offset},
        }

    def ensure_default_organization(
        self,
        user_id: int,
        institution_id: Optional[int] = None,
    ) -> Tuple[Optional[int], Optional[str]]:
        """
        Ensure there is a default organization for the user.

        If institution_id is not provided, a personal institution is created/reused.
        """
        try:
            resolved_institution_id = institution_id
            if resolved_institution_id is None:
                personal_institution = self.institution_repo.find_by_slug(f'user-{user_id}-institution')
                if not personal_institution:
                    personal_institution = self.institution_repo.create(
                        {
                            'name': f'User {user_id} Institution',
                            'slug': f'user-{user_id}-institution',
                            'description': 'Auto-created personal institution',
                            'status': InstitutionStatus.ACTIVE.value,
                            'created_by': user_id,
                        }
                    )
                    self.institution_member_repo.create(
                        {
                            'institution_id': personal_institution.id,
                            'user_id': user_id,
                            'role': InstitutionRole.OWNER.value,
                            'status': 'active',
                        }
                    )
                resolved_institution_id = personal_institution.id
            elif not self.institution_member_repo.can_create_structure(resolved_institution_id, user_id):
                return None, 'Not authorized to create communities in the selected institution'

            default_org = self.organization_repo.find_default_for_user(
                user_id=user_id,
                institution_id=resolved_institution_id,
            )
            if not default_org:
                default_org = self.organization_repo.create(
                    {
                        'institution_id': resolved_institution_id,
                        'name': f'User {user_id} Organization',
                        'slug': f'user-{user_id}-organization-{resolved_institution_id}',
                        'description': 'Auto-created default organization',
                        'is_default': True,
                        'status': OrganizationStatus.ACTIVE.value,
                        'created_by': user_id,
                    }
                )

            db.session.flush()
            return default_org.id, None
        except Exception as exc:
            logger.error(f"Error ensuring default organization: {exc}", exc_info=True)
            return None, str(exc)
