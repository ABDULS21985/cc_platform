"""
Marshmallow Schemas for Member Operations
Request validation and response serialization for member endpoints
"""
from marshmallow import Schema, fields, validate


# ============================================================
# Request Schemas
# ============================================================

class InviteMemberSchema(Schema):
    """Schema for invite member request"""
    email = fields.Email(
        required=True,
        metadata={
            'description': 'Email address to invite',
            'example': 'user@example.com'
        }
    )
    
    role = fields.String(
        load_default='member',
        validate=validate.OneOf(['member', 'admin']),
        metadata={
            'description': 'Role to assign',
            'example': 'member'
        }
    )


class UpdateMemberRoleSchema(Schema):
    """Schema for update member role request"""
    role = fields.String(
        required=True,
        validate=validate.OneOf(['member', 'admin', 'owner']),
        metadata={
            'description': 'New role for member',
            'example': 'admin'
        }
    )


class MemberListQuerySchema(Schema):
    """Query parameters for listing community members."""
    status = fields.String(
        load_default='active',
        validate=validate.OneOf(['active', 'suspended', 'left', 'pending_payment']),
        metadata={'description': 'Filter by membership status'}
    )
    role = fields.String(
        load_default=None,
        validate=validate.OneOf(['owner', 'admin', 'member']),
        metadata={'description': 'Filter by member role'}
    )
    limit = fields.Integer(
        load_default=50,
        validate=validate.Range(min=1, max=200),
        metadata={'description': 'Page size'}
    )
    offset = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
        metadata={'description': 'Pagination offset'}
    )
    q = fields.String(
        load_default=None,
        validate=validate.Length(min=1, max=100),
        metadata={
            'description': (
                'Optional name/email prefix search. Matches firstname, '
                'lastname or email starting with the provided value '
                '(case-insensitive).'
            )
        },
    )
    mentionable = fields.Boolean(
        load_default=False,
        metadata={
            'description': (
                'When true, restrict results to active members of this '
                'community (used by the @-autocomplete in the post composer).'
            )
        },
    )


# ============================================================
# Response Schemas
# ============================================================

class MemberDataSchema(Schema):
    """Member data schema for responses"""
    id = fields.Integer(metadata={'description': 'Membership ID'})
    user_id = fields.Integer(metadata={'description': 'User ID'})
    community_id = fields.Integer(metadata={'description': 'Community ID'})
    role = fields.String(metadata={'description': 'Member role: member, admin, owner'})
    status = fields.String(metadata={'description': 'Membership status'})
    joined_at = fields.String(metadata={'description': 'Join timestamp'})
    user = fields.Dict(metadata={'description': 'User details'})


class MemberResponseSchema(Schema):
    """Response schema for single member"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(MemberDataSchema)


class MemberListDataSchema(Schema):
    """Member list with pagination"""
    members = fields.List(fields.Nested(MemberDataSchema))
    pagination = fields.Dict(metadata={'description': 'Pagination info'})


class MemberListResponseSchema(Schema):
    """Response schema for member list"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(MemberListDataSchema)
