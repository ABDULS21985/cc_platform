"""
Community Wallet Repository
Data access layer for CommunityWallet model.

SOLID Principles:
- Single Responsibility: Only handles wallet data access
- Open/Closed: Extensible for new query patterns
- Liskov Substitution: Standard repository pattern
- Interface Segregation: Clean, focused methods
- Dependency Inversion: Depends on db abstraction
"""
import logging
from decimal import Decimal
from typing import Optional, List, Dict, Any
from modules.auth_v2.extensions import db
from modules.community.models.community_wallet import CommunityWallet

logger = logging.getLogger(__name__)


class CommunityWalletRepository:
    """Repository for CommunityWallet model"""
    
    def create(self, data: Dict[str, Any]) -> CommunityWallet:
        """
        Create a new community wallet
        
        Args:
            data: Dictionary with wallet fields
            
        Returns:
            Created CommunityWallet object
        """
        try:
            wallet = CommunityWallet(
                community_id=data['community_id'],
                balance=data.get('balance', Decimal('0.00')),
                status=data.get('status', 'pending'),
                currency=data.get('currency', 'NGN'),
                account_number=data.get('account_number'),
                account_name=data.get('account_name'),
                bell_mfb_client_id=data.get('bell_mfb_client_id')
            )
            db.session.add(wallet)
            db.session.flush()
            logger.info(f"Created wallet for community {data['community_id']}")
            return wallet
        except KeyError as e:
            logger.error(f"Missing required field: {e}")
            raise ValueError(f"Missing required field: {e}")
    
    def find_by_id(self, wallet_id: int) -> Optional[CommunityWallet]:
        """Find wallet by ID"""
        return CommunityWallet.query.filter_by(id=wallet_id).first()
    
    def find_by_community_id(self, community_id: int) -> Optional[CommunityWallet]:
        """Find wallet by community ID"""
        return CommunityWallet.query.filter_by(community_id=community_id).first()
    
    def find_by_account_number(self, account_number: str) -> Optional[CommunityWallet]:
        """Find wallet by Bell MFB account number"""
        return CommunityWallet.query.filter_by(account_number=account_number).first()
    
    def find_by_bell_mfb_client_id(self, bell_mfb_client_id: str) -> Optional[CommunityWallet]:
        """Find wallet by Bell MFB client ID"""
        return CommunityWallet.query.filter_by(bell_mfb_client_id=bell_mfb_client_id).first()
    
    def find_active_wallets(self) -> List[CommunityWallet]:
        """Find all active community wallets"""
        return CommunityWallet.query.filter_by(status='active').all()
    
    def find_pending_wallets(self) -> List[CommunityWallet]:
        """Find all pending community wallets (awaiting Bell MFB setup)"""
        return CommunityWallet.query.filter_by(status='pending').all()
    
    def update_balance(self, wallet_id: int, amount: float) -> Optional[CommunityWallet]:
        """
        Update wallet balance (can be positive or negative)
        
        Args:
            wallet_id: Wallet ID
            amount: Amount to add (can be negative)
            
        Returns:
            Updated wallet or None if not found
        """
        wallet = self.find_by_id(wallet_id)
        if wallet:
            wallet.balance = Decimal(str(wallet.balance)) + Decimal(str(amount))
            db.session.flush()
            logger.info(f"Updated wallet {wallet_id} balance by {amount}")
        return wallet
    
    def set_balance(self, wallet_id: int, balance: float) -> Optional[CommunityWallet]:
        """Set wallet balance to exact amount"""
        wallet = self.find_by_id(wallet_id)
        if wallet:
            wallet.balance = Decimal(str(balance))
            db.session.flush()
            logger.info(f"Set wallet {wallet_id} balance to {balance}")
        return wallet
    
    def activate_wallet(self, wallet_id: int, account_number: str, account_name: str, bell_mfb_client_id: str) -> Optional[CommunityWallet]:
        """
        Activate wallet after Bell MFB account creation
        
        Args:
            wallet_id: Wallet ID
            account_number: Bell MFB account number
            account_name: Account name
            bell_mfb_client_id: Bell MFB client ID
            
        Returns:
            Updated wallet
        """
        wallet = self.find_by_id(wallet_id)
        if wallet:
            wallet.account_number = account_number
            wallet.account_name = account_name
            wallet.bell_mfb_client_id = bell_mfb_client_id
            wallet.status = 'active'
            db.session.flush()
            logger.info(f"Activated wallet {wallet_id}: {account_number}")
        return wallet
    
    def suspend_wallet(self, wallet_id: int) -> Optional[CommunityWallet]:
        """Suspend wallet (no transactions allowed)"""
        wallet = self.find_by_id(wallet_id)
        if wallet:
            wallet.status = 'suspended'
            db.session.flush()
            logger.info(f"Suspended wallet {wallet_id}")
        return wallet
    
    def close_wallet(self, wallet_id: int) -> Optional[CommunityWallet]:
        """Close wallet (final state, no transactions)"""
        wallet = self.find_by_id(wallet_id)
        if wallet:
            wallet.status = 'closed'
            db.session.flush()
            logger.info(f"Closed wallet {wallet_id}")
        return wallet
    
    def can_withdraw(self, wallet_id: int, amount: float) -> bool:
        """Check if wallet can withdraw amount"""
        wallet = self.find_by_id(wallet_id)
        if not wallet or wallet.status != 'active':
            return False
        return Decimal(str(wallet.balance)) >= Decimal(str(amount))
    
    def get_available_balance(self, wallet_id: int) -> Decimal:
        """Get available balance in wallet"""
        wallet = self.find_by_id(wallet_id)
        if not wallet:
            return Decimal('0')
        return Decimal(str(wallet.balance)) if wallet.status == 'active' else Decimal('0')
