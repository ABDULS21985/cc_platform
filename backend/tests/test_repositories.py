"""
Unit Tests for Repositories
Tests data access layer with database operations
"""
import pytest
from decimal import Decimal
from datetime import datetime
from modules.verification.repositories.verification_repository import VerificationRepository
from modules.wallet.repositories.wallet_repository import WalletRepository
from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository
from modules.auth_v2.extensions import db
from app import create_app


@pytest.fixture(scope='module')
def app():
    """Create Flask app for testing"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:postgres@localhost:5432/ccp_db'
    return app


@pytest.fixture(scope='module')
def _db(app):
    """Create database tables for testing"""
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()


@pytest.fixture
def db_session(app, _db):
    """Create a new database session for each test"""
    with app.app_context():
        connection = _db.engine.connect()
        transaction = connection.begin()
        
        yield _db.session
        
        transaction.rollback()
        connection.close()
        _db.session.remove()


class TestVerificationRepository:
    """Test suite for VerificationRepository"""
    
    @pytest.fixture
    def repo(self, db_session):
        """Create repository instance"""
        return VerificationRepository()
    
    @pytest.fixture
    def sample_verification_data(self):
        """Sample verification data"""
        return {
            'user_id': 1,
            'verification_type': 'bvn',
            'verification_number_encrypted': 'encrypted_bvn_data',
            'verification_number_hash': 'hash_value_123',
            'status': 'pending'
        }
    
    def test_create_verification(self, repo, sample_verification_data, db_session):
        """Test creating a verification record"""
        verification = repo.create(sample_verification_data)
        
        assert verification.id is not None
        assert verification.user_id == 1
        assert verification.verification_type == 'bvn'
        assert verification.status == 'pending'
    
    def test_find_by_id(self, repo, sample_verification_data, db_session):
        """Test finding verification by ID"""
        created = repo.create(sample_verification_data)
        found = repo.find_by_id(created.id)
        
        assert found is not None
        assert found.id == created.id
        assert found.user_id == created.user_id
    
    def test_find_by_user_id(self, repo, sample_verification_data, db_session):
        """Test finding verification by user ID"""
        created = repo.create(sample_verification_data)
        found = repo.find_by_user_id(created.user_id)
        
        assert found is not None
        assert found.user_id == created.user_id
    
    def test_find_by_hash(self, repo, sample_verification_data, db_session):
        """Test finding verification by hash (duplicate detection)"""
        created = repo.create(sample_verification_data)
        found = repo.find_by_hash(created.verification_number_hash)
        
        assert found is not None
        assert found.verification_number_hash == created.verification_number_hash
    
    def test_update_status(self, repo, sample_verification_data, db_session):
        """Test updating verification status"""
        created = repo.create(sample_verification_data)
        updated = repo.update_status(
            created.id,
            'verified',
            bell_mfb_client_id='CLIENT_123',
            verified_at=datetime.utcnow()
        )
        
        assert updated is not None
        assert updated.status == 'verified'
        assert updated.bell_mfb_client_id == 'CLIENT_123'
        assert updated.verified_at is not None


class TestWalletRepository:
    """Test suite for WalletRepository"""
    
    @pytest.fixture
    def repo(self, db_session):
        """Create repository instance"""
        return WalletRepository()
    
    @pytest.fixture
    def sample_wallet_data(self):
        """Sample wallet data"""
        return {
            'user_id': 1,
            'account_number': '1234567890',
            'account_name': 'Test User',
            'balance': Decimal('0.00'),
            'currency': 'NGN',
            'status': 'active',
            'bell_mfb_client_id': 'CLIENT_123'
        }
    
    def test_create_wallet(self, repo, sample_wallet_data, db_session):
        """Test creating a wallet"""
        wallet = repo.create(sample_wallet_data)
        
        assert wallet.id is not None
        assert wallet.account_number == '1234567890'
        assert wallet.balance == Decimal('0.00')
        assert wallet.status == 'active'
    
    def test_find_by_user_id(self, repo, sample_wallet_data, db_session):
        """Test finding wallet by user ID"""
        created = repo.create(sample_wallet_data)
        found = repo.find_by_user_id(created.user_id)
        
        assert found is not None
        assert found.user_id == created.user_id
    
    def test_find_by_account_number(self, repo, sample_wallet_data, db_session):
        """Test finding wallet by account number"""
        created = repo.create(sample_wallet_data)
        found = repo.find_by_account_number(created.account_number)
        
        assert found is not None
        assert found.account_number == created.account_number
    
    def test_update_balance(self, repo, sample_wallet_data, db_session):
        """Test updating wallet balance"""
        created = repo.create(sample_wallet_data)
        updated = repo.update_balance(created.id, Decimal('1000.00'))
        
        assert updated is not None
        assert updated.balance == Decimal('1000.00')
    
    def test_update_status(self, repo, sample_wallet_data, db_session):
        """Test updating wallet status"""
        created = repo.create(sample_wallet_data)
        updated = repo.update_status(created.id, 'suspended')
        
        assert updated is not None
        assert updated.status == 'suspended'


class TestWalletTransactionRepository:
    """Test suite for WalletTransactionRepository"""
    
    @pytest.fixture
    def repo(self, db_session):
        """Create repository instance"""
        return WalletTransactionRepository()
    
    @pytest.fixture
    def sample_transaction_data(self):
        """Sample transaction data"""
        return {
            'wallet_id': 1,
            'reference': 'TXN-123456',
            'bell_mfb_reference': 'BELL-123456',
            'type': 'credit',
            'amount': Decimal('1000.00'),
            'fee': Decimal('10.00'),
            'stamp_duty': Decimal('5.00'),
            'net_amount': Decimal('985.00'),
            'description': 'Test transaction',
            'status': 'successful'
        }
    
    def test_create_transaction(self, repo, sample_transaction_data, db_session):
        """Test creating a transaction"""
        transaction = repo.create(sample_transaction_data)
        
        assert transaction.id is not None
        assert transaction.reference == 'TXN-123456'
        assert transaction.amount == Decimal('1000.00')
        assert transaction.status == 'successful'
    
    def test_find_by_reference(self, repo, sample_transaction_data, db_session):
        """Test finding transaction by reference (idempotency)"""
        created = repo.create(sample_transaction_data)
        found = repo.find_by_reference(created.reference)
        
        assert found is not None
        assert found.reference == created.reference
    
    def test_find_by_bell_mfb_reference(self, repo, sample_transaction_data, db_session):
        """Test finding transaction by Bell MFB reference"""
        created = repo.create(sample_transaction_data)
        found = repo.find_by_bell_mfb_reference(created.bell_mfb_reference)
        
        assert found is not None
        assert found.bell_mfb_reference == created.bell_mfb_reference
    
    def test_mark_as_successful(self, repo, sample_transaction_data, db_session):
        """Test marking transaction as successful"""
        sample_transaction_data['status'] = 'pending'
        created = repo.create(sample_transaction_data)
        updated = repo.mark_as_successful(created.id)
        
        assert updated is not None
        assert updated.status == 'successful'
        assert updated.completed_at is not None
    
    def test_mark_as_failed(self, repo, sample_transaction_data, db_session):
        """Test marking transaction as failed"""
        sample_transaction_data['status'] = 'pending'
        created = repo.create(sample_transaction_data)
        updated = repo.mark_as_failed(created.id)
        
        assert updated is not None
        assert updated.status == 'failed'
        assert updated.completed_at is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
