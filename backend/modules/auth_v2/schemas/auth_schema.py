"""
Auth Schemas - Marshmallow schemas for authentication operations

Provides input validation and output serialization for:
- Signup
- Login
- Email verification
- OTP verification
- Password reset
"""
from marshmallow import Schema, fields, validate, validates, validates_schema, ValidationError, EXCLUDE, INCLUDE, post_load
from datetime import datetime
import re


class SignupSchema(Schema):
    """Schema for user signup input validation."""
    class Meta:
        unknown = EXCLUDE
    
    email = fields.Email(
        load_default=None,
        allow_none=True,
        metadata={'description': 'Optional user email address'}
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8),
        load_only=True,
        metadata={'description': 'Password (min 8 chars)'}
    )
    firstname = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=50),
        metadata={'description': 'First name'}
    )
    lastname = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=50),
        metadata={'description': 'Last name'}
    )
    date_of_birth = fields.Str(
        load_default=None,
        allow_none=True,
        metadata={'description': 'Date of birth (YYYY-MM-DD)'}
    )
    phone_number = fields.Str(
        required=True,
        validate=validate.Length(max=20),
        metadata={'description': 'Phone number'}
    )
    nin = fields.Str(
        load_default=None,
        metadata={'description': 'National ID Number'}
    )
    role = fields.Str(
        load_default='user',
        validate=validate.OneOf(['user', 'admin']),
        metadata={'description': 'User role'}
    )
    
    @validates('firstname')
    def validate_firstname(self, value, **kwargs):
        """Ensure firstname contains only letters and spaces."""
        if not re.match(r'^[a-zA-Z\s]+$', value):
            raise ValidationError('Name must contain only letters and spaces')
    
    @validates('lastname')
    def validate_lastname(self, value, **kwargs):
        """Ensure lastname contains only letters and spaces."""
        if not re.match(r'^[a-zA-Z\s]+$', value):
            raise ValidationError('Name must contain only letters and spaces')
    
    @validates('password')
    def validate_password(self, value, **kwargs):
        """Ensure password meets security requirements."""
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
    
    @validates('date_of_birth')
    def validate_dob(self, value, **kwargs):
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
    
    @validates('phone_number')
    def validate_phone_number(self, value, **kwargs):
        """Validate phone number format."""
        if value is None:
            return
        
        cleaned = re.sub(r'[\s\-]', '', value)
        if not re.match(r'^\+?\d{10,15}$', cleaned):
            raise ValidationError('Invalid phone number format')
    
    @post_load
    def process_data(self, data, **kwargs):
        """Clean up data after loading."""
        if data.get('firstname'):
            data['firstname'] = data['firstname'].strip()
        if data.get('lastname'):
            data['lastname'] = data['lastname'].strip()
        if data.get('email'):
            data['email'] = data['email'].lower().strip()
        if data.get('phone_number'):
            data['phone_number'] = re.sub(r'[\s\-()]', '', data['phone_number'].strip())
        return data


class LoginSchema(Schema):
    """Schema for user login input validation."""
    class Meta:
        unknown = EXCLUDE
    
    identifier = fields.Str(
        load_default=None,
        metadata={'description': 'User email address or phone number'}
    )
    email = fields.Str(
        load_default=None,
        metadata={'description': 'Deprecated. Use identifier; kept for older clients.'}
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=1),
        load_only=True,
        metadata={'description': 'User password'}
    )
    remember = fields.Bool(
        load_default=False,
        metadata={'description': 'Remember login session'}
    )
    
    @validates_schema
    def validate_identifier(self, data, **kwargs):
        """Require either the new identifier field or legacy email field."""
        if not (data.get('identifier') or data.get('email')):
            raise ValidationError('Email or phone number is required', field_name='identifier')
    
    @post_load
    def process_data(self, data, **kwargs):
        """Clean up data after loading."""
        identifier = data.get('identifier') or data.get('email')
        if identifier:
            identifier = identifier.strip()
            data['identifier'] = identifier.lower() if '@' in identifier else re.sub(r'[\s\-()]', '', identifier)
        return data


class VerifyOTPSchema(Schema):
    """Schema for OTP verification input validation."""
    class Meta:
        unknown = EXCLUDE
    
    email = fields.Email(required=True, metadata={'description': 'User email address'})
    otp = fields.Str(
        required=True,
        validate=validate.Length(equal=6),
        metadata={'description': '6-digit OTP code'}
    )
    remember = fields.Bool(
        load_default=False,
        metadata={'description': 'Remember login session (for login OTP)'}
    )
    
    @validates('otp')
    def validate_otp(self, value, **kwargs):
        """Ensure OTP is 6 digits."""
        if not value.isdigit():
            raise ValidationError('OTP must be 6 digits')
    
    @post_load
    def process_data(self, data, **kwargs):
        """Clean up data after loading."""
        if data.get('email'):
            data['email'] = data['email'].lower().strip()
        return data


