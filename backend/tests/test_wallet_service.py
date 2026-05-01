"""
Unit Tests for WalletService
Tests wallet business logic with mocked dependencies
"""
import pytest
from unittest.mock import Mock, MagicMock
from decimal import Decimal
from datetime import datetime
from modules.wallet.services.wallet_service import WalletService


@pytest.fixture
def mock_wallet_repo():
    """Mock WalletRepository"""
    return Mock()


@pytest.fixture
def mock_transaction_repo():
    """Mock WalletTransactionRepository"""
    return Mock()


@pytest.fixture
def wallet_service(mock_wallet_repo, mock_transaction_repo):
    """Create WalletService with mocked dependencies"""
    with patch('modules.wallet.services.wallet_service.WalletRepository', return_value=mock_wallet_repo), \
         patch('modules.wallet.services.wallet_service.WalletTransactionRepository', return_value=mock_transaction_repo):
        
        service = WalletService()
        # Manually inject mocks for test access
        service.wallet_repo = mock_wallet_repo
        service.transaction_repo = mock_transaction_repo
        return service


class TestGetUserWallet:
    """Test suite for getting user wallet"""
    
    def test_get_wallet_success(self, wallet_service, mock_wallet_repo):
        """Test successfully retrieving user wallet"""
        # Setup mock
        mock_wallet = Mock(
            id=1,
            account_number='1234567890',
            account_name='Test User',
            balance=Decimal('1000.00'),
            currency='NGN',
            status='active'
        )
        mock_wallet.to_dict.return_value = {
            'id': 1,
            'account_number': '1234567890',
            'account_name': 'Test User',
            'balance': '1000.00',
            'currency': 'NGN',
            'status': 'active'
        }
        mock_wallet_repo.find_by_user_id.return_value = mock_wallet
        
        # Execute
        result = wallet_service.get_user_wallet(user_id=1)
        
        # Verify
        assert result['success'] is True
        assert result['wallet']['account_number'] == '1234567890'
        assert result['wallet']['balance'] == '1000.00'
        mock_wallet_repo.find_by_user_id.assert_called_once_with(1)
    
    def test_get_wallet_not_found(self, wallet_service, mock_wallet_repo):
        """Test getting wallet when user has no wallet"""
        # Setup mock
        mock_wallet_repo.find_by_user_id.return_value = None
        
        # Execute
        result = wallet_service.get_user_wallet(user_id=1)
        
        # Verify
        assert result['success'] is False
        assert 'not found' in result['error'].lower()


