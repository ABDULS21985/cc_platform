"""
Marshmallow Schemas for Wallet Operations
Request validation and response serialization for wallet endpoints
"""
from marshmallow import Schema, fields, validate, validates, ValidationError
from decimal import Decimal


# ============================================================
# Request Schemas
# ============================================================

class DepositSchema(Schema):
    """
    Schema for deposit request validation
    
    Amount Validation:
    - Minimum: ₦50
    - Maximum: ₦5,000,000
    """
    amount = fields.Decimal(
        required=True,
        as_string=True,
        metadata={
            'description': 'Amount to deposit (₦50 - ₦5,000,000)',
            'example': '1000.00'
        }
    )
    
    description = fields.String(
        load_default='Wallet deposit',
        validate=validate.Length(max=255),
        metadata={
            'description': 'Optional description for the deposit',
            'example': 'Wallet funding'
        }
    )
    
    @validates('amount')
    def validate_amount(self, value, **kwargs):
        """Validate deposit amount range"""
        min_amount = Decimal('50.00')
        max_amount = Decimal('5000000.00')
        
        if value < min_amount:
            raise ValidationError(f'Minimum deposit is ₦{min_amount:,.2f}')
        
        if value > max_amount:
            raise ValidationError(f'Maximum deposit is ₦{max_amount:,.2f}')


class WithdrawSchema(Schema):
    """
    Schema for withdrawal request validation
    
    Validates:
    - Amount (minimum ₦100)
    - Bank code format
    - Account number format
    """
    amount = fields.Decimal(
        required=True,
        as_string=True,
        metadata={
            'description': 'Amount to withdraw (minimum ₦100)',
            'example': '1000.00'
        }
    )
    
    bank_code = fields.String(
        required=True,
        validate=validate.Length(min=3, max=20),
        metadata={
            'description': 'Bank code',
            'example': '011'
        }
    )

    bank_name = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=100),
        metadata={
            'description': 'Destination bank name',
            'example': 'GTBank'
        }
    )
    
    account_number = fields.String(
        required=True,
        validate=validate.Length(min=10, max=20),
        metadata={
            'description': 'Bank account number (10-20 digits)',
            'example': '0123456789'
        }
    )
    
    account_name = fields.String(
        load_default='N/A',
        validate=validate.Length(max=255),
        metadata={
            'description': 'Account holder name',
            'example': 'John Doe'
        }
    )

    pin = fields.String(
        required=True,
        metadata={
            'description': '4-digit transaction PIN',
            'example': '1234',
        },
    )

    note = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=255),
        metadata={
            'description': 'Optional withdrawal note',
            'example': 'Rent payment',
        },
    )
    
    @validates('amount')
    def validate_amount(self, value, **kwargs):
        """Validate withdrawal amount"""
        min_amount = Decimal('100.00')
        
        if value < min_amount:
            raise ValidationError(f'Minimum withdrawal is ₦{min_amount:,.2f}')
    
    @validates('account_number')
    def validate_account_number(self, value, **kwargs):
        """Validate account number format - must be digits only"""
        if not value.isdigit():
            raise ValidationError('Account number must contain only digits')

    @validates('pin')
    def validate_pin(self, value, **kwargs):
        if not value or not str(value).isdigit() or len(str(value)) != 4:
            raise ValidationError('PIN must be exactly 4 digits')


class SetTransactionPinSchema(Schema):
    pin = fields.String(required=True, metadata={'description': '4-digit PIN', 'example': '1234'})

    @validates('pin')
    def validate_pin(self, value, **kwargs):
        if not value or not str(value).isdigit() or len(str(value)) != 4:
            raise ValidationError('PIN must be exactly 4 digits')


