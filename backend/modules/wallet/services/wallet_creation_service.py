"""
Wallet Creation Service - Creates wallet records after verification
Wallet is just a balance ledger in the system.
"""
import logging
from typing import Dict, Any
from decimal import Decimal
from modules.wallet.repositories.wallet_repository import WalletRepository
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


class WalletCreationService:
    """
    Service for creating wallet records for verified users
    
    Responsibilities:
    - Create wallet records in database
    - Track user balance
    
    Single Responsibility: Wallet record creation
    """

    def __init__(self):
        """Initialize service with dependencies"""
        self.wallet_repo = WalletRepository()

    def create_wallet(self, user_id: int) -> Dict[str, Any]:
        """
        Create a wallet record for a verified user
        
        Args:
            user_id: ID of verified user
            
        Returns:
            Dictionary with wallet info
            
        Raises:
            ValueError: If user already has wallet
        """
        logger.info(f"Creating wallet for user {user_id}")
        
        try:
            # Check if user already has wallet
            existing_wallet = self.wallet_repo.find_by_user_id(user_id)
            if existing_wallet:
                logger.warning(f"User {user_id} already has wallet")
                raise ValueError("User already has an active wallet")
            
            # Create wallet record
            wallet_data = {
                'user_id': user_id,
                'balance': Decimal('0.00'),
                'currency': 'NGN',
                'status': 'active'
            }
            
            wallet = self.wallet_repo.create(wallet_data)
            db.session.commit()
            
            logger.info(f"Wallet created for user {user_id}")
            
            return {
                'success': True,
                'wallet': wallet.to_dict(),
                'message': 'Wallet created successfully'
            }
            
        except ValueError as e:
            logger.warning(f"Wallet creation failed for user {user_id}: {str(e)}")
            raise
        except Exception as e:
            db.session.rollback()
            logger.error(f"Wallet creation failed for user {user_id}: {str(e)}")
            raise

    def get_or_create_wallet(self, user_id: int) -> Dict[str, Any]:
        """
        Get existing wallet or create new one if doesn't exist
        
        Args:
            user_id: ID of user
            
        Returns:
            Dictionary with wallet info
        """
        wallet = self.wallet_repo.find_by_user_id(user_id)
        
        if wallet:
            logger.info(f"Wallet already exists for user {user_id}")
            return {
                'success': True,
                'wallet': wallet.to_dict(),
                'created': False,
                'message': 'Wallet already exists'
            }
        
        # Create new wallet
        return self.create_wallet(user_id)
