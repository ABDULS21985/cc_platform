"""
Interest Model & Association Table
Manages community interests/tags - categorization system for communities.

SOLID Principles:
- Single Responsibility: Only handles interest data persistence
- Open/Closed: Extensible for new interest types
- Liskov Substitution: Can be substituted wherever db.Model is expected
- Interface Segregation: Clean interface for queries
- Dependency Inversion: Depends on SQLAlchemy abstraction
"""
from typing import Dict, Any
from modules.auth_v2.extensions import db


# Association table for many-to-many relationship
community_interests = db.Table(
    'community_interests',
    db.Column(
        'community_id',
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        primary_key=True,
        index=True
    ),
    db.Column(
        'interest_id',
        db.Integer,
        db.ForeignKey('interests.id', ondelete='CASCADE'),
        primary_key=True,
        index=True
    )
)


class Interest(db.Model):
    """
    Interest Model - Tags for categorizing communities.
    
    Examples: 'sports', 'culture', 'tech', 'music', 'business', 'fitness'
    
    Attributes:
        id: Primary key
        name: Interest name (lowercase, unique)
        slug: URL-friendly slug (lowercase, unique)
        
    Relationships:
        communities: Community (many-to-many via community_interests table)
    """
    __tablename__ = 'interests'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Name and Slug
    name = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        index=True
        # Examples: 'sports', 'culture', 'technology', 'business'
    )
    slug = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        index=True
        # Lowercase version: 'sports', 'culture', 'technology', 'business'
    )
    
    # Relationships
    communities = db.relationship(
        'Community',
        secondary=community_interests,
        back_populates='interests',
        lazy='dynamic'
    )
    
    def __repr__(self) -> str:
        """String representation"""
        return f"<Interest(id={self.id}, name='{self.name}')>"
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert interest to dictionary
        
        Returns:
            Dictionary representation of interest
        """
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
        }
