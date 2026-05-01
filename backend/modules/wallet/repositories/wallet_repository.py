"""
Wallet Repository - Data Access Layer
Follows Repository Pattern for clean separation
"""
from typing import Optional, List
from decimal import Decimal
from sqlalchemy.exc import IntegrityError
from modules.wallet.models.wallet import Wallet
from modules.auth_v2.extensions import db


class WalletRepository:
    """
    Repository for Wallet entity
    Handles all database operations for wallets
    """
    
    def create(self, wallet_data: dict) -> Wallet:
        """
        Create a new wallet
        
        Args:
            wallet_data: Dictionary containing wallet fields
            
        Returns:
            Wallet: Created wallet instance
            
        Raises:
            IntegrityError: If duplicate user_id or account_number
        """
        wallet = Wallet(**wallet_data)
        db.session.add(wallet)
        db.session.commit()
        return wallet
    
    def find_by_id(self, wallet_id: int) -> Optional[Wallet]:
        """Find wallet by ID"""
        return Wallet.query.filter_by(id=wallet_id).first()
    
    def find_by_user_id(self, user_id: int) -> Optional[Wallet]:
        """Find wallet by user ID"""
        return Wallet.query.filter_by(user_id=user_id).first()
    
    def find_by_account_number(self, account_number: str) -> Optional[Wallet]:
        """Find wallet by account number"""
        return Wallet.query.filter_by(account_number=account_number).first()
    
    def find_by_bell_mfb_client_id(self, client_id: str) -> Optional[Wallet]:
        """Find wallet by Bell MFB client ID"""
        return Wallet.query.filter_by(bell_mfb_client_id=client_id).first()
    
    def update_balance(
        self, 
        wallet_id: int, 
        new_balance: Decimal
    ) -> Optional[Wallet]:
        """
        Update wallet balance
        
        Args:
            wallet_id: ID of wallet to update
            new_balance: New balance amount
            
        Returns:
            Updated Wallet or None if not found
        """
        wallet = self.find_by_id(wallet_id)
        if not wallet:
            return None
        
        wallet.balance = new_balance
        db.session.commit()
        db.session.refresh(wallet)
        return wallet
    
    def increment_balance(
        self, 
        wallet_id: int, 
        amount: Decimal
    ) -> Optional[Wallet]:
        """
        Increment wallet balance (for credits)
        Thread-safe using database-level increment
        
        Args:
            wallet_id: ID of wallet
            amount: Amount to add
            
        Returns:
            Updated Wallet or None if not found
        """
        wallet = self.find_by_id(wallet_id)
        if not wallet:
            return None
        
        # Use SQL increment for thread safety
        wallet.balance = Wallet.balance + amount
        db.session.commit()
        db.session.refresh(wallet)
        return wallet
    
    def decrement_balance(
        self, 
        wallet_id: int, 
        amount: Decimal
    ) -> Optional[Wallet]:
        """
        Decrement wallet balance (for debits)
        Validates sufficient balance
        
        Args:
            wallet_id: ID of wallet
            amount: Amount to subtract
            
        Returns:
            Updated Wallet or None if not found or insufficient balance
        """
        wallet = self.find_by_id(wallet_id)
        if not wallet:
            return None
        
        if wallet.balance < amount:
            return None  # Insufficient balance
        
        wallet.balance = Wallet.balance - amount
        db.session.commit()
        db.session.refresh(wallet)
        return wallet
    
    def update_status(
        self, 
        wallet_id: int, 
        status: str
    ) -> Optional[Wallet]:
        """
        Update wallet status
        
        Args:
            wallet_id: ID of wallet
            status: New status ('active', 'suspended', 'closed')
            
        Returns:
            Updated Wallet or None if not found
        """
        wallet = self.find_by_id(wallet_id)
        if not wallet:
            return None
        
        wallet.status = status
        db.session.commit()
        db.session.refresh(wallet)
        return wallet
    
    def get_active_wallets(self, limit: int = 100) -> List[Wallet]:
        """Get all active wallets"""
        return Wallet.query.filter_by(status='active').limit(limit).all()
    
    def delete(self, wallet: Wallet) -> None:
        """
        Delete wallet (rarely used - prefer status='closed')
        """
        db.session.delete(wallet)
        db.session.commit()
