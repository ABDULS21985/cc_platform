"""
Verification Service - Orchestrates BVN/NIN verification
Follows Clean Architecture - coordinates between repositories and external services

✨ UPDATED: Now focuses only on verification, wallet creation is separate
"""
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime
from modules.verification.repositories.verification_repository import VerificationRepository
from modules.verification.services.encryption_service import EncryptionService
from modules.verification.providers.provider_factory import VerificationProviderFactory
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


def _mock_verification_enabled() -> bool:
    enabled = os.getenv('MOCK_VERIFICATION', 'false').lower() == 'true'
    if enabled and os.getenv('ENV', 'development').lower() == 'production':
        raise ValueError("Mock verification cannot be enabled in production")
    return enabled


class VerificationService:
    """
    Service for handling user verification

    Responsibilities:
    - Verify BVN/NIN with external providers (Paystack/IDCheck) ✨
    - Encrypt sensitive data before storage
    - Update user verification status

    Orchestration Service: Coordinates verification flow
    """

    def __init__(self):
        """Initialize service with dependencies"""
        self.verification_repo = VerificationRepository()
        self.encryption_service = EncryptionService()
    
    def verify_bvn(
        self,
        user_id: int,
        bvn: str,
        date_of_birth: str,
        verification_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Verify user BVN with external provider
        
        Steps:
        1. Check if user already verified
        2. Check if BVN already used
        3. Verify with external provider (Paystack/IDCheck)
        4. Encrypt and store BVN
        5. Update user verification status
        
        Args:
            user_id: ID of user to verify
            bvn: Bank Verification Number (11 digits)
            date_of_birth: Date of birth in YYYY-MM-DD format
            verification_id: Optional existing verification record ID
            
        Returns:
            Dictionary with verification info
            
        Raises:
            ValueError: If validation fails or BVN already used
        """
        logger.info(f"Starting BVN verification for user {user_id}")
        
        try:
            # Step 1: Check if user already has verification
            existing_verification = self.verification_repo.find_by_user_id(user_id)
            if existing_verification and existing_verification.status == 'verified':
                raise ValueError("User already has verified BVN")
            
            # Step 2: Encrypt BVN and check for duplicates
            encrypted_bvn, bvn_hash = self.encryption_service.encrypt_and_hash(bvn)

            duplicate = self.verification_repo.find_by_hash(bvn_hash)
            if duplicate and duplicate.user_id != user_id:
                raise ValueError("This BVN is already registered to another account")

            # Step 3: Get user information
            from modules.auth_v2.models.user import User
            user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User {user_id} not found")

            # ========================================
            # ✨ STEP 4: VERIFY BVN WITH PAYSTACK/IDCHECK (OR MOCK)
            # ========================================
            logger.info(f"🔍 Verifying BVN with external provider for user {user_id}")

            # Check if mock verification is enabled for testing.
            if _mock_verification_enabled():
                logger.info(f"🧪 MOCK MODE: Simulating successful BVN verification for user {user_id}")
                verification_result = {
                    'verified': True,
                    'provider': 'mock',
                    'message': 'Mock verification successful'
                }
            else:
                verification_result = VerificationProviderFactory.verify_bvn_with_fallback(
                    bvn=bvn,
                    firstname=user.firstname,
                    lastname=user.lastname,
                    date_of_birth=date_of_birth
                )

            if not verification_result['verified']:
                error_msg = verification_result['message']
                logger.warning(f"❌ BVN verification failed for user {user_id}: {error_msg}")

                # Update verification record to failed
                if verification_id:
                    self.verification_repo.update_status(
                        verification_id,
                        'failed',
                        error_message=error_msg
                    )

                raise ValueError(error_msg)

            logger.info(
                f"✅ BVN verified successfully with {verification_result.get('provider', 'provider')} "
                f"for user {user_id}"
            )

            # Step 5: Create verification record
            try:
                if verification_id:
                    verification = self.verification_repo.update_status(
                        verification_id,
                        'verified',
                        verification_number_encrypted=encrypted_bvn,
                        verification_number_hash=bvn_hash,
                        verified_at=datetime.utcnow()
                    )
                else:
                    verification = self.verification_repo.create({
                        'user_id': user_id,
                        'verification_type': 'bvn',
                        'verification_number_encrypted': encrypted_bvn,
                        'verification_number_hash': bvn_hash,
                        'status': 'verified',
                        'verified_at': datetime.utcnow()
                    })
                
                # Update user verification flags
                user.bvn_verified = True
                user.verification_status = 'verified'
                db.session.commit()

                logger.info(f"BVN verification successful for user {user_id}")

                self._record_verification_audit(user_id, 'bvn')

                return {
                    'success': True,
                    'verification_id': verification.id,
                    'verification_type': 'bvn',
                    'provider': verification_result.get('provider', 'unknown'),
                    'message': 'BVN verified successfully'
                }
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Database error during BVN verification: {str(e)}")
                raise
                
        except ValueError as e:
            logger.warning(f"BVN verification validation failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"BVN verification failed: {str(e)}", exc_info=True)
            raise
    
    def verify_nin(
        self,
        user_id: int,
        nin: str,
        date_of_birth: str,
        verification_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Verify user NIN with external provider
        
        Args:
            user_id: ID of user to verify
            nin: National Identification Number
            date_of_birth: Date of birth in YYYY-MM-DD format
            verification_id: Optional existing verification record ID
            
        Returns:
            Dictionary with verification info
            
        Raises:
            ValueError: If validation fails or NIN already used
        """
        logger.info(f"Starting NIN verification for user {user_id}")
        
        try:
            # Step 1: Check if user already has verification
            existing_verification = self.verification_repo.find_by_user_id(user_id)
            if existing_verification and existing_verification.status == 'verified':
                raise ValueError("User already has verified identity")
            
            # Step 2: Encrypt NIN and check for duplicates
            encrypted_nin, nin_hash = self.encryption_service.encrypt_and_hash(nin)

            duplicate = self.verification_repo.find_by_hash(nin_hash)
            if duplicate and duplicate.user_id != user_id:
                raise ValueError("This NIN is already registered to another account")

            # Step 3: Get user information
            from modules.auth_v2.models.user import User
            user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User {user_id} not found")

            # ========================================
            # STEP 4: VERIFY NIN WITH PAYSTACK/IDCHECK (OR MOCK)
            # ========================================
            logger.info(f"🔍 Verifying NIN with external provider for user {user_id}")

            # Check if mock verification is enabled for testing.
            if _mock_verification_enabled():
                logger.info(f"🧪 MOCK MODE: Simulating successful NIN verification for user {user_id}")
                verification_result = {
                    'verified': True,
                    'provider': 'mock',
                    'message': 'Mock verification successful'
                }
            else:
                verification_result = VerificationProviderFactory.verify_nin_with_fallback(
                    nin=nin,
                    firstname=user.firstname,
                    lastname=user.lastname,
                    date_of_birth=date_of_birth
                )

            if not verification_result['verified']:
                error_msg = verification_result['message']
                logger.warning(f"❌ NIN verification failed for user {user_id}: {error_msg}")

                # Update verification record to failed
                if verification_id:
                    self.verification_repo.update_status(
                        verification_id,
                        'failed',
                        error_message=error_msg
                    )

                raise ValueError(error_msg)

            logger.info(
                f"✅ NIN verified successfully with {verification_result.get('provider', 'provider')} "
                f"for user {user_id}"
            )

            # Step 5: Create verification record
            try:
                if verification_id:
                    verification = self.verification_repo.update_status(
                        verification_id,
                        'verified',
                        verification_number_encrypted=encrypted_nin,
                        verification_number_hash=nin_hash,
                        verified_at=datetime.utcnow()
                    )
                else:
                    verification = self.verification_repo.create({
                        'user_id': user_id,
                        'verification_type': 'nin',
                        'verification_number_encrypted': encrypted_nin,
                        'verification_number_hash': nin_hash,
                        'status': 'verified',
                        'verified_at': datetime.utcnow()
                    })
                
                # Update user verification flags
                user.nin_verified = True
                user.verification_status = 'verified'
                db.session.commit()

                logger.info(f"NIN verification successful for user {user_id}")

                self._record_verification_audit(user_id, 'nin')

                return {
                    'success': True,
                    'verification_id': verification.id,
                    'verification_type': 'nin',
                    'provider': verification_result.get('provider', 'unknown'),
                    'message': 'NIN verified successfully'
                }
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Database error during NIN verification: {str(e)}")
                raise
                
        except ValueError as e:
            logger.warning(f"NIN verification validation failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"NIN verification failed: {str(e)}", exc_info=True)
            raise

    def _record_verification_audit(self, user_id: int, kind: str) -> None:
        """Best-effort: drop a notification + audit row when KYC succeeds."""
        try:
            from modules.notifications.services.notification_service import NotificationService
            from modules.audit.services.audit_service import AuditService
            label = kind.upper()
            NotificationService().create_for_user(
                user_id=user_id,
                title=f"{label} verified",
                body="Your identity is verified. Wallet features are now unlocked.",
                category='security',
                source='Identity verification',
                action_href='/dashboard/wallet',
                action_label='Open wallet',
            )
            AuditService().record(
                user_id=user_id,
                action=f'{label} verification successful',
                details=f'{label} identity verification completed',
                category='security',
                severity='info',
                actor='You',
            )
        except Exception as exc:
            logger.warning('post-verification notify/audit failed: %s', exc)

    def get_verification_status(self, user_id: int) -> Dict[str, Any]:
        """
        Get verification status for a user
        
        Args:
            user_id: ID of user
            
        Returns:
            Dictionary with verification status
        """
        verification = self.verification_repo.find_by_user_id(user_id)
        
        # Check if user has a wallet
        from modules.wallet.services.wallet_service import WalletService
        wallet_service = WalletService()
        has_wallet = wallet_service.check_wallet_exists(user_id)
        
        if not verification:
            return {
                'verified': False,
                'status': 'not_started',
                'verification_type': None,
                'has_wallet': has_wallet
            }
        
        return {
            'verified': verification.status == 'verified',
            'status': verification.status,
            'verification_type': verification.verification_type,
            'verified_at': verification.verified_at.isoformat() if verification.verified_at else None,
            'error_message': verification.error_message,
            'has_wallet': has_wallet
        }
