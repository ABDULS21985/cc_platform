"""
Community Repository
Data access layer for Community model - CRUD operations and queries.

SOLID Principles:
- Single Responsibility: Only handles data access for communities
- Open/Closed: Extensible for new query methods
- Liskov Substitution: Standard repository pattern
- Interface Segregation: Clean, focused methods
- Dependency Inversion: Depends on db abstraction
"""
import logging
from typing import Optional, List, Dict, Any
from modules.auth_v2.extensions import db
from modules.community.models.community import Community
from modules.community.models.organization import Organization
from modules.community.constants import CommunityStatus, CommunityVisibility

logger = logging.getLogger(__name__)


class CommunityRepository:
    """Repository for Community model - handles all database operations"""
    
    def create(self, data: Dict[str, Any]) -> Community:
        """
        Create a new community
        
        Args:
            data: Dictionary with community fields
            
        Returns:
            Created Community object
            
        Raises:
            ValueError: If required fields are missing
        """
        try:
            community = Community(
                name=data['name'],
                slug=data['slug'],
                description=data.get('description'),
                banner_url=data.get('banner_url'),
                profile_picture_url=data.get('profile_picture_url'),
                visibility=data.get('visibility', 'public'),
                member_cost=data.get('member_cost', 0.0),
                status=data.get('status', 'active'),
                created_by=data['created_by'],
                organization_id=data.get('organization_id'),
                member_count=data.get('member_count', 0),
                invite_code=data.get('invite_code'),
                invite_expires_at=data.get('invite_expires_at'),
                invite_max_uses=data.get('invite_max_uses'),
                invite_uses=data.get('invite_uses', 0),
                invite_status=data.get('invite_status', 'active'),
            )
            db.session.add(community)
            db.session.flush()  # Get ID without committing
            logger.info(f"Created community {community.id}: {community.name}")
            return community
        except KeyError as e:
            logger.error(f"Missing required field: {e}")
            raise ValueError(f"Missing required field: {e}")
    
    def find_by_id(self, community_id: int) -> Optional[Community]:
        """Find community by ID"""
        return Community.query.filter_by(id=community_id).first()

    def find_by_invite_code(self, invite_code: str) -> Optional[Community]:
        """Find community by invite code"""
        return Community.query.filter_by(invite_code=invite_code).first()
    
    def find_by_slug(self, slug: str) -> Optional[Community]:
        """Find community by slug"""
        return Community.query.filter_by(slug=slug).first()
    
    def find_by_creator(self, user_id: int) -> List[Community]:
        """Find all communities created by user"""
        return Community.query.filter_by(created_by=user_id).all()

    def find_by_ids(self, community_ids: List[int], limit: int = 50, offset: int = 0) -> tuple:
        """Find active communities by IDs with pagination."""
        if not community_ids:
            return [], 0

        query = Community.query.filter(
            Community.id.in_(community_ids),
            Community.status == CommunityStatus.ACTIVE.value,
        )
        total = query.count()
        communities = query.order_by(Community.id.desc()).limit(limit).offset(offset).all()
        return communities, total
    
    def find_public_communities(self, limit: int = 50, offset: int = 0) -> tuple:
        """
        Find public communities with pagination
        
        Returns:
            Tuple of (communities, total_count)
        """
        query = Community.query.filter_by(
            visibility=CommunityVisibility.PUBLIC.value, 
            status=CommunityStatus.ACTIVE.value
        )
        total = query.count()
        communities = query.limit(limit).offset(offset).all()
        return communities, total
    
    def search_by_name(
        self,
        search_term: str,
        limit: int = 50,
        offset: int = 0,
        visibility: Optional[str] = None,
        organization_id: Optional[int] = None,
        institution_id: Optional[int] = None,
    ) -> tuple:
        """
        Search communities by name (case-insensitive) with pagination.

        Returns:
            Tuple of (communities, total_count)
        """
        query = Community.query.filter(
            Community.name.ilike(f'%{search_term}%'),
            Community.status == CommunityStatus.ACTIVE.value
        )

        if visibility:
            query = query.filter(Community.visibility == visibility)

        if organization_id is not None:
            query = query.filter(Community.organization_id == organization_id)

        if institution_id is not None:
            query = query.join(Community.organization).filter(Organization.institution_id == institution_id)

        total = query.count()
        communities = query.limit(limit).offset(offset).all()
        return communities, total
    
    def search_by_interest(
        self,
        interest_id: int,
        limit: int = 50,
        offset: int = 0,
        visibility: Optional[str] = None,
        organization_id: Optional[int] = None,
        institution_id: Optional[int] = None,
    ) -> tuple:
        """
        Find communities by interest
        
        Returns:
            Tuple of (communities, total_count)
        """
        query = Community.query.filter(
            Community.interests.any(id=interest_id),
            Community.status == CommunityStatus.ACTIVE.value
        )

        if visibility:
            query = query.filter(Community.visibility == visibility)

        if organization_id is not None:
            query = query.filter(Community.organization_id == organization_id)

        if institution_id is not None:
            query = query.join(Community.organization).filter(Organization.institution_id == institution_id)

        total = query.count()
        communities = query.limit(limit).offset(offset).all()
        return communities, total

    def find_communities(
        self,
        visibility: Optional[str] = None,
        organization_id: Optional[int] = None,
        institution_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple:
        """
        Find active communities with optional visibility filter.

        Returns:
            Tuple of (communities, total_count)
        """
        query = Community.query.filter(Community.status == CommunityStatus.ACTIVE.value)

        if visibility:
            query = query.filter(Community.visibility == visibility)

        if organization_id is not None:
            query = query.filter(Community.organization_id == organization_id)

        if institution_id is not None:
            query = query.join(Community.organization).filter(Organization.institution_id == institution_id)

        total = query.count()
        communities = query.limit(limit).offset(offset).all()
        return communities, total
    
    def update(self, community_id: int, data: Dict[str, Any]) -> Optional[Community]:
        """
        Update community
        
        Args:
            community_id: ID of community to update
            data: Dictionary with fields to update
            
        Returns:
            Updated Community or None if not found
        """
        community = self.find_by_id(community_id)
        if not community:
            logger.warning(f"Community {community_id} not found for update")
            return None
        
        # Update only allowed fields
        allowed_fields = [
            'name', 'slug', 'description', 'banner_url', 'profile_picture_url', 'visibility', 'member_cost', 'status', 'member_count',
            'organization_id',
            'invite_code', 'invite_expires_at', 'invite_max_uses', 'invite_uses', 'invite_status'
        ]
        for key, value in data.items():
            if key in allowed_fields:
                setattr(community, key, value)
        
        db.session.flush()
        logger.info(f"Updated community {community_id}")
        return community
    
    def delete(self, community_id: int) -> bool:
        """
        Delete community (soft delete - set status to closed)
        
        Args:
            community_id: ID of community to delete
            
        Returns:
            True if deleted, False if not found
        """
        community = self.find_by_id(community_id)
        if not community:
            logger.warning(f"Community {community_id} not found for deletion")
            return False
        
        community.status = CommunityStatus.CLOSED.value
        db.session.flush()
        logger.info(f"Closed community {community_id}")
        return True
    
    def find_filtered(
        self,
        community_filter,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple:
        """
        Find communities using a CommunityFilter.

        Applies filter conditions, adds a default ordering by ``id DESC``,
        and returns ``(communities, total_count)``.
        """
        community_filter.apply().order(Community.id.desc())
        return community_filter.paginate(limit=limit, offset=offset)

    def get_all_active(self, limit: int = 100, offset: int = 0) -> tuple:
        """Get all active communities with pagination"""
        query = Community.query.filter_by(status=CommunityStatus.ACTIVE.value)
        total = query.count()
        communities = query.limit(limit).offset(offset).all()
        return communities, total
    
    def increment_member_count(self, community_id: int, increment: int = 1) -> None:
        """Increment member count"""
        community = self.find_by_id(community_id)
        if community:
            community.member_count += increment
            db.session.flush()
    
    def decrement_member_count(self, community_id: int, decrement: int = 1) -> None:
        """Decrement member count"""
        community = self.find_by_id(community_id)
        if community:
            community.member_count = max(0, community.member_count - decrement)
            db.session.flush()
