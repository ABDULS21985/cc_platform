"""
Deposit Service - Orchestrates wallet deposit flow via payment providers.

Single Responsibility: Handle deposit logic including on-demand virtual account provisioning.
"""
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime

from modules.wallet.providers import (
    PaymentProviderContext,
    PaymentProviderFactory,
    VirtualAccountRequest,
)
from modules.wallet.providers.bell_mfb_provider import BellMFBProvider
from modules.wallet.repositories.wallet_repository import WalletRepository
from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
from modules.wallet.models.wallet_transaction import WalletTransaction
from modules.auth_v2.models.user import User
from modules.auth_v2.extensions import db
from modules.verification.repositories.verification_repository import VerificationRepository
from modules.verification.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class DepositService:
    """
    Service for handling wallet deposits with provider abstraction.
    
    Responsibilities:
    - Check/create provider virtual account on-demand
    - Create pending deposit transactions
    - Return bank details for user to transfer
    
    Single Responsibility: Deposit orchestration only
    """
    
    # Minimum/Maximum deposit amounts (in NGN)
    MIN_DEPOSIT = Decimal('50.00')
    MAX_DEPOSIT = Decimal('5000000.00')
    
    def __init__(self):
        """Initialize service with dependencies."""
        self.wallet_repo = WalletRepository()
        self.transaction_repo = WalletTransactionRepository()
        self.verification_repo = VerificationRepository()
        self.encryption_service = EncryptionService()
        self.personal_provider = PaymentProviderFactory.get_provider(
            PaymentProviderContext.PERSONAL
        )
        # Fallback provider for personal deposits.
        # We want SafeHaven first (PERSONAL_PAYMENT_PROVIDER=safehaven) and Bell MFB as fallback.
        self.fallback_provider = BellMFBProvider()
    
    def initiate_deposit(
        self,
        user_id: int,
        amount: Decimal,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate a deposit for a user.
        
        Provisions a provider virtual account on-demand if user doesn't have one.
        Creates a pending transaction and returns bank details for transfer.
        
        Args:
            user_id: ID of the user making the deposit
            amount: Amount to deposit (in NGN)
            description: Optional description for the transaction
            
        Returns:
            Dictionary with:
            - transaction_id: ID of the pending transaction
            - reference: Transaction reference
            - amount: Deposit amount
            - bank_details: {account_number, account_name, bank_name}
            - expires_at: When the deposit request expires (if applicable)
            
        Raises:
            ValueError: If amount is invalid or wallet not found
            Exception: If provider API call fails
        """
        logger.info(f"Initiating deposit for user {user_id}: ₦{amount}")
        
        # Validate amount
        self._validate_amount(amount)
        
        # Get user's wallet
        wallet = self.wallet_repo.find_by_user_id(user_id)
        if not wallet:
            raise ValueError("Wallet not found. Please complete identity verification first.")
        
        # Track which provider was used
        provider_used = 'primary'
        using_fallback = False
        
        # Check if wallet has a provider-backed virtual account, create if not
        if not wallet.account_number:
            logger.info(
                "Provisioning virtual account for personal wallet",
                extra={"user_id": user_id, "wallet_id": wallet.id},
            )
            
            # Try primary provider (Bell MFB) first, fall back to SafeHaven if it fails
            try:
                provider_used = self._provision_virtual_account(
                    wallet, amount=amount, use_fallback=False
                )
            except Exception as primary_error:
                logger.warning(
                    f"Primary provider failed, trying fallback: {primary_error}",
                    extra={"user_id": user_id, "wallet_id": wallet.id},
                )
                try:
                    provider_used = self._provision_virtual_account(
                        wallet, amount=amount, use_fallback=True
                    )
                    using_fallback = True
                except Exception as fallback_error:
                    logger.error(
                        f"Both providers failed. Primary: {primary_error}, Fallback: {fallback_error}",
                        extra={"user_id": user_id, "wallet_id": wallet.id},
                    )
                    raise Exception(
                        "Unable to create payment account. Please try again later."
                    )
        
        # Determine bank name based on provider used
        bank_name = self.fallback_provider.name if using_fallback else self.personal_provider.name
        
        # Create pending transaction with balance tracking
        # For pending deposits, balance_before is current balance, balance_after will be updated on completion
        transaction = self.transaction_repo.create_with_balance_tracking(
            wallet_id=wallet.id,
            wallet_balance=wallet.balance,
            # NOTE: In the current DB schema, `wallet_transactions.type` is constrained to:
            # deposit / withdrawal / transfer / payment (not credit/debit).
            # For deposits we must store `deposit` here to satisfy the DB constraint.
            direction='deposit',
            amount=amount,
            fee=Decimal('0.00'),
            description=description or 'Wallet deposit',
            metadata={
                'user_id': user_id,
                'provider': provider_used,
                'using_fallback': using_fallback
            },
            reference_prefix='DEP',
            status='pending'
        )
        
        logger.info(
            f"Deposit initiated: {transaction.reference} for ₦{amount} via {provider_used}",
            extra={"provider": provider_used, "using_fallback": using_fallback}
        )
        
        # Different messaging based on provider
        if using_fallback:
            message = (
                'Transfer to the account above. After payment, click "Verify Payment" '
                'or wait a few minutes for automatic verification.'
            )
        else:
            message = 'Your wallet will be credited automatically once payment is confirmed.'
        
        return {
            'success': True,
            'transaction_id': transaction.id,
            'reference': transaction.reference,
            'amount': str(amount),
            'status': 'pending',
            'provider': provider_used,
            'using_fallback': using_fallback,
            'bank_details': {
                'account_number': wallet.account_number,
                'account_name': wallet.account_name,
                'bank_name': bank_name
            },
            'instructions': f'Transfer ₦{amount:,.2f} to the account above to fund your wallet.',
            'message': message
        }
    
    def _validate_amount(self, amount: Decimal) -> None:
        """
        Validate deposit amount.
        
        Args:
            amount: Amount to validate
            
        Raises:
            ValueError: If amount is invalid
        """
        if amount < self.MIN_DEPOSIT:
            raise ValueError(f"Minimum deposit is ₦{self.MIN_DEPOSIT:,.2f}")
        
        if amount > self.MAX_DEPOSIT:
            raise ValueError(f"Maximum deposit is ₦{self.MAX_DEPOSIT:,.2f}")
    
    def _provision_virtual_account(self, wallet, *, amount: Decimal, use_fallback: bool = False) -> str:
        """
        Provision a virtual account using the configured provider.
        
        Args:
            wallet: The wallet to provision an account for
            use_fallback: If True, use SafeHaven instead of Bell MFB
            
        Returns:
            str: Provider name used ('bell_mfb' or 'safehaven')
        """
        user = self._get_user(wallet.user_id)
        verification = self._get_verified_verification(wallet.user_id)
        bvn = self._decrypt_bvn(verification)

        request = self._build_virtual_account_request(wallet, user, bvn, amount=amount)
        
        provider = self.fallback_provider if use_fallback else self.personal_provider
        # Derive provider_name from implementation, for metadata/logging.
        try:
            provider_name = getattr(provider, "provider_type").value  # Enum -> str
        except Exception:
            provider_name = "fallback" if use_fallback else "primary"

        try:
            response = provider.ensure_virtual_account(request)
            wallet.account_number = response.account_number
            wallet.account_name = response.account_name
            wallet.bell_mfb_client_id = response.provider_client_id
            wallet.bell_mfb_external_reference = response.provider_reference

            db.session.commit()

            logger.info(
                f"Virtual account provisioned via {provider_name}",
                extra={
                    "user_id": wallet.user_id,
                    "wallet_id": wallet.id,
                    "account_number": wallet.account_number,
                    "provider": provider_name,
                },
            )
            return provider_name
        except Exception as exc:
            db.session.rollback()
            logger.error(
                f"Virtual account provisioning failed via {provider_name}",
                exc_info=True,
                extra={"user_id": wallet.user_id, "wallet_id": wallet.id, "provider": provider_name},
            )
            raise Exception(f"Failed to create payment account via {provider_name}: {exc}")

    def _build_virtual_account_request(
        self, wallet, user: User, bvn: str, *, amount: Decimal
    ) -> VirtualAccountRequest:
        """Construct provider-agnostic request for virtual account creation."""
        phone_number = self._format_phone_number(user.phone_number or "")
        date_of_birth = user.date_of_birth or "1990/01/01"

        return VirtualAccountRequest(
            user_id=user.id,
            wallet_id=wallet.id,
            first_name=user.firstname or "User",
            last_name=user.lastname or "Account",
            phone_number=phone_number,
            bvn=bvn,
            date_of_birth=date_of_birth,
            gender="male",  # Default until richer profile data is available
            metadata={
                "user_id": user.id,
                "wallet_id": wallet.id,
                "amount": str(amount),
                "purpose": "personal_deposit",
            },
        )

    def _get_user(self, user_id: int) -> User:
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        return user

    def _get_verified_verification(self, user_id: int):
        verification = self.verification_repo.find_by_user_id(user_id)
        if not verification or verification.status != 'verified':
            raise ValueError("Identity verification required before deposit")
        return verification

    def _decrypt_bvn(self, verification) -> str:
        try:
            return self.encryption_service.decrypt(
                verification.verification_number_encrypted
            )
        except Exception as exc:
            logger.error(
                "Failed to decrypt BVN", exc_info=True, extra={"verification_id": verification.id}
            )
            raise ValueError("Could not retrieve verification data") from exc

    def _format_phone_number(self, phone: str) -> str:
        """Normalize phone number to 0XXXXXXXXXX format for provider APIs."""
        if phone.startswith('+234'):
            return '0' + phone[4:]
        if phone.startswith('234'):
            return '0' + phone[3:]
        return phone
    
    def _generate_reference(self, prefix: str = "DEP") -> str:
        """
        Generate unique ULID-based transaction reference.
        
        Format: PREFIX-ULID (e.g., DEP-01ARZ3NDEKTSV4RRFFQ69G5FAV)
        
        ULID provides:
        - Lexicographically sortable (time-ordered)
        - 128-bit compatibility with UUID
        - URL-safe encoding
        
        Args:
            prefix: Optional prefix for the reference
            
        Returns:
            Unique ULID-based reference string
        """
        return WalletTransaction.generate_reference(prefix)
