"""
Unit Tests for VerificationService
Tests business logic with mocked dependencies
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from decimal import Decimal
from datetime import datetime
from modules.verification.services.verification_service import VerificationService


@pytest.fixture
def mock_verification_repo():
    """Mock VerificationRepository"""
    return Mock()


@pytest.fixture
def mock_wallet_repo():
    """Mock WalletRepository"""
    return Mock()


@pytest.fixture
def mock_encryption_service():
    """Mock EncryptionService"""
    mock = Mock()
    mock.encrypt_and_hash.return_value = ('encrypted_data', 'hash_value')
    return mock


@pytest.fixture
def mock_bell_mfb_service():
    """Mock BellMFBService"""
    mock = Mock()
    mock.create_individual_client.return_value = {
        'clientId': 'CLIENT_123',
        'account': {
            'accountNumber': '1234567890',
            'accountName': 'Test User'
        }
    }
    return mock


@pytest.fixture
def verification_service(
    mock_verification_repo,
    mock_wallet_repo,
    mock_encryption_service,
    mock_bell_mfb_service
):
    """Create VerificationService with mocked dependencies"""
    with patch('modules.verification.services.verification_service.VerificationRepository', return_value=mock_verification_repo), \
         patch('modules.verification.services.verification_service.WalletRepository', return_value=mock_wallet_repo), \
         patch('modules.verification.services.verification_service.EncryptionService', return_value=mock_encryption_service), \
         patch('modules.verification.services.verification_service.BellMFBService', return_value=mock_bell_mfb_service):
        
        service = VerificationService()
        # Manually inject mocks for test access
        service.verification_repo = mock_verification_repo
        service.wallet_repo = mock_wallet_repo
        service.encryption_service = mock_encryption_service
        service.bell_mfb_service = mock_bell_mfb_service
        return service


class TestVerifyBVN:
    """Test suite for BVN verification"""
    
    def test_verify_bvn_success(
        self,
        verification_service,
        mock_verification_repo,
        mock_wallet_repo,
        mock_user_repo,
        mock_bell_mfb_service
    ):
        """Test successful BVN verification"""
        # Setup mocks
        mock_verification_repo.find_by_hash.return_value = None  # No duplicate
        mock_verification_repo.create.return_value = Mock(id=1)
        mock_wallet_repo.find_by_user_id.return_value = None  # No existing wallet
        
        # Execute
        result = verification_service.verify_bvn_and_create_wallet(
            user_id=1,
            bvn='22222222221',
            date_of_birth='1990-01-15',
            first_name='Test',
            last_name='User'
        )
        
        # Verify
        assert result['success'] is True
        assert result['verification_id'] == 1
        assert 'wallet' in result
        mock_verification_repo.create.assert_called_once()
        mock_bell_mfb_service.create_individual_client.assert_called_once()
        mock_wallet_repo.create.assert_called_once()
    
    def test_verify_bvn_duplicate(
        self,
        verification_service,
        mock_verification_repo
    ):
        """Test BVN duplicate detection"""
        # Setup mock - duplicate found
        existing_verification = Mock(user_id=2)
        mock_verification_repo.find_by_hash.return_value = existing_verification
        
        # Execute
        result = verification_service.verify_bvn_and_create_wallet(
            user_id=1,
            bvn='22222222221',
            date_of_birth='1990-01-15',
            first_name='Test',
            last_name='User'
        )
        
        # Verify
        assert result['success'] is False
        assert 'already used' in result['error'].lower()
        mock_verification_repo.create.assert_not_called()
    
    def test_verify_bvn_with_existing_wallet(
        self,
        verification_service,
        mock_verification_repo,
        mock_wallet_repo,
        mock_bell_mfb_service
    ):
        """Test BVN verification when wallet already exists"""
        # Setup mocks
        mock_verification_repo.find_by_hash.return_value = None
        mock_verification_repo.create.return_value = Mock(id=1)
        existing_wallet = Mock(id=1, account_number='1234567890')
        mock_wallet_repo.find_by_user_id.return_value = existing_wallet
        
        # Execute
        result = verification_service.verify_bvn_and_create_wallet(
            user_id=1,
            bvn='22222222221',
            date_of_birth='1990-01-15',
            first_name='Test',
            last_name='User'
        )
        
        # Verify
        assert result['success'] is True
        assert result['wallet']['id'] == 1
        mock_bell_mfb_service.create_individual_client.assert_not_called()
        mock_wallet_repo.create.assert_not_called()
    
    def test_verify_bvn_bell_mfb_error(
        self,
        verification_service,
        mock_verification_repo,
        mock_wallet_repo,
        mock_bell_mfb_service
    ):
        """Test BVN verification with Bell MFB API error"""
        # Setup mocks
        mock_verification_repo.find_by_hash.return_value = None
        mock_verification_repo.create.return_value = Mock(id=1)
        mock_wallet_repo.find_by_user_id.return_value = None
        mock_bell_mfb_service.create_individual_client.side_effect = Exception('API Error')
        
        # Execute
        result = verification_service.verify_bvn_and_create_wallet(
            user_id=1,
            bvn='22222222221',
            date_of_birth='1990-01-15',
            first_name='Test',
            last_name='User'
        )
        
        # Verify
        assert result['success'] is False
        assert 'error' in result
        mock_verification_repo.update_status.assert_called_with(
            1, 'failed', error_message=pytest.approx(str, 'API Error')
        )


class TestVerifyNIN:
    """Test suite for NIN verification"""
    
    def test_verify_nin_success(
        self,
        verification_service,
        mock_verification_repo,
        mock_wallet_repo,
        mock_bell_mfb_service
    ):
        """Test successful NIN verification"""
        # Setup mocks
        mock_verification_repo.find_by_hash.return_value = None
        mock_verification_repo.create.return_value = Mock(id=1)
        mock_wallet_repo.find_by_user_id.return_value = None
        
        # Execute
        result = verification_service.verify_nin_and_create_wallet(
            user_id=1,
            nin='12345678901',
            date_of_birth='1990-01-15',
            first_name='Test',
            last_name='User'
        )
        
        # Verify
        assert result['success'] is True
        assert result['verification_id'] == 1
        mock_verification_repo.create.assert_called_once()
        mock_bell_mfb_service.create_individual_client.assert_called_once()
    
    def test_verify_nin_duplicate(
        self,
        verification_service,
        mock_verification_repo
    ):
        """Test NIN duplicate detection"""
        # Setup mock
        existing_verification = Mock(user_id=2)
        mock_verification_repo.find_by_hash.return_value = existing_verification
        
        # Execute
        result = verification_service.verify_nin_and_create_wallet(
            user_id=1,
            nin='12345678901',
            date_of_birth='1990-01-15',
            first_name='Test',
            last_name='User'
        )
        
        # Verify
        assert result['success'] is False
        assert 'already used' in result['error'].lower()


class TestGetVerificationStatus:
    """Test suite for getting verification status"""
    
    def test_get_status_verified(
        self,
        verification_service,
        mock_verification_repo
    ):
        """Test getting status for verified user"""
        # Setup mock
        verification = Mock(
            status='verified',
            verification_type='bvn',
            verified_at=datetime.utcnow()
        )
        mock_verification_repo.find_by_user_id.return_value = verification
        
        # Execute
        result = verification_service.get_verification_status(user_id=1)
        
        # Verify
        assert result['status'] == 'verified'
        assert result['verification_type'] == 'bvn'
        assert result['verified_at'] is not None
    
    def test_get_status_not_started(
        self,
        verification_service,
        mock_verification_repo
    ):
        """Test getting status for user without verification"""
        # Setup mock
        mock_verification_repo.find_by_user_id.return_value = None
        
        # Execute
        result = verification_service.get_verification_status(user_id=1)
        
        # Verify
        assert result['status'] == 'not_started'
        assert result['verification_type'] is None
    
    def test_get_status_pending(
        self,
        verification_service,
        mock_verification_repo
    ):
        """Test getting status for pending verification"""
        # Setup mock
        verification = Mock(
            status='pending',
            verification_type='nin',
            verified_at=None
        )
        mock_verification_repo.find_by_user_id.return_value = verification
        
        # Execute
        result = verification_service.get_verification_status(user_id=1)
        
        # Verify
        assert result['status'] == 'pending'
        assert result['verification_type'] == 'nin'
        assert result['verified_at'] is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
