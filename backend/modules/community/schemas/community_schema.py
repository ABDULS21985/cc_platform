"""
Marshmallow Schemas for Community Operations
Request validation and response serialization for community endpoints
"""
from marshmallow import Schema, fields, validate, validates, ValidationError
from decimal import Decimal


# ============================================================
# Request Schemas
# ============================================================

class CreateCommunitySchema(Schema):
    """Schema for community creation request"""
    name = fields.String(
        required=True,
        validate=validate.Length(min=3, max=100),
        metadata={
            'description': 'Community name (3-100 characters)',
            'example': 'Lagos Tech Community'
        }
    )
    
    description = fields.String(
        load_default=None,
        validate=validate.Length(max=500),
        metadata={
            'description': 'Community description (max 500 characters)',
            'example': 'A community for tech professionals in Lagos'
        }
    )
    
    visibility = fields.String(
        load_default='public',
        validate=validate.OneOf(['public', 'private']),
        metadata={
            'description': 'Community visibility',
            'example': 'public'
        }
    )
    
    member_cost = fields.Decimal(
        load_default=Decimal('0.0'),
        as_string=True,
        metadata={
            'description': 'Membership cost (0 for free)',
            'example': '5000.00'
        }
    )
    
    interest_ids = fields.List(
        fields.Integer(),
        load_default=[],
        metadata={
            'description': 'List of interest category IDs',
            'example': [1, 2, 3]
        }
    )

    category = fields.List(
        fields.String(validate=validate.Length(min=1, max=100)),
        load_default=[],
        metadata={
            'description': 'Community categories as a list of names',
            'example': ['Technology', 'Education']
        }
    )

    subcategory = fields.List(
        fields.String(validate=validate.Length(min=1, max=100)),
        load_default=[],
        metadata={
            'description': 'Community subcategories as a list of names',
            'example': ['Software Development', 'AI']
        }
    )

    interest = fields.List(
        fields.String(validate=validate.Length(min=1, max=100)),
        load_default=[],
        metadata={
            'description': 'Community interests as a list of names',
            'example': ['Python', 'Open Source']
        }
    )

    community_cover_photo = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=500),
        metadata={
            'description': 'Community cover photo URL',
            'example': 'https://res.cloudinary.com/demo/image/upload/community-cover.jpg'
        }
    )

    community_profile_picture = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=500),
        metadata={
            'description': 'Community profile picture URL',
            'example': 'https://res.cloudinary.com/demo/image/upload/community-avatar.jpg'
        }
    )

    institution_id = fields.Integer(
        load_default=None,
        allow_none=True,
        metadata={
            'description': 'Optional institution context for default organization resolution',
            'example': 1,
        },
    )

    organization_id = fields.Integer(
        load_default=None,
        allow_none=True,
        metadata={
            'description': 'Optional organization ID. If omitted, default organization is auto-created/reused',
            'example': 2,
        },
    )
    
    @validates('member_cost')
    def validate_member_cost(self, value, **kwargs):
        """Ensure member cost is non-negative"""
        if value < 0:
            raise ValidationError('Member cost must be >= 0')


class UpdateCommunitySchema(Schema):
    """Schema for community update request"""
    name = fields.String(
        validate=validate.Length(min=3, max=100),
        metadata={'description': 'Community name'}
    )
    
    description = fields.String(
        validate=validate.Length(max=500),
        metadata={'description': 'Community description'}
    )
    
    visibility = fields.String(
        validate=validate.OneOf(['public', 'private']),
        metadata={'description': 'Community visibility'}
    )
    
    member_cost = fields.Decimal(
        as_string=True,
        metadata={'description': 'Membership cost'}
    )
    
    status = fields.String(
        validate=validate.OneOf(['active', 'suspended', 'closed']),
        metadata={'description': 'Community status'}
    )
    
    @validates('member_cost')
    def validate_member_cost(self, value, **kwargs):
        """Ensure member cost is non-negative if provided"""
        if value is not None and value < 0:
            raise ValidationError('Member cost must be >= 0')


class CommunityMediaUpdateSchema(Schema):
    """Schema for updating community cover/profile image URLs."""
    url = fields.String(
        required=True,
        validate=validate.Length(min=1, max=500),
        metadata={
            'description': 'Image URL',
            'example': 'https://res.cloudinary.com/demo/image/upload/community-image.jpg'
        }
    )


class SearchCommunitySchema(Schema):
    """Schema for community search query parameters"""
    query = fields.String(
        load_default=None,
        validate=validate.Length(min=1, max=100),
        metadata={'description': 'Search query'}
    )
    
    interest_id = fields.Integer(
        load_default=None,
        metadata={'description': 'Filter by interest category'}
    )
    
    visibility = fields.String(
        load_default=None,
        validate=validate.OneOf(['public', 'private']),
        metadata={'description': 'Filter by visibility'}
    )

    institution_id = fields.Integer(
        load_default=None,
        metadata={'description': 'Filter by institution ID'}
    )

    organization_id = fields.Integer(
        load_default=None,
        metadata={'description': 'Filter by organization ID'}
    )
    
    limit = fields.Integer(
        load_default=20,
        validate=validate.Range(min=1, max=100),
        metadata={'description': 'Results per page'}
    )
    
    offset = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
        metadata={'description': 'Pagination offset'}
    )

    sort = fields.String(
        load_default='recent',
        validate=validate.OneOf(['recent', 'popular', 'newest']),
        metadata={'description': 'Sort order: recent (default), popular (most members first), newest (created_at desc)'},
    )


# ============================================================
# Response Schemas
# ============================================================

class CommunityDataSchema(Schema):
    """Community data schema for responses"""
    id = fields.Integer(metadata={'description': 'Community ID'})
    name = fields.String(metadata={'description': 'Community name'})
    slug = fields.String(metadata={'description': 'URL-friendly slug'})
    description = fields.String(allow_none=True, metadata={'description': 'Description'})
    visibility = fields.String(metadata={'description': 'public or private'})
    member_cost = fields.String(metadata={'description': 'Membership cost'})
    status = fields.String(metadata={'description': 'Community status'})
    member_count = fields.Integer(metadata={'description': 'Number of members'})
    is_joined = fields.Boolean(metadata={'description': 'Whether authenticated user is an active member'})
    category = fields.List(fields.String(), metadata={'description': 'Community categories'})
    subcategory = fields.List(fields.String(), metadata={'description': 'Community subcategories'})
    interest = fields.List(fields.String(), metadata={'description': 'Community interests'})
    community_cover_photo = fields.String(allow_none=True, metadata={'description': 'Community cover photo URL'})
    community_profile_picture = fields.String(allow_none=True, metadata={'description': 'Community profile picture URL'})
    created_at = fields.String(metadata={'description': 'Creation timestamp'})
    created_by = fields.Integer(metadata={'description': 'Creator user ID'})
    organization_id = fields.Integer(allow_none=True, metadata={'description': 'Parent organization ID'})
    institution_id = fields.Integer(allow_none=True, metadata={'description': 'Parent institution ID'})


class CommunityResponseSchema(Schema):
    """Response schema for single community"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityDataSchema)


class CommunityListDataSchema(Schema):
    """Community list with pagination"""
    communities = fields.List(fields.Nested(CommunityDataSchema))
    pagination = fields.Dict(metadata={'description': 'Pagination info'})


class CommunityListResponseSchema(Schema):
    """Response schema for community list"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityListDataSchema)


class CommunityErrorSchema(Schema):
    """Error response schema"""
    success = fields.Boolean(dump_default=False)
    error = fields.String(metadata={'description': 'Error code'})
    message = fields.String(metadata={'description': 'Error message'})
