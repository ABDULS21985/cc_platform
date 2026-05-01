"""
Wallet Schemas Package
Marshmallow schemas for wallet request validation and response serialization
"""
from modules.wallet.schemas.wallet_schema import (
    DepositSchema,
    WithdrawSchema,
    TransactionQuerySchema,
    WalletDataSchema,
    WalletResponseSchema,
    TransactionDataSchema,
    TransactionListSchema,
    PaginationSchema,
    TransactionResponseSchema,
    WalletSummaryDataSchema,
    WalletSummaryResponseSchema,
    DepositDataSchema,
    DepositResponseSchema,
    WithdrawDataSchema,
    WithdrawResponseSchema,
    WalletErrorSchema
)

# Backward compatibility alias
ErrorResponseSchema = WalletErrorSchema

__all__ = [
    'DepositSchema',
    'WithdrawSchema',
    'TransactionQuerySchema',
    'WalletDataSchema',
    'WalletResponseSchema',
    'TransactionDataSchema',
    'TransactionListSchema',
    'PaginationSchema',
    'TransactionResponseSchema',
    'WalletSummaryDataSchema',
    'WalletSummaryResponseSchema',
    'DepositDataSchema',
    'DepositResponseSchema',
    'WithdrawDataSchema',
    'WithdrawResponseSchema',
    'WalletErrorSchema',
    'ErrorResponseSchema'
]
