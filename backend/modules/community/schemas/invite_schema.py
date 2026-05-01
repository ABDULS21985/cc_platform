"""
Marshmallow Schemas for Invite Operations
Request validation and response serialization for invite endpoints
"""
from marshmallow import Schema, fields, validate


# ============================================================
# Request Schemas
# ============================================================

class CreateInviteSchema(Schema):
    """Schema for invite creation request"""
    expires_in_days = fields.Integer(
        load_default=7,
        validate=validate.Range(min=1, max=365),
        metadata={
            'description': 'Invite validity in days (1-365)',
            'example': 7
        }
    )
    
    max_uses = fields.Integer(
        load_default=None,
        validate=validate.Range(min=1, max=10000),
        metadata={
            'description': 'Maximum number of uses (null for unlimited)',
            'example': 50
        }
    )
    
    regenerate = fields.Boolean(
        load_default=False,
        metadata={
            'description': 'Whether to regenerate existing invite',
            'example': False
        }
    )


class JoinViaInviteSchema(Schema):
    """Schema for join via invite code"""
    invite_code = fields.String(
        required=True,
        validate=validate.Length(min=6, max=20),
        metadata={
            'description': 'Community invite code',
            'example': 'xY9kL2pQ8w'
        }
    )


# ============================================================
# Response Schemas
# ============================================================

class InviteDataSchema(Schema):
    """Invite data schema for responses"""
    invite_code = fields.String(metadata={'description': 'Invite code'})
    invite_url = fields.String(metadata={'description': 'Full invite URL'})
    expires_at = fields.String(metadata={'description': 'Expiry timestamp'})
    max_uses = fields.Integer(allow_none=True, metadata={'description': 'Max uses'})
    uses = fields.Integer(metadata={'description': 'Current use count'})
    status = fields.String(metadata={'description': 'Invite status'})


class InviteResponseSchema(Schema):
    """Response schema for invite operations"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(InviteDataSchema)


class InviteInfoDataSchema(Schema):
    """Invite info for public access"""
    community_id = fields.Integer(metadata={'description': 'Community ID'})
    community_name = fields.String(metadata={'description': 'Community name'})
    community_description = fields.String(allow_none=True, metadata={'description': 'Description'})
    visibility = fields.String(metadata={'description': 'Community visibility'})
    member_cost = fields.String(metadata={'description': 'Membership cost'})
    is_valid = fields.Boolean(metadata={'description': 'Whether invite is valid'})
    requires_payment = fields.Boolean(metadata={'description': 'Whether payment is required'})


class InviteInfoResponseSchema(Schema):
    """Response schema for invite info lookup"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(InviteInfoDataSchema)