class ChangeTransactionPinSchema(Schema):
    old_pin = fields.String(required=True, metadata={'description': 'Old 4-digit PIN', 'example': '1234'})
    new_pin = fields.String(required=True, metadata={'description': 'New 4-digit PIN', 'example': '5678'})

    @validates('old_pin')
    def validate_old(self, value, **kwargs):
        if not value or not str(value).isdigit() or len(str(value)) != 4:
            raise ValidationError('old_pin must be exactly 4 digits')

    @validates('new_pin')
    def validate_new(self, value, **kwargs):
        if not value or not str(value).isdigit() or len(str(value)) != 4:
            raise ValidationError('new_pin must be exactly 4 digits')


class ResetTransactionPinSchema(Schema):
    otp = fields.String(required=True, metadata={'description': 'Email OTP', 'example': '123456'})
    new_pin = fields.String(required=True, metadata={'description': 'New 4-digit PIN', 'example': '5678'})

    @validates('new_pin')
    def validate_new(self, value, **kwargs):
        if not value or not str(value).isdigit() or len(str(value)) != 4:
            raise ValidationError('new_pin must be exactly 4 digits')


class BeneficiaryQuerySchema(Schema):
    limit = fields.Integer(
        load_default=50,
        validate=validate.Range(min=1, max=100),
        metadata={'description': 'Number of beneficiaries to return', 'example': 50},
    )
    offset = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
        metadata={'description': 'Pagination offset', 'example': 0},
    )


class BeneficiaryCreateSchema(Schema):
    account_number = fields.String(
        required=True,
        validate=validate.Length(min=10, max=20),
        metadata={'description': 'Recipient account number', 'example': '0123456789'},
    )
    account_name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=255),
        metadata={'description': 'Recipient account holder name', 'example': 'Jane Doe'},
    )
    bank_code = fields.String(
        required=True,
        validate=validate.Length(min=3, max=20),
        metadata={'description': 'Recipient bank code', 'example': '058'},
    )
    bank_name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100),
        metadata={'description': 'Recipient bank name', 'example': 'GTBank'},
    )
    nickname = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=100),
        metadata={'description': 'Optional display nickname', 'example': 'Rent account'},
    )
    is_favorite = fields.Boolean(
        load_default=False,
        metadata={'description': 'Whether the beneficiary is a favorite', 'example': False},
    )

    @validates('account_number')
    def validate_account_number(self, value, **kwargs):
        if not value.isdigit():
            raise ValidationError('Account number must contain only digits')


class WebhookPayloadSchema(Schema):
    """
    Generic webhook payload schema (Bell MFB + SafeHaven).

    This is intentionally permissive so Swagger UI will render a JSON body input
    and we can test callbacks easily. Providers may send different shapes.
    """
    # SafeHaven-like fields
    sessionId = fields.String(required=False, allow_none=True)
    status = fields.String(required=False, allow_none=True)
    amount = fields.Raw(required=False, allow_none=True)
    accountNumber = fields.String(required=False, allow_none=True)
    virtualAccountNumber = fields.String(required=False, allow_none=True)
    transactionRef = fields.String(required=False, allow_none=True)
    reference = fields.String(required=False, allow_none=True)

    # Bell-like fields
    virtualAccount = fields.String(required=False, allow_none=True)
    amountReceived = fields.Raw(required=False, allow_none=True)
    event = fields.String(required=False, allow_none=True)


class TransactionQuerySchema(Schema):
    """
    Schema for transaction query parameters
    Used in GET /api/v2/wallet/transactions
    """
    limit = fields.Integer(
        load_default=50,
        validate=validate.Range(min=1, max=100),
        metadata={
            'description': 'Number of transactions to return (1-100)',
            'example': 50
        }
    )
    
    offset = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
        metadata={
            'description': 'Pagination offset',
            'example': 0
        }
    )
    
    type = fields.String(
        load_default=None,
        validate=validate.OneOf(['credit', 'debit', 'deposit', 'withdrawal', 'transfer', 'payment']),
        metadata={
            'description': 'Filter by transaction type',
            'example': 'credit'
        }
    )

    status = fields.String(
        load_default=None,
        validate=validate.OneOf(['pending', 'completed', 'failed', 'reversed', 'successful']),
        metadata={
            'description': 'Filter by transaction status',
            'example': 'completed',
        },
    )

    bill_id = fields.Integer(
        load_default=None,
        validate=validate.Range(min=1),
        metadata={
            'description': 'Filter transactions by bill_id (for bill payments)',
            'example': 123,
        },
    )


