"""
Marshmallow Schemas for Payment Operations
Request validation and response serialization for payment endpoints
"""
from marshmallow import Schema, fields, validate, validates, ValidationError
from decimal import Decimal


# ============================================================
# Request Schemas
# ============================================================

class TransferFundsSchema(Schema):
    """Schema for community fund transfer request"""
    amount = fields.Decimal(
        required=True,
        as_string=True,
        metadata={
            'description': 'Transfer amount',
            'example': '10000.00'
        }
    )
    
    recipient_account = fields.String(
        required=True,
        validate=validate.Length(min=10, max=20),
        metadata={
            'description': 'Recipient account number',
            'example': '1234567890'
        }
    )
    
    recipient_name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        metadata={
            'description': 'Recipient name',
            'example': 'John Doe'
        }
    )

    recipient_bank_code = fields.String(
        required=True,
        validate=validate.Length(min=3, max=10),
        metadata={
            'description': 'NIBSS bank code of recipient bank (e.g. 058 for GTB)',
            'example': '058'
        }
    )

    reason = fields.String(
        load_default=None,
        validate=validate.Length(max=200),
        metadata={
            'description': 'Transfer reason',
            'example': 'Quarterly fund transfer'
        }
    )

    pin = fields.String(
        required=True,
        metadata={'description': '4-digit transaction PIN', 'example': '1234'},
    )
    
    @validates('amount')
    def validate_amount(self, value, **kwargs):
        """Ensure amount is positive"""
        if value <= 0:
            raise ValidationError('Transfer amount must be greater than 0')
    
    @validates('recipient_account')
    def validate_account(self, value, **kwargs):
        """Ensure account number is digits only"""
        if not value.isdigit():
            raise ValidationError('Account number must contain only digits')

    @validates('pin')
    def validate_pin(self, value, **kwargs):
        if not value or not str(value).isdigit() or len(str(value)) != 4:
            raise ValidationError('PIN must be exactly 4 digits')


class CommunityDepositSchema(Schema):
    """Schema for community deposit request"""
    amount = fields.Decimal(
        required=True,
        as_string=True,
        metadata={
            'description': 'Deposit amount (₦50 - ₦10,000,000)',
            'example': '5000.00'
        }
    )
    
    description = fields.String(
        load_default='Community deposit',
        validate=validate.Length(max=255),
        metadata={
            'description': 'Deposit description',
            'example': 'Monthly contribution'
        }
    )
    
    @validates('amount')
    def validate_amount(self, value, **kwargs):
        """Validate deposit amount range"""
        min_amount = Decimal('50.00')
        max_amount = Decimal('10000000.00')
        
        if value < min_amount:
            raise ValidationError(f'Minimum deposit is ₦{min_amount:,.2f}')
        
        if value > max_amount:
            raise ValidationError(f'Maximum deposit is ₦{max_amount:,.2f}')


class CommunityTransactionQuerySchema(Schema):
    """Schema for community transaction history query parameters."""

    limit = fields.Integer(
        load_default=50,
        validate=validate.Range(min=1, max=100),
        metadata={'description': 'Number of transactions to return (1-100)', 'example': 50},
    )
    offset = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
        metadata={'description': 'Pagination offset', 'example': 0},
    )
    type = fields.String(
        load_default=None,
        validate=validate.OneOf(['credit', 'debit', 'deposit', 'withdrawal', 'transfer', 'payment']),
        metadata={'description': 'Filter by transaction type', 'example': 'deposit'},
    )
    status = fields.String(
        load_default=None,
        validate=validate.OneOf(['pending', 'completed', 'failed', 'reversed', 'successful']),
        metadata={'description': 'Filter by transaction status', 'example': 'completed'},
    )

    bill_id = fields.Integer(
        load_default=None,
        validate=validate.Range(min=1),
        metadata={
            'description': 'Filter transactions by bill_id (for bill payments)',
            'example': 123,
        },
    )


class MembershipPaymentInitSchema(Schema):
    """Schema for membership payment initiation"""
    invite_code = fields.String(
        required=True,
        validate=validate.Length(min=6, max=20),
        metadata={
            'description': 'Community invite code',
            'example': 'xY9kL2pQ8w'
        }
    )


