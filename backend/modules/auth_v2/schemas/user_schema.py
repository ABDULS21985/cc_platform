"""
User Schema - Marshmallow schema for User model serialization

Used for:
- Output serialization (JSON responses)
- Consistent user data format across all endpoints
"""
from marshmallow import Schema, fields, post_dump, EXCLUDE


class UserSummarySchema(Schema):
    """
    Lightweight user schema for nested references and lists.
    
    Use when embedding user in other resources or in list views.
    """
    class Meta:
        unknown = EXCLUDE
    
    id = fields.Int(dump_only=True)
    email = fields.Email(dump_only=True)
    firstname = fields.Str()
    lastname = fields.Str()
    full_name = fields.Str(dump_only=True)
    profile_photo = fields.Str()


class UserSchema(Schema):
    """
    Full user schema for detailed user data.
    
    Matches the User.to_dict() output format for backward compatibility.
    """
    class Meta:
        unknown = EXCLUDE
    
    # Primary fields
    id = fields.Int(dump_only=True)
    firebase_uid = fields.Str(dump_only=True)
    email = fields.Email(dump_only=True)
    
    # Profile fields
    firstname = fields.Str()
    lastname = fields.Str()
    full_name = fields.Str(dump_only=True)
    date_of_birth = fields.Str()
    phone_number = fields.Str()
    nin = fields.Str()
    bio = fields.Str()
    profile_photo = fields.Str()
    header_image = fields.Str()
    
    # Role and status
    role = fields.Str(dump_only=True)
    email_verified = fields.Bool(dump_only=True)
    bvn_verified = fields.Bool(dump_only=True)
    nin_verified = fields.Bool(dump_only=True)
    verification_status = fields.Str(dump_only=True)
    
    # Timestamps
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