# ============================================================
# Response Schemas
# ============================================================

class WalletDataSchema(Schema):
    """Wallet information data schema"""
    id = fields.Integer(metadata={'description': 'Wallet ID'})
    account_number = fields.String(metadata={'description': 'Bell MFB account number'})
    account_name = fields.String(metadata={'description': 'Account holder name'})
    bank_name = fields.String(allow_none=True, metadata={'description': 'Virtual account bank name'})
    balance = fields.String(metadata={'description': 'Current balance', 'example': '5000.00'})
    currency = fields.String(metadata={'description': 'Currency code', 'example': 'NGN'})
    status = fields.String(metadata={'description': 'Wallet status', 'example': 'active'})
    created_at = fields.String(metadata={'description': 'Creation timestamp'})


class WalletResponseSchema(Schema):
    """Response schema for wallet information"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(WalletDataSchema)


class TransactionDataSchema(Schema):
    """Individual transaction data schema"""
    id = fields.Integer(metadata={'description': 'Transaction ID'})
    reference = fields.String(metadata={'description': 'Transaction reference'})
    type = fields.String(metadata={'description': 'Transaction type: credit or debit'})
    amount = fields.String(metadata={'description': 'Transaction amount'})
    fee = fields.String(metadata={'description': 'Transaction fee'})
    net_amount = fields.String(metadata={'description': 'Net amount after fee'})
    description = fields.String(metadata={'description': 'Transaction description'})
    source_account_name = fields.String(allow_none=True, metadata={'description': 'Source account name'})
    source_account_number = fields.String(allow_none=True, metadata={'description': 'Source account number'})
    source_bank_code = fields.String(allow_none=True, metadata={'description': 'Source bank code'})
    source_bank_name = fields.String(allow_none=True, metadata={'description': 'Source bank name'})
    destination_account_number = fields.String(allow_none=True, metadata={'description': 'Destination account number'})
    destination_account_name = fields.String(allow_none=True, metadata={'description': 'Destination account name'})
    destination_bank_name = fields.String(allow_none=True, metadata={'description': 'Destination bank name'})
    note = fields.String(allow_none=True, metadata={'description': 'Transaction note'})
    status = fields.String(metadata={'description': 'Transaction status'})
    completed_at = fields.String(allow_none=True, metadata={'description': 'Completion timestamp'})
    created_at = fields.String(metadata={'description': 'Creation timestamp'})


class PaginationSchema(Schema):
    """Pagination metadata schema"""
    total = fields.Integer(metadata={'description': 'Total number of records'})
    limit = fields.Integer(metadata={'description': 'Records per page'})
    offset = fields.Integer(metadata={'description': 'Current offset'})
    has_more = fields.Boolean(metadata={'description': 'Whether more records exist'})


class BeneficiaryDataSchema(Schema):
    id = fields.Integer(metadata={'description': 'Beneficiary ID'})
    user_id = fields.Integer(metadata={'description': 'Owner user ID'})
    name = fields.String(metadata={'description': 'Display name'})
    account_number = fields.String(metadata={'description': 'Recipient account number'})
    account_name = fields.String(metadata={'description': 'Recipient account holder name'})
    bank_code = fields.String(metadata={'description': 'Recipient bank code'})
    bank_name = fields.String(metadata={'description': 'Recipient bank name'})
    nickname = fields.String(allow_none=True, metadata={'description': 'Optional nickname'})
    is_favorite = fields.Boolean(metadata={'description': 'Favorite flag'})
    last_used_at = fields.String(allow_none=True, metadata={'description': 'Last selected timestamp'})
    created_at = fields.String(allow_none=True, metadata={'description': 'Creation timestamp'})
    updated_at = fields.String(allow_none=True, metadata={'description': 'Update timestamp'})


class BeneficiaryListDataSchema(Schema):
    beneficiaries = fields.List(fields.Nested(BeneficiaryDataSchema))
    pagination = fields.Nested(PaginationSchema)


class BeneficiaryListResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(BeneficiaryListDataSchema)


class BeneficiarySaveDataSchema(Schema):
    beneficiary = fields.Nested(BeneficiaryDataSchema)
    already_saved = fields.Boolean()


class BeneficiarySaveResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(BeneficiarySaveDataSchema)


class TransactionListSchema(Schema):
    """Transaction list with pagination"""
    transactions = fields.List(fields.Nested(TransactionDataSchema))
    pagination = fields.Nested(PaginationSchema)


class TransactionResponseSchema(Schema):
    """Response schema for transaction list"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(TransactionListSchema)