class ResendOTPSchema(Schema):
    """Schema for resend OTP request."""
    class Meta:
        unknown = EXCLUDE
    
    email = fields.Email(required=True, metadata={'description': 'User email address'})
    
    @post_load
    def process_data(self, data, **kwargs):
        """Clean up data after loading."""
        if data.get('email'):
            data['email'] = data['email'].lower().strip()
        return data


class ForgotPasswordSchema(Schema):
    """Schema for forgot password request."""
    class Meta:
        unknown = EXCLUDE
    
    email = fields.Email(required=True, metadata={'description': 'User email address'})
    
    @post_load
    def process_data(self, data, **kwargs):
        """Clean up data after loading."""
        if data.get('email'):
            data['email'] = data['email'].lower().strip()
        return data


class ResetPasswordSchema(Schema):
    """Schema for password reset."""
    class Meta:
        unknown = EXCLUDE
    
    email = fields.Email(required=True, metadata={'description': 'User email address'})
    otp = fields.Str(
        required=True,
        validate=validate.Length(equal=6),
        metadata={'description': '6-digit OTP code'}
    )
    new_password = fields.Str(
        required=True,
        validate=validate.Length(min=8),
        load_only=True,
        metadata={'description': 'New password (min 8 chars)'}
    )
    
    @validates('otp')
    def validate_otp(self, value, **kwargs):
        """Ensure OTP is 6 digits."""
        if not value.isdigit():
            raise ValidationError('OTP must be 6 digits')
    
    @validates('new_password')
    def validate_new_password(self, value, **kwargs):
        """Ensure password meets security requirements."""
        errors = []
        
        if len(value) < 8:
            errors.append('at least 8 characters')
        if not re.search(r'[A-Z]', value):
            errors.append('one uppercase letter')
        if not re.search(r'[a-z]', value):
            errors.append('one lowercase letter')
        if not re.search(r'\d', value):
            errors.append('one number')
        
        if errors:
            raise ValidationError(f"Password must contain: {', '.join(errors)}")


# Response schemas

class UserResponseSchema(Schema):
    """Schema for user data in responses."""
    id = fields.Int()
    email = fields.Email()
    firstname = fields.Str()
    lastname = fields.Str()
    full_name = fields.Str()
    role = fields.Str()
    email_verified = fields.Bool()
    profile_image = fields.Str(allow_none=True)
    header_image = fields.Str(allow_none=True)


class AuthVerificationStatusSchema(Schema):
    """Schema for verification status in responses."""
    bvn_verified = fields.Bool()
    nin_verified = fields.Bool()
    verification_status = fields.Str(allow_none=True)


class TokensResponseSchema(Schema):
    """Schema for tokens in responses."""
    access_token = fields.Str()
    refresh_token = fields.Str()
    token_type = fields.Str(dump_default='Bearer')
    expires_in = fields.Int()


class PortalAccessSchema(Schema):
    """Schema for portal routing metadata in login responses."""
    platform_admin = fields.Bool(required=True)
    platform_role = fields.Str(allow_none=True)
    recommended_portal = fields.Str(required=True)


class AuthSuccessSchema(Schema):
    """Schema for successful auth response."""
    class Meta:
        # Allow extra fields to pass through
        include_unknown_fields = True
    
    success = fields.Bool(dump_default=True)
    message = fields.Str()
    user = fields.Nested(UserResponseSchema, allow_none=True)
    verification = fields.Nested(AuthVerificationStatusSchema, allow_none=True)
    portal_access = fields.Nested(PortalAccessSchema, allow_none=True)
    tokens = fields.Nested(TokensResponseSchema, allow_none=True)
    # For signup - may include user_id directly
    user_id = fields.Int(allow_none=True)
    # For OTP flows
    requires_otp = fields.Bool(allow_none=True)
    otp_sent = fields.Bool(allow_none=True)


class AuthErrorSchema(Schema):
    """Schema for auth error response."""
    success = fields.Bool(dump_default=False)
    error = fields.Str()
    message = fields.Str()


class ApiSuccessEnvelopeSchema(Schema):
    """
    Standard API success envelope.

    Matches modules/core/response_formatter.format_data:
    {success: true, message: str, data: any}
    """

    class Meta:
        unknown = INCLUDE

    success = fields.Bool(dump_default=True)
    message = fields.Str()
    data = fields.Raw(allow_none=True)


class ApiErrorEnvelopeSchema(Schema):
    """
    Standard API error envelope.

    Matches modules/core/response_formatter.format_error / format_internal_error:
    {success: false, error: str, message: str, errors?: object, details?: any, ...}
    """

    class Meta:
        unknown = INCLUDE

    success = fields.Bool(dump_default=False)
    error = fields.Str(required=True)
    message = fields.Str(required=True)
    errors = fields.Dict(keys=fields.Str(), values=fields.Raw(), allow_none=True)
    details = fields.Raw(allow_none=True)


class HealthSchema(Schema):
    """Schema for health check response."""
    status = fields.Str()
    service = fields.Str()
    version = fields.Str()
