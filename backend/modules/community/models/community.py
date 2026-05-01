"""
Community Model
Manages community entities - groups that pool funds and manage bills.

SOLID Principles:
- Single Responsibility: Only handles community data persistence
- Open/Closed: Extensible for new community types/features
- Liskov Substitution: Can be substituted wherever db.Model is expected
- Interface Segregation: Clean interface with business logic methods
- Dependency Inversion: Depends on SQLAlchemy abstraction
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from modules.auth_v2.extensions import db
from sqlalchemy import func


class Community(db.Model):
    """
    Community Model - Represents a group/community that pools funds.
    
    Attributes:
        id: Primary key
        name: Community name (unique)
        slug: URL-friendly slug (unique)
        description: Community description
        banner_url: Banner image URL
        visibility: 'public' or 'private'
        member_cost: Cost to join (for private communities, in NGN)
        status: 'active', 'suspended', 'closed'
        created_by: FK to User (creator becomes owner)
        member_count: Cached count of active members
        created_at: Timestamp when created
        updated_at: Last update timestamp
    
    Relationships:
        members: CommunityMember (one-to-many)
        wallet: CommunityWallet (one-to-one)
        interests: Interest (many-to-many via community_interests)
        bills: Bill (one-to-many)
        creator: User (many-to-one)
    """
    __tablename__ = 'communities'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Basic Information
    name = db.Column(
        db.String(255), 
        nullable=False, 
        index=True
    )
    slug = db.Column(
        db.String(255), 
        unique=True, 
        nullable=False, 
        index=True
    )
    description = db.Column(db.Text, nullable=True)
    banner_url = db.Column(db.String(500), nullable=True)
    profile_picture_url = db.Column(db.String(500), nullable=True)
    
    # Settings
    visibility = db.Column(
        db.String(20), 
        default='public', 
        nullable=False,
        index=True
        # 'public' = anyone can join
        # 'private' = requires payment
    )
    member_cost = db.Column(
        db.Numeric(15, 2),
        default=Decimal('0.00'),
        nullable=False
        # Cost to join for private communities (in NGN)
    )

    # Invite settings
    invite_code = db.Column(db.String(16), unique=True, nullable=True, index=True)
    invite_expires_at = db.Column(db.DateTime, nullable=True)
    invite_max_uses = db.Column(db.Integer, nullable=True)
    invite_uses = db.Column(db.Integer, nullable=False, default=0)
    invite_status = db.Column(db.String(20), nullable=False, default='active')
    
    # Status Tracking
    status = db.Column(
        db.String(20),
        default='active',
        nullable=False,
        index=True
        # 'active', 'suspended', 'closed'
    )
    
    # Creator (becomes owner)
    created_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    organization_id = db.Column(
        db.Integer,
        db.ForeignKey('organizations.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )
    
    # Metadata
    member_count = db.Column(db.Integer, default=0, nullable=False)
    
    # Timestamps
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
    members = db.relationship(
        'CommunityMember',
        back_populates='community',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    
    wallet = db.relationship(
        'CommunityWallet',
        back_populates='community',
        uselist=False,
        cascade='all, delete-orphan'
    )
    
    interests = db.relationship(
        'Interest',
        secondary='community_interests',
        back_populates='communities',
        lazy='dynamic'
    )
    
    bills = db.relationship(
        'Bill',
        back_populates='community',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    posts = db.relationship(
        'CommunityPost',
        back_populates='community',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    
    creator = db.relationship(
        'User',
        foreign_keys=[created_by],
        backref='created_communities'
    )

    organization = db.relationship(
        'Organization',
        back_populates='communities',
        foreign_keys=[organization_id]
    )
    
    def __repr__(self) -> str:
        """String representation"""
        return f"<Community(id={self.id}, name='{self.name}', visibility='{self.visibility}')>"
    
    def to_dict(
        self,
        include_wallet: bool = False,
        include_members: bool = False,
        current_user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Convert community to dictionary
        
        Args:
            include_wallet: Include wallet info (default: False)
            include_members: Include member list (default: False)
            
        Returns:
            Dictionary representation of community
        """
        category_values = []
        subcategory_values = []
        interest_values = []
        legacy_interest_values = []

        for interest in self.interests:
            name = interest.name or ''
            if name.startswith('category::'):
                category_values.append(name.replace('category::', '', 1))
            elif name.startswith('subcategory::'):
                subcategory_values.append(name.replace('subcategory::', '', 1))
            elif name.startswith('interest::'):
                interest_values.append(name.replace('interest::', '', 1))
            else:
                legacy_interest_values.append(name)

        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'banner_url': self.banner_url,
            'community_cover_photo': self.banner_url,
            'community_profile_picture': self.profile_picture_url,
            'visibility': self.visibility,
            'member_cost': float(self.member_cost) if self.member_cost else 0.0,
            'status': self.status,
            'created_by': self.created_by,
            'organization_id': self.organization_id,
            'institution_id': self.organization.institution_id if self.organization else None,
            'member_count': self.member_count,
            'is_joined': self.is_member(current_user_id) if current_user_id else False,
            'posts_count': self.posts.filter_by(status='active').count(),
            'category': category_values,
            'subcategory': subcategory_values,
            'interest': interest_values,
            'interests': legacy_interest_values + interest_values,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'invite': {
                'code': self.invite_code,
                'expires_at': self.invite_expires_at.isoformat() if self.invite_expires_at else None,
                'max_uses': self.invite_max_uses,
                'uses': self.invite_uses,
                'status': self.invite_status,
            },
        }
        
        if include_wallet and self.wallet:
            data['wallet'] = {
                'id': self.wallet.id,
                'balance': float(self.wallet.balance),
                'account_number': self.wallet.account_number,
                'status': self.wallet.status
            }
        
        if include_members:
            data['members'] = [
                {
                    'id': member.id,
                    'user_id': member.user_id,
                    'role': member.role,
                    'status': member.status,
                    'joined_at': member.joined_at.isoformat() if member.joined_at else None
                }
                for member in self.members
            ]
        
        return data
    
    def is_member(self, user_id: int) -> bool:
        """Check if user is a member of this community"""
        return self.members.filter_by(
            user_id=user_id,
            status='active'
        ).first() is not None
    
    def get_member_role(self, user_id: int) -> Optional[str]:
        """Get user's role in community"""
        member = self.members.filter_by(user_id=user_id, status='active').first()
        return member.role if member else None
    
    def is_owner_or_admin(self, user_id: int) -> bool:
        """Check if user is owner or admin"""
        role = self.get_member_role(user_id)
        return role in ['owner', 'admin']
