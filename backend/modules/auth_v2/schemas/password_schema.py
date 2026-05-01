"""
Password Schema - Marshmallow schemas for password operations

Provides:
- ChangePasswordSchema: Input validation for password changes
"""
from marshmallow import Schema, fields, validate, validates, validates_schema, ValidationError, EXCLUDE
import re


class ChangePasswordSchema(Schema):
    """
    Schema for change password input validation.
    
    Replaces ChangePasswordValidator (Pydantic).
    """
    class Meta:
        unknown = EXCLUDE
    
    current_password = fields.Str(
        required=True,
        validate=validate.Length(min=1),
        load_only=True,
        metadata={'description': 'Current password'}
    )
    new_password = fields.Str(
        required=True,
        validate=validate.Length(min=8),
        load_only=True,
        metadata={'description': 'New password (min 8 characters)'}
    )
    confirm_password = fields.Str(
        required=True,
        validate=validate.Length(min=8),
        load_only=True,
        metadata={'description': 'Confirm new password'}
    )
    
    @validates('new_password')
    def validate_new_password(self, value, **kwargs):
        """Ensure new password meets security requirements."""
        errors = []
        
        if len(value) < 8:
            errors.append('at least 8 characters')
        if not re.search(r'[A-Z]', value):
            errors.append('one uppercase letter')
        if not re.search(r'[a-z]', value):
            errors.append('one lowercase letter')
        if not re.search(r'\d', value):
            errors.append('one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            errors.append('one special character (!@#$%^&*)')
        
        if errors:
            raise ValidationError(f"Password must contain: {', '.join(errors)}")
    
    @validates_schema
    def validate_passwords_match(self, data, **kwargs):
        """Ensure new_password and confirm_password match."""
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if new_password and confirm_password and new_password != confirm_password:
            raise ValidationError(
                'Passwords do not match',
                field_name='confirm_password'
            )
