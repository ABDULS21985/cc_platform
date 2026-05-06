"""Wallet repositories"""
from modules.wallet.repositories.wallet_repository import WalletRepository
from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
from modules.wallet.repositories.wallet_beneficiary_repository import WalletBeneficiaryRepository

__all__ = ['WalletRepository', 'WalletTransactionRepository', 'WalletBeneficiaryRepository']
