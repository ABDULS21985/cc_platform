"""
Marshmallow Schemas for Verification Requests
Replaces Pydantic validators - ensures data integrity before processing
"""
from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from datetime import datetime
import re


class BVNSchema(Schema):
    """
    Schema for BVN verification requests
    
    BVN Format:
    - Exactly 11 digits
    - Numeric only
    - No spaces or special characters
    """
    bvn = fields.String(
        required=True,
        validate=validate.Length(equal=11),
        metadata={
            'description': 'Bank Verification Number (11 digits)',
            'example': '22222222221'
        }
    )
    
    date_of_birth = fields.String(
        required=True,
        metadata={
            'description': 'Date of birth in YYYY-MM-DD format',
            'example': '1990-01-15'
        }
    )
    
    @validates('bvn')
    def validate_bvn_format(self, value, **kwargs):
        """
        Validate BVN format
        - Must be exactly 11 digits
        - Must be numeric only
        """
        if not value.isdigit():
            raise ValidationError('BVN must contain only numbers')
        
        if len(value) != 11:
            raise ValidationError('BVN must be exactly 11 digits')
    
    @validates('date_of_birth')
    def validate_date_of_birth(self, value, **kwargs):
        """
        Validate date of birth format and value
        - Must be in YYYY-MM-DD format
        - Must be a valid date
        - User must be at least 18 years old
        """
        # Check format
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', value):
            raise ValidationError('Date of birth must be in YYYY-MM-DD format')
        
        # Parse and validate date
        try:
            dob = datetime.strptime(value, '%Y-%m-%d')
        except ValueError:
            raise ValidationError('Invalid date of birth')
        
        # Check age (must be 18+)
        today = datetime.now()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        if age < 18:
            raise ValidationError('User must be at least 18 years old')
        
        if age > 120:
            raise ValidationError('Invalid date of birth')


class NINSchema(Schema):
    """
    Schema for NIN verification requests
    
    NIN Format:
    - Exactly 11 digits
    - Numeric only
    - No spaces or special characters
    """
    nin = fields.String(
        required=True,
        validate=validate.Length(equal=11),
        metadata={
            'description': 'National Identification Number (11 digits)',
            'example': '12345678901'
        }
    )
    
    date_of_birth = fields.String(
        required=True,
        metadata={
            'description': 'Date of birth in YYYY-MM-DD format',
            'example': '1990-01-15'
        }
    )
    
    @validates('nin')
    def validate_nin_format(self, value, **kwargs):
        """
        Validate NIN format
        - Must be exactly 11 digits
        - Must be numeric only
        """
        if not value.isdigit():
            raise ValidationError('NIN must contain only numbers')
        
        if len(value) != 11:
            raise ValidationError('NIN must be exactly 11 digits')
    
    @validates('date_of_birth')
    def validate_date_of_birth(self, value, **kwargs):
        """
        Validate date of birth format and value
        - Must be in YYYY-MM-DD format
        - Must be a valid date
        - User must be at least 18 years old
        """
        # Check format
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', value):
            raise ValidationError('Date of birth must be in YYYY-MM-DD format')
        
        # Parse and validate date
        try:
            dob = datetime.strptime(value, '%Y-%m-%d')
        except ValueError:
            raise ValidationError('Invalid date of birth')
        
        # Check age (must be 18+)
        today = datetime.now()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        if age < 18:
            raise ValidationError('User must be at least 18 years old')
        
        if age > 120:
            raise ValidationError('Invalid date of birth')


# ============================================================
# Response Schemas
# ============================================================

class VerificationDataSchema(Schema):
    """Data returned when verification is queued"""
    verification_id = fields.Integer(metadata={'description': 'Verification record ID'})
    task_id = fields.String(metadata={'description': 'Celery task ID for tracking'})
    status = fields.String(metadata={'description': 'Current status', 'example': 'processing'})
    estimated_time = fields.String(metadata={'description': 'Estimated completion time', 'example': '1-2 minutes'})


class VerificationResponseSchema(Schema):
    """Response schema for verification submission"""
    class Meta:
        name = 'VerificationSubmissionResponse'
    
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(VerificationDataSchema)


class VerificationStatusDataSchema(Schema):
    """Data for verification status response"""
    id = fields.Integer(metadata={'description': 'Verification record ID'})
    user_id = fields.Integer(metadata={'description': 'User ID'})
    verification_type = fields.String(metadata={'description': 'Type: bvn or nin'})
    status = fields.String(metadata={'description': 'Status: not_started, processing, verified, failed'})
    verified = fields.Boolean(metadata={'description': 'Whether user is verified'})
    verified_at = fields.String(allow_none=True, metadata={'description': 'Verification timestamp'})
    error_message = fields.String(allow_none=True, metadata={'description': 'Error message if failed'})


class VerificationStatusSchema(Schema):
    """Response schema for verification status"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(VerificationStatusDataSchema)


class TaskVerificationSchema(Schema):
    """Verification info within task status"""
    id = fields.Integer()
    status = fields.String()
    verification_type = fields.String()
    verified_at = fields.String(allow_none=True)
    error_message = fields.String(allow_none=True)


class TaskStatusDataSchema(Schema):
    """Data for task status response"""
    task_id = fields.String(metadata={'description': 'Celery task ID'})
    state = fields.String(metadata={'description': 'Celery state: PENDING, STARTED, SUCCESS, FAILURE, RETRY'})
    status = fields.String(metadata={'description': 'Human-readable status'})
    message = fields.String(metadata={'description': 'Status message'})
    progress = fields.Integer(metadata={'description': 'Progress percentage 0-100'})
    result = fields.Dict(allow_none=True, metadata={'description': 'Task result if completed'})
    error = fields.String(allow_none=True, metadata={'description': 'Error message if failed'})
    retry_count = fields.Integer(allow_none=True, metadata={'description': 'Number of retries'})
    verification = fields.Nested(TaskVerificationSchema, allow_none=True)


class TaskStatusResponseSchema(Schema):
    """Response schema for task status"""
    success = fields.Boolean()
    data = fields.Nested(TaskStatusDataSchema)


class VerificationErrorSchema(Schema):
    """Standard error response schema"""
    success = fields.Boolean(dump_default=False)
    error = fields.String()
    message = fields.String()
    details = fields.List(fields.Dict(), allow_none=True)
