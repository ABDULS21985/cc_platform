"""
Community Deposit Service - Orchestrates member deposits to community wallets.
Uses SafeHaven provider for one-time virtual account creation.
"""
import logging
import os
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timedelta

from modules.wallet.providers import (
    PaymentProviderContext,
    PaymentProviderFactory,
    VirtualAccountRequest,
)
from modules.community.repositories.wallet_repository import CommunityWalletRepository
from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
from modules.community.models.community import Community
from modules.community.models.community_member import CommunityMember
from modules.auth_v2.models.user import User
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


class CommunityDepositService:
    """
    Handles community wallet deposits via SafeHaven provider.
    
    Responsibilities:
    - Validate member can deposit to community
    - Create one-time virtual account via SafeHaven
    - Track pending deposit transaction
    - Return account details for user to pay
    """
    
    # Deposit limits (in NGN)
    MIN_DEPOSIT = Decimal('50.00')
    MAX_DEPOSIT = Decimal('10000000.00')  # 10M max for community deposits
    
    def __init__(self):
        """Initialize service with dependencies."""
        self.wallet_repo = CommunityWalletRepository()
        self.transaction_repo = WalletTransactionRepository()
        self.community_provider = PaymentProviderFactory.get_provider(
            PaymentProviderContext.COMMUNITY
        )
    
    def initiate_deposit(
        self,
        community_id: int,
        user_id: int,
        amount: Decimal,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate a deposit to community wallet.
        
        Creates SafeHaven one-time virtual account for member to pay.
        
        Args:
            community_id: ID of community to deposit to
            user_id: ID of member making deposit
            amount: Amount to deposit (in NGN)
            description: Optional description
            
        Returns:
            Dictionary with:
            - transaction_id: ID of pending transaction
            - reference: Transaction reference
            - amount: Deposit amount
            - account_details: {account_number, account_name, bank_name}
            - expires_at: When payment window expires
            
        Raises:
            ValueError: If validation fails
            Exception: If provider API call fails
        """
        logger.info(
            f"Initiating community deposit",
            extra={"community_id": community_id, "user_id": user_id, "amount": str(amount)}
        )
        
        # Validate amount
        self._validate_amount(amount)
        
        # Validate community and member
        community = self._get_active_community(community_id)
        user = self._get_user(user_id)
        self._validate_membership(community_id, user_id)
        
        # Get community wallet
        wallet = self.wallet_repo.find_by_community_id(community_id)
        if not wallet:
            raise ValueError("Community wallet not found")
        
        # Generate transaction reference
        reference = self._generate_reference(community_id, user_id)
        
        # Create one-time virtual account via SafeHaven
        virtual_account_response = self._create_virtual_account(
            community=community,
            user=user,
            amount=amount,
            reference=reference,
            wallet=wallet,
        )
        
        # Create pending transaction with balance tracking
        from modules.wallet.models.wallet_transaction import WalletTransaction as TxnModel
        signed_amount = TxnModel.compute_signed_amount(amount, 'credit')
        
        transaction = self.transaction_repo.create({
            'wallet_id': wallet.id,
            'community_id': community_id,
            'reference': reference,
            # SafeHaven session/account identifier used for verification
            'bell_mfb_session_id': virtual_account_response.account_number,
            # Optional: store SafeHaven nameEnquiryReference for traceability
            'bell_mfb_reference': virtual_account_response.provider_reference,
            # DB constraint expects business types (deposit/withdrawal/transfer/payment),
            # not accounting directions (credit/debit).
            'type': 'deposit',
            'transaction_type': 'community_deposit',
            'amount': amount,
            'signed_amount': signed_amount,
            'fee': Decimal('0.00'),
            'net_amount': amount,
            'balance_before': wallet.balance,
            'balance_after': wallet.balance + amount,  # Will be actual after confirmation
            'description': description or f'Deposit to {community.name}',
            'status': 'pending',
            'meta': {
                'user_id': user_id,
                'community_name': community.name
            }
        })
        
        db.session.commit()
        
        logger.info(
            f"Community deposit initiated: {reference}",
            extra={"transaction_id": transaction.id, "amount": str(amount)}
        )

        # SafeHaven virtual accounts are time-bound via `validFor`.
        valid_for_seconds = int(os.getenv("SAFEHAVEN_ACCOUNT_VALID_FOR", "900"))
        expires_at = datetime.utcnow() + timedelta(seconds=valid_for_seconds)
        
        return {
            'success': True,
            'transaction_id': transaction.id,
            'reference': reference,
            'amount': str(amount),
            'status': 'pending',
            'account_details': {
                'account_number': virtual_account_response.account_number,
                'account_name': virtual_account_response.account_name,
                'bank_name': virtual_account_response.bank_name or self.community_provider.name
            },
            'instructions': (
                f'Transfer exactly ₦{amount:,.2f} to the account above to complete deposit. '
                f'Funds will be credited to {community.name} wallet automatically.'
            ),
            'expires_in_seconds': valid_for_seconds,
            'expires_at': expires_at.isoformat() + "Z",
            'message': 'Virtual account created successfully'
        }
    
    def _validate_amount(self, amount: Decimal) -> None:
        """Validate deposit amount."""
        if amount < self.MIN_DEPOSIT:
            raise ValueError(f"Minimum deposit is ₦{self.MIN_DEPOSIT:,.2f}")
        
        if amount > self.MAX_DEPOSIT:
            raise ValueError(f"Maximum deposit is ₦{self.MAX_DEPOSIT:,.2f}")
    
    def _get_active_community(self, community_id: int) -> Community:
        """Get community and validate it's active."""
        community = Community.query.get(community_id)
        if not community:
            raise ValueError("Community not found")
        
        if community.status != 'active':
            raise ValueError(f"Community is {community.status}, deposits not allowed")
        
        return community
    
    def _get_user(self, user_id: int) -> User:
        """Get user record."""
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        return user
    
    def _validate_membership(self, community_id: int, user_id: int) -> None:
        """Validate user is active member of community."""
        membership = CommunityMember.query.filter_by(
            community_id=community_id,
            user_id=user_id
        ).first()
        
        if not membership:
            raise ValueError("User is not a member of this community")
        
        if membership.status != 'active':
            raise ValueError(f"Membership is {membership.status}, deposits not allowed")
    
    def _create_virtual_account(
        self,
        community: Community,
        user: User,
        amount: Decimal,
        reference: str,
        wallet: Any
    ):
        """Create one-time virtual account via community provider."""
        request = VirtualAccountRequest(
            user_id=user.id,
            wallet_id=wallet.id,
            first_name=user.firstname or "Member",
            last_name=user.lastname or "Deposit",
            phone_number=user.phone_number or "",
            bvn="",  # Not required for community deposits
            date_of_birth="",  # Not required
            gender="unspecified",
            metadata={
                "community_id": community.id,
                "community_name": community.name,
                "user_id": user.id,
                "reference": reference,
                "amount": str(amount),
                "purpose": "community_deposit"
            }
        )
        
        try:
            return self.community_provider.ensure_virtual_account(request)
        except Exception as exc:
            logger.error(
                "Failed to create virtual account for community deposit",
                exc_info=True,
                extra={"community_id": community.id, "user_id": user.id}
            )
            raise Exception(f"Failed to create payment account: {exc}")
    
    def _generate_reference(self, community_id: int, user_id: int) -> str:
        """
        Generate unique ULID-based transaction reference.
        
        Format: CDEP-ULID (e.g., CDEP-01ARZ3NDEKTSV4RRFFQ69G5FAV)
        
        ULID provides:
        - Lexicographically sortable (time-ordered)
        - 128-bit compatibility with UUID
        - URL-safe encoding
        """
        from modules.wallet.models.wallet_transaction import WalletTransaction
        return WalletTransaction.generate_reference('CDEP')
