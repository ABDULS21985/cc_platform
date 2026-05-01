"""
Profile Schema - Marshmallow schemas for profile operations

Provides:
- ProfileSchema: Output serialization for profile responses
- ProfileUpdateSchema: Input validation for profile updates
"""
from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE, INCLUDE
from datetime import datetime
import re


class ProfileSchema(Schema):
    """
    Schema for profile output (serialization).
    
    Matches the format returned by ProfileService.get_profile()
    """
    class Meta:
        unknown = EXCLUDE
    
    # Primary fields
    id = fields.Int(dump_only=True)
    email = fields.Email(dump_only=True)
    firebase_uid = fields.Str(dump_only=True)
    
    # Profile fields
    firstname = fields.Str()
    lastname = fields.Str()
    full_name = fields.Str(dump_only=True)
    date_of_birth = fields.Str()
    phone_number = fields.Str()
    bio = fields.Str()
    profile_photo = fields.Str()
    header_image = fields.Str()
    nin = fields.Str()
    
    # Verification status
    role = fields.Str(dump_only=True)
    email_verified = fields.Bool(dump_only=True)
    bvn_verified = fields.Bool(dump_only=True)
    nin_verified = fields.Bool(dump_only=True)
    verification_status = fields.Str(dump_only=True)
    
    # Timestamps - use Str since they may come as ISO strings from service
    created_at = fields.Str(dump_only=True)
    updated_at = fields.Str(dump_only=True)


class ProfileEnvelopeSchema(Schema):
    """Standard API envelope for profile responses."""

    class Meta:
        unknown = INCLUDE

    success = fields.Bool(dump_default=True)
    message = fields.Str()
    data = fields.Nested(ProfileSchema, allow_none=True)


class ProfileUpdateSchema(Schema):
    """
    Schema for profile update input (deserialization).
    
    All fields are optional - only provided fields will be updated.
    Replaces ProfileUpdateValidator (Pydantic).
    """
    class Meta:
        unknown = EXCLUDE
    
    firstname = fields.Str(
        validate=validate.Length(min=2, max=100),
        load_default=None
    )
    lastname = fields.Str(
        validate=validate.Length(min=2, max=100),
        load_default=None
    )
    phone_number = fields.Str(
        validate=validate.Length(max=20),
        load_default=None
    )
    date_of_birth = fields.Str(
        validate=validate.Length(max=50),
        load_default=None
    )
    bio = fields.Str(
        validate=validate.Length(max=500),
        load_default=None
    )
    
    @validates('firstname')
    def validate_firstname(self, value, **kwargs):
        """Ensure firstname contains only letters and spaces."""
        if value is None:
            return
        if not value.strip():
            raise ValidationError('Firstname cannot be empty')
        if not re.match(r'^[a-zA-Z\s]+$', value):
            raise ValidationError('Firstname must contain only letters and spaces')
    
    @validates('lastname')
    def validate_lastname(self, value, **kwargs):
        """Ensure lastname contains only letters and spaces."""
        if value is None:
            return
        if not value.strip():
            raise ValidationError('Lastname cannot be empty')
        if not re.match(r'^[a-zA-Z\s]+$', value):
            raise ValidationError('Lastname must contain only letters and spaces')
    
    @validates('phone_number')
    def validate_phone_number(self, value, **kwargs):
        """Validate phone number format."""
        if value is None:
            return
        
        # Remove spaces and dashes
        cleaned = re.sub(r'[\s\-]', '', value)
        
        # Check if it's a valid format (10-15 digits, optional + prefix)
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            raise ValidationError('Invalid phone number format')
    
    @validates('date_of_birth')
    def validate_date_of_birth(self, value, **kwargs):
        """Validate date of birth format and age."""
        if value is None:
            return
        
        try:
            dob = datetime.strptime(value, '%Y-%m-%d')
            age = (datetime.now() - dob).days / 365.25
            
            if age < 13:
                raise ValidationError('Must be at least 13 years old')
            if age > 120:
                raise ValidationError('Invalid date of birth')
                
        except ValueError:
            raise ValidationError('Date must be in YYYY-MM-DD format')
