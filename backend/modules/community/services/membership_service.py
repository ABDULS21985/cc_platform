"""
Membership Service
Business logic for community membership management.

SOLID Principles:
- Single Responsibility: Orchestrate membership operations only
- Open/Closed: Extensible for new membership features
- Liskov Substitution: Clear interface contracts
- Interface Segregation: Focused public methods
- Dependency Inversion: Depends on repositories
"""
import logging
from decimal import Decimal
from typing import Optional, List, Dict, Tuple, Any
from modules.community.repositories import CommunityRepository, MemberRepository
from modules.community.models.community_member import CommunityMember
from modules.community.constants import MemberRole, MemberStatus
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


class MembershipService:
    """Service for membership operations"""
    
    def __init__(self):
        self.member_repo = MemberRepository()
        self.community_repo = CommunityRepository()
    
    def add_member(self, community_id: int, user_id: int, role: str = MemberRole.MEMBER.value) -> Tuple[Optional[CommunityMember], Optional[str]]:
        """
        Add user to community
        
        Args:
            community_id: Community ID
            user_id: User ID
            role: Member role (owner/admin/member)
            
        Returns:
            Tuple of (member, error) - one will be None
        """
        try:
            # Check if already member
            existing = self.member_repo.find_by_community_and_user(community_id, user_id)
            if existing:
                if existing.status == MemberStatus.LEFT.value:
                    # Re-activate
                    existing.status = MemberStatus.ACTIVE.value
                    self.community_repo.increment_member_count(community_id)
                    db.session.flush()
                    logger.info(f"Reactivated user {user_id} in community {community_id}")
                    db.session.commit()
                    return existing, None
                return None, 'User already member of community'
            
            # Create new membership
            member_data = {
                'community_id': community_id,
                'user_id': user_id,
                'role': role,
                'status': MemberStatus.ACTIVE.value
            }
            member = self.member_repo.create(member_data)
            
            # Increment member count
            self.community_repo.increment_member_count(community_id)
            
            db.session.commit()
            logger.info(f"Added user {user_id} to community {community_id} as {role}")

            # Best-effort: notify owners + audit the joiner.
            try:
                from modules.notifications.services.notification_service import NotificationService
                from modules.audit.services.audit_service import AuditService
                community = self.community_repo.find_by_id(community_id)
                community_name = community.name if community else 'Community'
                # Greet the new member.
                NotificationService().create_for_user(
                    user_id=user_id,
                    title=f"Welcome to {community_name}",
                    body=f"You're now a {role} of {community_name}. Catch up on the latest posts and bills.",
                    category='communities',
                    source=community_name,
                    action_href=f'/dashboard/community/{community_id}',
                )
                AuditService().record(
                    user_id=user_id,
                    action='Joined community',
                    details=f"You joined {community_name} as {role}",
                    category='admin',
                    severity='info',
                    actor='You',
                    target=community_name,
                )
                # Tell active owners someone joined.
                owners = self.member_repo.find_owners(community_id)
                for o in owners:
                    if o.user_id == user_id:
                        continue
                    NotificationService().create_for_user(
                        user_id=o.user_id,
                        title=f"New member in {community_name}",
                        body=f"A new member just joined as {role}.",
                        category='communities',
                        source=community_name,
                        action_href=f'/dashboard/community/{community_id}',
                    )
            except Exception as exc:
                logger.warning('post-join notify/audit failed: %s', exc)

            return member, None

        except Exception as e:
            logger.error(f"Error adding member: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def remove_member(self, community_id: int, user_id: int) -> Tuple[bool, Optional[str]]:
        """
        Remove user from community (soft delete)
        
        Returns:
            Tuple of (success, error) - one will be None/False
        """
        try:
            member = self.member_repo.find_by_community_and_user(community_id, user_id)
            if not member:
                return False, 'Member not found'

            if member.status != MemberStatus.ACTIVE.value:
                return False, 'Member is not active in this community'
            
            # Soft delete
            self.member_repo.remove_member(community_id, user_id)
            self.community_repo.decrement_member_count(community_id)

            db.session.commit()
            logger.info(f"Removed user {user_id} from community {community_id}")

            # Best-effort: audit the leaver. We skip the "you left" notification
            # since the user just took the action themselves.
            try:
                from modules.audit.services.audit_service import AuditService
                community = self.community_repo.find_by_id(community_id)
                community_name = community.name if community else 'Community'
                AuditService().record(
                    user_id=user_id,
                    action='Left community',
                    details=f"You left {community_name}",
                    category='admin',
                    severity='info',
                    actor='You',
                    target=community_name,
                )
            except Exception as exc:
                logger.warning('post-leave audit failed: %s', exc)

            return True, None
            
        except Exception as e:
            logger.error(f"Error removing member: {str(e)}")
            db.session.rollback()
            return False, str(e)
    
    def update_member_role(self, community_id: int, user_id: int, new_role: str) -> Tuple[Optional[CommunityMember], Optional[str]]:
        """
        Update member role
        
        Args:
            community_id: Community ID
            user_id: User ID
            new_role: New role (owner/admin/member)
            
        Returns:
            Tuple of (member, error) - one will be None
        """
        try:
            member = self.member_repo.find_by_community_and_user(community_id, user_id)
            if not member:
                return None, 'Member not found'
            
            old_role = member.role
            member.role = new_role
            db.session.flush()

            db.session.commit()
            logger.info(f"Updated user {user_id} role in community {community_id}: {old_role} -> {new_role}")

            # Best-effort: notify the affected member + audit the change.
            try:
                from modules.notifications.services.notification_service import NotificationService
                from modules.audit.services.audit_service import AuditService
                community = self.community_repo.find_by_id(community_id)
                community_name = community.name if community else 'Community'
                if old_role != new_role:
                    NotificationService().create_for_user(
                        user_id=user_id,
                        title=f"Role updated in {community_name}",
                        body=f"You're now {new_role} (was {old_role}).",
                        category='communities',
                        source=community_name,
                        action_href=f'/dashboard/community/{community_id}',
                    )
                AuditService().record(
                    user_id=user_id,
                    action='Member role changed',
                    details=f"{old_role} → {new_role} in {community_name}",
                    category='admin',
                    severity='warning' if new_role in ('admin', 'owner') else 'info',
                    actor='Community admin',
                    target=community_name,
                )
            except Exception as exc:
                logger.warning('post-role-change notify/audit failed: %s', exc)

            return member, None
            
        except Exception as e:
            logger.error(f"Error updating member role: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def suspend_member(self, community_id: int, user_id: int) -> Tuple[Optional[CommunityMember], Optional[str]]:
        """
        Suspend member (cannot participate)
        
        Returns:
            Tuple of (member, error) - one will be None
        """
        try:
            member = self.member_repo.find_by_community_and_user(community_id, user_id)
            if not member:
                return None, 'Member not found'
            
            self.member_repo.update_status_by_community_and_user(
                community_id,
                user_id,
                MemberStatus.SUSPENDED.value
            )

            db.session.commit()
            logger.warning(f"Suspended user {user_id} in community {community_id}")

            # Best-effort: notify the suspended user + security audit.
            try:
                from modules.notifications.services.notification_service import NotificationService
                from modules.audit.services.audit_service import AuditService
                community = self.community_repo.find_by_id(community_id)
                community_name = community.name if community else 'Community'
                NotificationService().create_for_user(
                    user_id=user_id,
                    title=f"Suspended in {community_name}",
                    body=(
                        "An admin suspended your access to this community. "
                        "Reach out to the community owner if you believe this is a mistake."
                    ),
                    category='security',
                    source=community_name,
                    action_href=f'/dashboard/community/{community_id}',
                )
                AuditService().record(
                    user_id=user_id,
                    action='Membership suspended',
                    details=f"You were suspended from {community_name}",
                    category='security',
                    severity='warning',
                    actor='Community admin',
                    target=community_name,
                )
            except Exception as exc:
                logger.warning('post-suspend notify/audit failed: %s', exc)

            return member, None
            
        except Exception as e:
            logger.error(f"Error suspending member: {str(e)}")
            db.session.rollback()
            return None, str(e)
    
    def is_member(self, community_id: int, user_id: int) -> bool:
        """Check if user is active member"""
        return self.member_repo.is_member(community_id, user_id)
    
    def is_owner(self, community_id: int, user_id: int) -> bool:
        """Check if user is owner"""
        return self.member_repo.is_owner(community_id, user_id)
    
    def is_admin_or_owner(self, community_id: int, user_id: int) -> bool:
        """Check if user is admin or owner"""
        return self.member_repo.is_admin_or_owner(community_id, user_id)
    
    def get_member(self, community_id: int, user_id: int) -> Tuple[Optional[CommunityMember], Optional[str]]:
        """Get member details"""
        member = self.member_repo.find_by_community_and_user(community_id, user_id)
        if not member:
            return None, 'Member not found'
        return member, None
    
    def get_members(self, community_id: int, role: Optional[str] = None, 
                   status: Optional[str] = None, limit: int = 50, offset: int = 0) -> Tuple[List[CommunityMember], int]:
        """
        Get community members
        
        Returns:
            Tuple of (members, total_count)
        """
        if role:
            members = self.member_repo.find_by_role(community_id, role)
            return members, len(members)
        else:
            return self.member_repo.find_by_community(community_id, status=status, limit=limit, offset=offset)

    def get_community_members(self, community_id: int, status: str = MemberStatus.ACTIVE.value) -> List[CommunityMember]:
        """Get all community members as a list (compatibility helper for resource layer)."""
        members, _ = self.member_repo.find_by_community(community_id, status=status)
        return members

    def get_filtered_members(
        self,
        community_id: int,
        args: dict = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CommunityMember], int]:
        """
        Return paginated, filtered community members.

        Accepts a validated Marshmallow args dict from ``MemberListQuerySchema``.
        When ``status`` is not provided in args, defaults to active members so
        behaviour is identical to ``get_community_members``.

        Returns:
            Tuple of (members, total_count)
        """
        from modules.community.utils import MemberFilter
        from modules.community.models.community_member import CommunityMember as _CM

        args = args or {}
        if "status" not in args:
            args = {**args, "status": MemberStatus.ACTIVE.value}

        base_query = _CM.query.filter_by(community_id=community_id)
        f = MemberFilter(base_query, args)
        return self.member_repo.find_filtered(f, limit=limit, offset=offset)
    
    def get_admins(self, community_id: int) -> List[CommunityMember]:
        """Get all admins in community"""
        return self.member_repo.find_admins(community_id)
    
    def get_owners(self, community_id: int) -> List[CommunityMember]:
        """Get all owners of community"""
        return self.member_repo.find_owners(community_id)
    
    def promote_to_admin(self, community_id: int, user_id: int) -> Tuple[Optional[CommunityMember], Optional[str]]:
        """Promote member to admin"""
        return self.update_member_role(community_id, user_id, MemberRole.ADMIN.value)
    
    def demote_to_member(self, community_id: int, user_id: int) -> Tuple[Optional[CommunityMember], Optional[str]]:
        """Demote admin to member"""
        return self.update_member_role(community_id, user_id, MemberRole.MEMBER.value)
    
    def get_member_count(self, community_id: int, status: Optional[str] = None) -> int:
        """Get member count"""
        _, total = self.member_repo.find_by_community(community_id, status=status)
        return total

    def get_member_count_excluding_owner(self, community_id: int) -> int:
        """Get active member count excluding owner role."""
        return self.member_repo.count_non_owner_members(community_id, status=MemberStatus.ACTIVE.value)

    def get_user_community_ids(self, user_id: int, owned_only: bool = False) -> List[int]:
        """Get active community IDs for a user based on membership."""
        memberships = self.member_repo.find_by_user(user_id, status=MemberStatus.ACTIVE.value)
        if owned_only:
            memberships = [membership for membership in memberships if membership.role == MemberRole.OWNER.value]
        return [membership.community_id for membership in memberships]
