"""
CommunityMember Model
Manages community membership - tracks users in communities with roles.

SOLID Principles:
- Single Responsibility: Only handles membership data persistence
- Open/Closed: Extensible for new roles/statuses
- Liskov Substitution: Can be substituted wherever db.Model is expected
- Interface Segregation: Clean interface with role-based queries
- Dependency Inversion: Depends on SQLAlchemy abstraction
"""
from datetime import datetime
from typing import Optional, Dict, Any
from modules.auth_v2.extensions import db
from sqlalchemy import func, UniqueConstraint


class CommunityMember(db.Model):
    """
    Community Member Model - Represents a user's membership in a community.
    
    Attributes:
        id: Primary key
        community_id: FK to Community
        user_id: FK to User (must be verified)
        role: 'owner', 'admin', or 'member'
        status: 'active', 'suspended', 'left', 'pending_payment'
        joined_at: When user joined community
        created_at: Record creation timestamp
        updated_at: Last update timestamp
    
    Constraints:
        - Unique constraint on (community_id, user_id)
        - Only one owner per community (enforced at service level)
    
    Relationships:
        community: Community (many-to-one)
        user: User (many-to-one)
    """
    __tablename__ = 'community_members'
    
    # Add unique constraint
    __table_args__ = (
        UniqueConstraint('community_id', 'user_id', name='uq_community_user'),
    )
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Role and Status
    role = db.Column(
        db.String(20),
        default='member',
        nullable=False,
        index=True
        # 'owner': Can manage community, move funds, manage members
        # 'admin': Can create bills, manage members (but not move funds)
        # 'member': Can only pay bills, view info
    )
    status = db.Column(
        db.String(20),
        default='active',
        nullable=False,
        index=True
        # 'active': Currently a member
        # 'suspended': Cannot participate (by admin)
        # 'left': User left or removed
        # 'pending_payment': Payment required before activation
    )
    
    # Timestamps
    joined_at = db.Column(
        db.DateTime,
        server_default=func.now(),
        nullable=False
    )
    created_at = db.Column(
        db.DateTime,
        server_default=func.now(),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    community = db.relationship(
        'Community',
        back_populates='members',
        foreign_keys=[community_id]
    )
    
    user = db.relationship(
        'User',
        backref='community_memberships'
    )
    
    def __repr__(self) -> str:
        """String representation"""
        return (
            f"<CommunityMember(id={self.id}, community_id={self.community_id}, "
            f"user_id={self.user_id}, role='{self.role}')>"
        )
    
    def to_dict(self, include_user: bool = False, include_community: bool = False) -> Dict[str, Any]:
        """
        Convert member to dictionary
        
        Args:
            include_user: Include user details (default: False)
            include_community: Include community details (default: False)
            
        Returns:
            Dictionary representation of membership
        """
        data = {
            'id': self.id,
            'community_id': self.community_id,
            'user_id': self.user_id,
            'role': self.role,
            'status': self.status,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_user and self.user:
            user = self.user
            last_seen = getattr(user, 'last_seen_at', None)
            data['user'] = {
                'id': user.id,
                'email': user.email,
                'firstname': user.firstname,
                'lastname': user.lastname,
                'full_name': user.full_name,
                # Surface profile fields the Members page renders directly.
                'profile_photo': getattr(user, 'profile_photo', None),
                'bio': getattr(user, 'bio', None),
                # Presence — populated by the auth middleware that bumps
                # `last_seen_at` on every authenticated request.
                'last_seen_at': last_seen.isoformat() if last_seen else None,
                # `posts_count` is filled in by the resource layer via a
                # batched query — the model can't compute cheaply per row.
            }
        
        if include_community and self.community:
            data['community'] = {
                'id': self.community.id,
                'name': self.community.name,
                'slug': self.community.slug
            }
        
        return data
    
    @property
    def is_owner(self) -> bool:
        """Check if member is owner"""
        return self.role == 'owner' and self.status == 'active'
    
    @property
    def is_admin(self) -> bool:
        """Check if member is admin"""
        return self.role == 'admin' and self.status == 'active'
    
    @property
    def can_manage_bills(self) -> bool:
        """Check if member can create/update bills"""
        return self.role in ['owner', 'admin'] and self.status == 'active'
    
    @property
    def can_manage_funds(self) -> bool:
        """Check if member can move funds (owner only)"""
        return self.role == 'owner' and self.status == 'active'
    
    @property
    def is_active(self) -> bool:
        """Check if membership is active"""
        return self.status == 'active'
