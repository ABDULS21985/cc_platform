"""
Wallet Resources Package
Flask-Smorest MethodView resources for wallet operations
"""
from modules.wallet.resources.wallet_resource import (
    wallet_blp,
    WalletResource,
    WalletTransactionsResource,
    WalletSummaryResource,
    DepositResource,
    WithdrawResource
)
from modules.wallet.resources.webhook_resource import (
    webhook_blp,
    WebhookResource
)

__all__ = [
    'wallet_blp',
    'webhook_blp',
    'WalletResource',
    'WalletTransactionsResource',
    'WalletSummaryResource',
    'DepositResource',
    'WithdrawResource',
    'WebhookResource'
]
