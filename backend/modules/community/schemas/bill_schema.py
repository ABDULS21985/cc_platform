"""
Marshmallow Schemas for Bill Operations
Request validation and response serialization for bill endpoints
"""
from marshmallow import Schema, fields, validate, validates, validates_schema, ValidationError
from decimal import Decimal
from modules.community.constants import BillStatus, BillType, RecurrenceType


# ============================================================
# Request Schemas
# ============================================================

class CreateBillSchema(Schema):
    """Schema for bill creation request"""
    title = fields.String(
        required=True,
        validate=validate.Length(min=3, max=200),
        metadata={
            'description': 'Bill title',
            'example': 'March Monthly Dues'
        }
    )
    
    description = fields.String(
        load_default=None,
        validate=validate.Length(max=500),
        metadata={
            'description': 'Bill description',
            'example': 'Monthly community dues for March'
        }
    )
    
    amount = fields.Decimal(
        required=True,
        as_string=True,
        metadata={
            'description': 'Bill amount',
            'example': '5000.00'
        }
    )
    
    type = fields.String(
        load_default='fixed',
        validate=validate.OneOf(['fixed', 'free_will']),
        metadata={
            'description': 'Bill type',
            'example': 'fixed'
        }
    )

    expense_kind = fields.String(
        load_default='bill',
        validate=validate.OneOf(['bill', 'campaign', 'split_payment']),
        metadata={
            'description': 'Bill surface/source',
            'example': 'campaign',
        },
    )
    
    min_amount = fields.Decimal(
        load_default=Decimal('0.0'),
        as_string=True,
        metadata={
            'description': 'Minimum amount for free_will type',
            'example': '0.00'
        }
    )
    
    is_recurring = fields.Boolean(
        load_default=False,
        metadata={
            'description': 'Whether bill is recurring',
            'example': True
        }
    )
    
    recurrence_type = fields.String(
        load_default=None,
        validate=validate.OneOf(RecurrenceType.values()),
        metadata={
            'description': 'Recurrence frequency',
            'example': 'monthly'
        }
    )
    
    due_date = fields.DateTime(
        required=True,
        metadata={
            'description': 'Due date in ISO format',
            'example': '2024-03-31T23:59:59'
        }
    )
    
    @validates('amount')
    def validate_amount(self, value, **kwargs):
        """Ensure amount is positive"""
        if value <= 0:
            raise ValidationError('Amount must be greater than 0')
    
    @validates('min_amount')
    def validate_min_amount(self, value, **kwargs):
        """Ensure min_amount is non-negative"""
        if value < 0:
            raise ValidationError('Minimum amount must be >= 0')
    
    @validates_schema
    def validate_recurrence(self, data, **kwargs):
        """Ensure recurrence_type is set when is_recurring is True"""
        if data.get('is_recurring') and not data.get('recurrence_type'):
            raise ValidationError(
                'recurrence_type is required when is_recurring is True',
                field_name='recurrence_type'
            )


class UpdateBillSchema(Schema):
    """Schema for bill update request"""
    title = fields.String(
        validate=validate.Length(min=3, max=200),
        metadata={'description': 'Bill title'}
    )
    
    description = fields.String(
        validate=validate.Length(max=500),
        metadata={'description': 'Bill description'}
    )
    
    amount = fields.Decimal(
        as_string=True,
        metadata={'description': 'Bill amount'}
    )
    
    type = fields.String(
        validate=validate.OneOf(BillType.values()),
        metadata={'description': 'Bill type'}
    )

    expense_kind = fields.String(
        validate=validate.OneOf(['bill', 'campaign', 'split_payment']),
        metadata={'description': 'Bill surface/source'}
    )
    
    min_amount = fields.Decimal(
        as_string=True,
        metadata={'description': 'Minimum amount'}
    )
    
    status = fields.String(
        validate=validate.OneOf(BillStatus.values()),
        metadata={'description': 'Bill status'}
    )
    
    due_date = fields.DateTime(
        metadata={'description': 'Due date'}
    )
    
    @validates('amount')
    def validate_amount(self, value, **kwargs):
        """Ensure amount is positive if provided"""
        if value is not None and value <= 0:
            raise ValidationError('Amount must be greater than 0')
    
    @validates('min_amount')
    def validate_min_amount(self, value, **kwargs):
        """Ensure min_amount is non-negative if provided"""
        if value is not None and value < 0:
            raise ValidationError('Minimum amount must be >= 0')