class MembershipPaymentVerifySchema(Schema):
    """Schema for membership payment verification"""
    reference = fields.String(
        required=True,
        validate=validate.Length(min=5, max=100),
        metadata={
            'description': 'Payment reference to verify',
            'example': 'MEM-5-42-20260114'
        }
    )


# ============================================================
# Response Schemas
# ============================================================

class AccountDetailsSchema(Schema):
    """Virtual account details schema"""
    account_number = fields.String(metadata={'description': 'Account number'})
    account_name = fields.String(metadata={'description': 'Account name'})
    bank_name = fields.String(metadata={'description': 'Bank name'})


class PaymentDataSchema(Schema):
    """Payment response data schema"""
    transaction_id = fields.Integer(metadata={'description': 'Transaction ID'})
    bill_id = fields.Integer(allow_none=True, metadata={'description': 'Bill ID for bill payments'})
    reference = fields.String(allow_none=True, metadata={'description': 'Transaction reference'})
    amount = fields.Raw(metadata={'description': 'Amount'})
    status = fields.String(metadata={'description': 'Payment status'})
    account_details = fields.Nested(AccountDetailsSchema, allow_none=True)
    instructions = fields.String(allow_none=True, metadata={'description': 'Payment instructions'})
    expires_in = fields.String(allow_none=True, metadata={'description': 'Expiry time'})
    expires_in_seconds = fields.Integer(allow_none=True, metadata={'description': 'Expiry time in seconds'})
    expires_at = fields.String(allow_none=True, metadata={'description': 'Expiry timestamp'})
    timestamp = fields.String(allow_none=True, metadata={'description': 'Payment timestamp'})
    duplicate = fields.Boolean(allow_none=True, metadata={'description': 'Whether payment was deduplicated'})
    message = fields.String(allow_none=True, metadata={'description': 'Provider-facing payment message'})


class PaymentResponseSchema(Schema):
    """Response schema for payment initiation"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(PaymentDataSchema)


class TransferDataSchema(Schema):
    """Transfer response data schema"""
    transaction_id = fields.Integer(metadata={'description': 'Transaction ID'})
    reference = fields.String(metadata={'description': 'Transaction reference'})
    amount = fields.String(metadata={'description': 'Transfer amount'})
    fee = fields.String(metadata={'description': 'Transaction fee'})
    net_amount = fields.String(metadata={'description': 'Net amount after fee'})
    status = fields.String(metadata={'description': 'Transfer status'})
    recipient_account = fields.String(metadata={'description': 'Recipient account'})
    recipient_name = fields.String(metadata={'description': 'Recipient name'})
    recipient_bank_code = fields.String(allow_none=True, metadata={'description': 'Recipient bank code'})
    provider_reference = fields.String(allow_none=True, metadata={'description': 'Provider reference'})
    provider = fields.String(allow_none=True, metadata={'description': 'Provider name'})
    duplicate = fields.Boolean(load_default=False, metadata={'description': 'Whether request was deduplicated'})


class TransferStatusResponseSchema(Schema):
    """Response schema for transfer status lookup"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(TransferDataSchema)


class TransferResponseSchema(Schema):
    """Response schema for fund transfer"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(TransferDataSchema)


class BalanceDataSchema(Schema):
    """Community balance data schema"""
    community_id = fields.Integer(metadata={'description': 'Community ID'})
    balance = fields.Float(metadata={'description': 'Current balance'})
    currency = fields.String(metadata={'description': 'Currency code'})
    status = fields.String(allow_none=True, metadata={'description': 'Wallet status'})
    account_number = fields.String(allow_none=True, metadata={'description': 'Community wallet account number'})
    account_name = fields.String(allow_none=True, metadata={'description': 'Community wallet account name'})
    total_deposits = fields.Float(metadata={'description': 'Total deposits'})
    total_withdrawals = fields.Float(metadata={'description': 'Total withdrawals'})
    transaction_count = fields.Integer(metadata={'description': 'Successful transaction count'})


class BalanceResponseSchema(Schema):
    """Response schema for balance query"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(BalanceDataSchema)
