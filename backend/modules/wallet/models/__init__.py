"""
Wallet Models Package
"""
from modules.wallet.models.wallet import Wallet
from modules.wallet.models.wallet_transaction import WalletTransaction
from modules.wallet.models.wallet_beneficiary import WalletBeneficiary

__all__ = ['Wallet', 'WalletTransaction', 'WalletBeneficiary']