class PayBillSchema(Schema):
    """Schema for bill payment request"""
    amount = fields.Decimal(
        required=True,
        as_string=True,
        metadata={
            'description': 'Payment amount',
            'example': '5000.00'
        }
    )
    
    payment_method = fields.String(
        required=True,
        validate=validate.OneOf(['wallet']),
        metadata={
            'description': 'Payment method. Only wallet payments are currently supported.',
            'example': 'wallet'
        }
    )

    pin = fields.String(
        load_default=None,
        allow_none=True,
        metadata={'description': '4-digit transaction PIN (required for wallet payments)', 'example': '1234'},
    )
    
    transaction_reference = fields.String(
        load_default=None,
        validate=validate.Length(max=100),
        metadata={
            'description': 'External transaction reference',
            'example': 'TXN123456'
        }
    )
    
    @validates('amount')
    def validate_amount(self, value, **kwargs):
        """Ensure amount is positive"""
        if value <= 0:
            raise ValidationError('Payment amount must be greater than 0')

    @validates_schema
    def validate_wallet_pin(self, data, **kwargs):
        """Require PIN only for wallet payments."""
        if data.get("payment_method") != "wallet":
            return

        pin = data.get("pin")
        if not pin:
            raise ValidationError("PIN is required for wallet payments", field_name="pin")
        pin_str = str(pin)
        if not pin_str.isdigit() or len(pin_str) != 4:
            raise ValidationError("PIN must be exactly 4 digits", field_name="pin")


class BillListQuerySchema(Schema):
    """Query parameters for listing community bills."""
    status = fields.String(
        load_default=None,
        validate=validate.OneOf(['draft', 'active', 'closed', 'settled']),
        metadata={'description': 'Filter by bill status'}
    )
    expense_kind = fields.String(
        load_default=None,
        validate=validate.OneOf(['bill', 'campaign', 'split_payment']),
        metadata={'description': 'Filter by bill surface/source'}
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


# ============================================================
# Response Schemas
# ============================================================

class BillDataSchema(Schema):
    """Bill data schema for responses"""
    id = fields.Integer(metadata={'description': 'Bill ID'})
    community_id = fields.Integer(metadata={'description': 'Community ID'})
    creator_id = fields.Integer(metadata={'description': 'User who created the bill'})
    title = fields.String(metadata={'description': 'Bill title'})
    description = fields.String(allow_none=True, metadata={'description': 'Description'})
    amount = fields.Float(metadata={'description': 'Bill amount'})
    type = fields.String(metadata={'description': 'fixed or free_will'})
    expense_kind = fields.String(metadata={'description': 'bill, campaign, or split_payment'})
    min_amount = fields.Float(metadata={'description': 'Minimum amount'})
    status = fields.String(metadata={'description': 'Bill status'})
    is_recurring = fields.Boolean(metadata={'description': 'Is recurring'})
    recurrence_type = fields.String(allow_none=True, metadata={'description': 'Recurrence type'})
    due_date = fields.String(metadata={'description': 'Due date'})
    collected_amount = fields.Float(metadata={'description': 'Total amount collected'})
    paid_member_count = fields.Integer(metadata={'description': 'Number of distinct members who have paid'})
    expected_member_count = fields.Integer(metadata={'description': 'Number of active non-owner members expected to pay'})
    progress_percentage = fields.Integer(metadata={'description': 'Payment progress percentage by member count'})
    creator = fields.Dict(
        allow_none=True,
        metadata={
            'description': 'Bill creator summary: id, firstname, lastname, full_name, profile_photo',
        },
    )
    member_payment_statuses = fields.List(
        fields.Dict(),
        metadata={'description': 'Bill detail member payment statuses'},
    )
    recent_transactions = fields.List(
        fields.Dict(),
        metadata={'description': 'Recent successful bill payment transactions'},
    )
    created_at = fields.String(metadata={'description': 'Creation timestamp'})
    updated_at = fields.String(metadata={'description': 'Last update timestamp'})


class BillResponseSchema(Schema):
    """Response schema for single bill"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(BillDataSchema)


class BillListDataSchema(Schema):
    """Bill list with pagination"""
    bills = fields.List(fields.Nested(BillDataSchema))
    pagination = fields.Dict(metadata={'description': 'Pagination info'})


class BillListResponseSchema(Schema):
    """Response schema for bill list"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(BillListDataSchema)