class SummaryStatsSchema(Schema):
    """Wallet summary statistics"""
    total_credits = fields.String(metadata={'description': 'Total credits'})
    total_debits = fields.String(metadata={'description': 'Total debits'})
    transaction_count = fields.Integer(metadata={'description': 'Total transaction count'})


class WalletSummaryDataSchema(Schema):
    """Wallet summary data schema"""
    wallet = fields.Nested(WalletDataSchema, allow_none=True)
    recent_transactions = fields.List(fields.Nested(TransactionDataSchema))
    summary = fields.Nested(SummaryStatsSchema)


class WalletSummaryResponseSchema(Schema):
    """Response schema for wallet summary"""
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(WalletSummaryDataSchema)


class BankDetailsSchema(Schema):
    """Bank account details for deposit"""
    account_number = fields.String(metadata={'description': 'Bell MFB account number'})
    account_name = fields.String(metadata={'description': 'Account holder name'})
    bank_name = fields.String(metadata={'description': 'Bank name', 'example': 'Bell MFB'})


class DepositDataSchema(Schema):
    """Deposit response data schema"""
    transaction_id = fields.Integer(metadata={'description': 'Transaction ID'})
    reference = fields.String(metadata={'description': 'Transaction reference'})
    amount = fields.String(metadata={'description': 'Deposit amount'})
    status = fields.String(metadata={'description': 'Transaction status', 'example': 'pending'})
    bank_details = fields.Nested(BankDetailsSchema)
    instructions = fields.String(metadata={'description': 'Payment instructions'})
    message = fields.String(metadata={'description': 'Additional message'})


class DepositResponseSchema(Schema):
    """Response schema for deposit initiation"""
    success = fields.Boolean()
    data = fields.Nested(DepositDataSchema)


class WithdrawDataSchema(Schema):
    """Withdrawal response data schema"""
    transaction_id = fields.Integer(metadata={'description': 'Transaction ID'})
    reference = fields.String(metadata={'description': 'Transaction reference'})
    amount = fields.String(metadata={'description': 'Withdrawal amount'})
    fee = fields.String(metadata={'description': 'Transaction fee'})
    net_amount = fields.String(metadata={'description': 'Net amount after fee'})
    status = fields.String(metadata={'description': 'Transaction status', 'example': 'pending'})
    provider_status = fields.String(metadata={'description': 'Provider transfer status', 'example': 'provider_unavailable'})
    destination_bank = fields.String(metadata={'description': 'Destination bank name'})
    destination_bank_code = fields.String(metadata={'description': 'Destination bank code'})
    destination_account = fields.String(metadata={'description': 'Destination account number'})
    message = fields.String(metadata={'description': 'Status message'})


class WithdrawResponseSchema(Schema):
    """Response schema for withdrawal"""
    success = fields.Boolean()
    data = fields.Nested(WithdrawDataSchema)


class WalletErrorSchema(Schema):
    """Error response schema"""
    success = fields.Boolean(dump_default=False)
    error = fields.String(metadata={'description': 'Error code'})
    message = fields.String(metadata={'description': 'Error message'})
    data = fields.Dict(allow_none=True, metadata={'description': 'Additional error data'})