class TestGetWalletTransactions:
    """Test suite for getting wallet transactions"""
    
    def test_get_transactions_success(
        self,
        wallet_service,
        mock_wallet_repo,
        mock_transaction_repo
    ):
        """Test successfully retrieving transactions"""
        # Setup mocks
        mock_wallet = Mock(id=1)
        mock_wallet_repo.find_by_user_id.return_value = mock_wallet
        
        mock_transactions = [
            Mock(
                id=1,
                reference='TXN-001',
                type='credit',
                amount=Decimal('1000.00'),
                status='successful'
            ),
            Mock(
                id=2,
                reference='TXN-002',
                type='debit',
                amount=Decimal('500.00'),
                status='successful'
            )
        ]
        for txn in mock_transactions:
            txn.to_dict.return_value = {
                'id': txn.id,
                'reference': txn.reference,
                'type': txn.type,
                'amount': str(txn.amount),
                'status': txn.status
            }
        
        mock_transaction_repo.get_wallet_transactions.return_value = mock_transactions
        mock_transaction_repo.count_wallet_transactions.return_value = 2
        
        # Execute
        result = wallet_service.get_wallet_transactions(
            user_id=1,
            limit=10,
            offset=0
        )
        
        # Verify
        assert result['success'] is True
        assert len(result['transactions']) == 2
        assert result['pagination']['total'] == 2
        assert result['pagination']['limit'] == 10
        mock_transaction_repo.get_wallet_transactions.assert_called_once_with(
            wallet_id=1,
            transaction_type=None,
            limit=10,
            offset=0
        )
    
    def test_get_transactions_filtered_by_type(
        self,
        wallet_service,
        mock_wallet_repo,
        mock_transaction_repo
    ):
        """Test retrieving transactions filtered by type"""
        # Setup mocks
        mock_wallet = Mock(id=1)
        mock_wallet_repo.find_by_user_id.return_value = mock_wallet
        
        credit_transaction = Mock(
            id=1,
            type='credit',
            amount=Decimal('1000.00')
        )
        credit_transaction.to_dict.return_value = {
            'id': 1,
            'type': 'credit',
            'amount': '1000.00'
        }
        
        mock_transaction_repo.get_wallet_transactions.return_value = [credit_transaction]
        mock_transaction_repo.count_wallet_transactions.return_value = 1
        
        # Execute
        result = wallet_service.get_wallet_transactions(
            user_id=1,
            transaction_type='credit',
            limit=10,
            offset=0
        )
        
        # Verify
        assert result['success'] is True
        assert len(result['transactions']) == 1
        assert result['transactions'][0]['type'] == 'credit'
        mock_transaction_repo.get_wallet_transactions.assert_called_once_with(
            wallet_id=1,
            transaction_type='credit',
            limit=10,
            offset=0
        )
    
    def test_get_transactions_pagination(
        self,
        wallet_service,
        mock_wallet_repo,
        mock_transaction_repo
    ):
        """Test transaction pagination"""
        # Setup mocks
        mock_wallet = Mock(id=1)
        mock_wallet_repo.find_by_user_id.return_value = mock_wallet
        
        mock_transaction_repo.get_wallet_transactions.return_value = []
        mock_transaction_repo.count_wallet_transactions.return_value = 50
        
        # Execute
        result = wallet_service.get_wallet_transactions(
            user_id=1,
            limit=10,
            offset=20
        )
        
        # Verify
        assert result['success'] is True
        assert result['pagination']['total'] == 50
        assert result['pagination']['limit'] == 10
        assert result['pagination']['offset'] == 20
        assert result['pagination']['has_more'] is True
    
    def test_get_transactions_wallet_not_found(
        self,
        wallet_service,
        mock_wallet_repo
    ):
        """Test getting transactions when wallet doesn't exist"""
        # Setup mock
        mock_wallet_repo.find_by_user_id.return_value = None
        
        # Execute
        result = wallet_service.get_wallet_transactions(user_id=1)
        
        # Verify
        assert result['success'] is False
        assert 'not found' in result['error'].lower()


class TestGetWalletSummary:
    """Test suite for getting wallet summary"""
    
    def test_get_summary_success(
        self,
        wallet_service,
        mock_wallet_repo,
        mock_transaction_repo
    ):
        """Test successfully retrieving wallet summary"""
        # Setup mocks
        mock_wallet = Mock(
            id=1,
            balance=Decimal('5000.00')
        )
        mock_wallet_repo.find_by_user_id.return_value = mock_wallet
        
        mock_transaction_repo.sum_by_type.return_value = {
            'credit': Decimal('10000.00'),
            'debit': Decimal('5000.00')
        }
        mock_transaction_repo.count_wallet_transactions.return_value = 25
        
        # Execute
        result = wallet_service.get_wallet_summary(user_id=1)
        
        # Verify
        assert result['success'] is True
        assert result['summary']['current_balance'] == '5000.00'
        assert result['summary']['total_credited'] == '10000.00'
        assert result['summary']['total_debited'] == '5000.00'
        assert result['summary']['transaction_count'] == 25
    
    def test_get_summary_no_transactions(
        self,
        wallet_service,
        mock_wallet_repo,
        mock_transaction_repo
    ):
        """Test summary when no transactions exist"""
        # Setup mocks
        mock_wallet = Mock(
            id=1,
            balance=Decimal('0.00')
        )
        mock_wallet_repo.find_by_user_id.return_value = mock_wallet
        
        mock_transaction_repo.sum_by_type.return_value = {
            'credit': Decimal('0.00'),
            'debit': Decimal('0.00')
        }
        mock_transaction_repo.count_wallet_transactions.return_value = 0
        
        # Execute
        result = wallet_service.get_wallet_summary(user_id=1)
        
        # Verify
        assert result['success'] is True
        assert result['summary']['current_balance'] == '0.00'
        assert result['summary']['total_credited'] == '0.00'
        assert result['summary']['total_debited'] == '0.00'
        assert result['summary']['transaction_count'] == 0
    
    def test_get_summary_wallet_not_found(
        self,
        wallet_service,
        mock_wallet_repo
    ):
        """Test summary when wallet doesn't exist"""
        # Setup mock
        mock_wallet_repo.find_by_user_id.return_value = None
        
        # Execute
        result = wallet_service.get_wallet_summary(user_id=1)
        
        # Verify
        assert result['success'] is False
        assert 'not found' in result['error'].lower()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
