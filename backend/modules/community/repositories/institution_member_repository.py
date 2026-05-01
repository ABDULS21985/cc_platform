"""
Institution Member Repository
Data access for institution memberships.
"""
from typing import Optional, Dict, Any
from modules.auth_v2.extensions import db
from modules.community.models.institution_member import InstitutionMember


class InstitutionMemberRepository:
    """Repository for institution member operations."""

    def create(self, data: Dict[str, Any]) -> InstitutionMember:
        member = InstitutionMember(
            institution_id=data['institution_id'],
            user_id=data['user_id'],
            role=data.get('role', 'member'),
            status=data.get('status', 'active'),
        )
        db.session.add(member)
        db.session.flush()
        return member

    def find_membership(self, institution_id: int, user_id: int) -> Optional[InstitutionMember]:
        return InstitutionMember.query.filter_by(institution_id=institution_id, user_id=user_id).first()

    def is_active_member(self, institution_id: int, user_id: int) -> bool:
        membership = self.find_membership(institution_id, user_id)
        return bool(membership and membership.status == 'active')

    def can_create_structure(self, institution_id: int, user_id: int) -> bool:
        membership = self.find_membership(institution_id, user_id)
        return bool(
            membership and membership.status == 'active' and membership.role in ('owner', 'admin')
        )
