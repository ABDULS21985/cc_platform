"""
Community Member Repository
Data access layer for CommunityMember model - CRUD operations and queries.

SOLID Principles:
- Single Responsibility: Only handles membership data access
- Open/Closed: Extensible for role-based queries
- Liskov Substitution: Standard repository pattern
- Interface Segregation: Clean, focused methods
- Dependency Inversion: Depends on db abstraction
"""
import logging
from typing import Optional, List, Dict, Any
from modules.auth_v2.extensions import db
from modules.community.models.community_member import CommunityMember

logger = logging.getLogger(__name__)


class MemberRepository:
    """Repository for CommunityMember model"""
    
    def create(self, data: Dict[str, Any]) -> CommunityMember:
        """
        Add user to community
        
        Args:
            data: Dictionary with community_id, user_id, role, status
            
        Returns:
            Created CommunityMember object
        """
        try:
            member = CommunityMember(
                community_id=data['community_id'],
                user_id=data['user_id'],
                role=data.get('role', 'member'),
                status=data.get('status', 'active')
            )
            db.session.add(member)
            db.session.flush()
            logger.info(f"Added user {data['user_id']} to community {data['community_id']} as {data.get('role', 'member')}")
            return member
        except KeyError as e:
            logger.error(f"Missing required field: {e}")
            raise ValueError(f"Missing required field: {e}")
    
    def find_by_id(self, member_id: int) -> Optional[CommunityMember]:
        """Find member by ID"""
        return CommunityMember.query.filter_by(id=member_id).first()
    
    def find_by_community_and_user(self, community_id: int, user_id: int) -> Optional[CommunityMember]:
        """Find membership record"""
        return CommunityMember.query.filter_by(
            community_id=community_id,
            user_id=user_id
        ).first()
    
    def find_by_community(self, community_id: int, status: str = 'active', limit: int = 100, offset: int = 0) -> tuple:
        """
        Find all members of a community
        
        Returns:
            Tuple of (members, total_count)
        """
        query = CommunityMember.query.filter_by(community_id=community_id)
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        members = query.limit(limit).offset(offset).all()
        return members, total
    
    def find_by_user(self, user_id: int, status: str = 'active') -> List[CommunityMember]:
        """Find all communities user is member of"""
        query = CommunityMember.query.filter_by(user_id=user_id)
        if status:
            query = query.filter_by(status=status)
        return query.all()
    
    def find_owners(self, community_id: int) -> List[CommunityMember]:
        """Find all owners of community"""
        return CommunityMember.query.filter_by(
            community_id=community_id,
            role='owner',
            status='active'
        ).all()
    
    def find_admins(self, community_id: int) -> List[CommunityMember]:
        """Find all admins of community"""
        return CommunityMember.query.filter_by(
            community_id=community_id,
            role='admin',
            status='active'
        ).all()
    
    def find_by_role(self, community_id: int, role: str) -> List[CommunityMember]:
        """Find members by role"""
        return CommunityMember.query.filter_by(
            community_id=community_id,
            role=role,
            status='active'
        ).all()
    
    def update_role(self, member_id: int, new_role: str) -> Optional[CommunityMember]:
        """Update member's role"""
        member = self.find_by_id(member_id)
        if member:
            member.role = new_role
            db.session.flush()
            logger.info(f"Updated member {member_id} role to {new_role}")
        return member
    
    def update_status(self, member_id: int, new_status: str) -> Optional[CommunityMember]:
        """Update member's status (active, suspended, left)"""
        member = self.find_by_id(member_id)
        if member:
            member.status = new_status
            db.session.flush()
            logger.info(f"Updated member {member_id} status to {new_status}")
        return member

    def update_status_by_community_and_user(self, community_id: int, user_id: int, new_status: str) -> Optional[CommunityMember]:
        """Update member status using composite key."""
        member = self.find_by_community_and_user(community_id, user_id)
        if member:
            member.status = new_status
            db.session.flush()
            logger.info(f"Updated member {member.id} status to {new_status} (community {community_id}, user {user_id})")
        return member
    
    def remove_member(self, community_id: int, user_id: int) -> bool:
        """
        Remove user from community (soft delete - mark as 'left')
        
        Returns:
            True if removed, False if not found
        """
        member = self.find_by_community_and_user(community_id, user_id)
        if member:
            member.status = 'left'
            db.session.flush()
            logger.info(f"Removed user {user_id} from community {community_id}")
            return True
        logger.warning(f"Member not found: community {community_id}, user {user_id}")
        return False
    
    def find_filtered(
        self,
        member_filter,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple:
        """
        Find members using a MemberFilter.

        The filter's initial query must already be scoped to a community.
        Returns ``(members, total_count)``.
        """
        member_filter.apply().order(CommunityMember.id.desc())
        return member_filter.paginate(limit=limit, offset=offset)

    def count_members(self, community_id: int, status: str = 'active') -> int:
        """Count members in community"""
        query = CommunityMember.query.filter_by(community_id=community_id)
        if status:
            query = query.filter_by(status=status)
        return query.count()

    def count_non_owner_members(self, community_id: int, status: str = 'active') -> int:
        """Count non-owner members in community."""
        query = CommunityMember.query.filter_by(community_id=community_id)
        if status:
            query = query.filter_by(status=status)
        query = query.filter(CommunityMember.role != 'owner')
        return query.count()
    
    def is_owner(self, community_id: int, user_id: int) -> bool:
        """Check if user is owner"""
        member = self.find_by_community_and_user(community_id, user_id)
        return member and member.is_owner
    
    def is_admin_or_owner(self, community_id: int, user_id: int) -> bool:
        """Check if user is admin or owner"""
        member = self.find_by_community_and_user(community_id, user_id)
        return member and member.role in ['owner', 'admin'] and member.status == 'active'
    
    def is_member(self, community_id: int, user_id: int) -> bool:
        """Check if user is active member"""
        member = self.find_by_community_and_user(community_id, user_id)
        return member and member.status == 'active'
