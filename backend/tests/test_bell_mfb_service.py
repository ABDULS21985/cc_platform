"""
Unit Tests for BellMFBService
Tests Bell MFB API integration with mocked HTTP requests
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import hmac
import hashlib
from modules.wallet.services.bell_mfb_service import BellMFBService


@pytest.fixture
def bell_mfb_service():
    """Create BellMFBService instance with test credentials"""
    with patch.dict('os.environ', {
        'BELL_MFB_BASE_URL': 'https://api-sandbox.bellmfb.com/v1',
        'BELL_MFB_CLIENT_ID': 'test_client_id',
        'BELL_MFB_CLIENT_SECRET': 'test_client_secret'
    }):
        return BellMFBService()


class TestGenerateToken:
    """Test suite for token generation"""
    
    @patch('requests.post')
    def test_generate_token_success(self, mock_post, bell_mfb_service):
        """Test successful token generation"""
        # Setup mock
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'access_token': 'test_access_token',
            'expires_in': 3600
        }
        mock_post.return_value = mock_response
        
        # Execute
        token = bell_mfb_service.generate_token()
        
        # Verify
        assert token == 'test_access_token'
        mock_post.assert_called_once()
        assert 'auth/token' in mock_post.call_args[0][0]
    
    @patch('requests.post')
    def test_generate_token_failure(self, mock_post, bell_mfb_service):
        """Test token generation failure"""
        # Setup mock
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = 'Invalid credentials'
        mock_post.return_value = mock_response
        
        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            bell_mfb_service.generate_token()
        
        assert 'Failed to generate token' in str(exc_info.value)
    
    @patch('requests.post')
    def test_generate_token_caching(self, mock_post, bell_mfb_service):
        """Test token caching mechanism"""
        # Setup mock
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'access_token': 'test_access_token',
            'expires_in': 3600
        }
        mock_post.return_value = mock_response
        
        # Execute - call twice
        token1 = bell_mfb_service.generate_token()
        token2 = bell_mfb_service.generate_token()
        
        # Verify - should only call API once due to caching
        assert token1 == token2
        assert mock_post.call_count == 1


class TestCreateIndividualClient:
    """Test suite for creating individual client"""
    
    @patch.object(BellMFBService, 'generate_token')
    @patch('requests.post')
    def test_create_client_success(
        self,
        mock_post,
        mock_generate_token,
        bell_mfb_service
    ):
        """Test successful client creation"""
        # Setup mocks
        mock_generate_token.return_value = 'test_token'
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            'clientId': 'CLIENT_123',
            'account': {
                'accountNumber': '1234567890',
                'accountName': 'Test User'
            }
        }
        mock_post.return_value = mock_response
        
        # Execute
        result = bell_mfb_service.create_individual_client(
            bvn='22222222221',
            first_name='Test',
            last_name='User',
            date_of_birth='1990-01-15'
        )
        
        # Verify
        assert result['clientId'] == 'CLIENT_123'
        assert result['account']['accountNumber'] == '1234567890'
        mock_post.assert_called_once()
        assert mock_post.call_args[1]['headers']['Authorization'] == 'Bearer test_token'
    
    @patch.object(BellMFBService, 'generate_token')
    @patch('requests.post')
    def test_create_client_api_error(
        self,
        mock_post,
        mock_generate_token,
        bell_mfb_service
    ):
        """Test client creation API error"""
        # Setup mocks
        mock_generate_token.return_value = 'test_token'
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {'error': 'Invalid BVN'}
        mock_post.return_value = mock_response
        
        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            bell_mfb_service.create_individual_client(
                bvn='invalid',
                first_name='Test',
                last_name='User',
                date_of_birth='1990-01-15'
            )
        
        assert 'Failed to create client' in str(exc_info.value)


class TestGetClientInfo:
    """Test suite for getting client information"""
    
    @patch.object(BellMFBService, 'generate_token')
    @patch('requests.get')
    def test_get_client_info_success(
        self,
        mock_get,
        mock_generate_token,
        bell_mfb_service
    ):
        """Test successfully retrieving client info"""
        # Setup mocks
        mock_generate_token.return_value = 'test_token'
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'clientId': 'CLIENT_123',
            'firstName': 'Test',
            'lastName': 'User',
            'account': {
                'accountNumber': '1234567890',
                'balance': 5000.00
            }
        }
        mock_get.return_value = mock_response
        
        # Execute
        result = bell_mfb_service.get_client_info('CLIENT_123')
        
        # Verify
        assert result['clientId'] == 'CLIENT_123'
        assert result['account']['balance'] == 5000.00
        mock_get.assert_called_once()
    
    @patch.object(BellMFBService, 'generate_token')
    @patch('requests.get')
    def test_get_client_info_not_found(
        self,
        mock_get,
        mock_generate_token,
        bell_mfb_service
    ):
        """Test getting info for non-existent client"""
        # Setup mocks
        mock_generate_token.return_value = 'test_token'
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.text = 'Client not found'
        mock_get.return_value = mock_response
        
        # Execute & Verify
        with pytest.raises(Exception) as exc_info:
            bell_mfb_service.get_client_info('INVALID_CLIENT')
        
        assert 'Failed to get client info' in str(exc_info.value)


class TestVerifyWebhookSignature:
    """Test suite for webhook signature verification"""
    
    def test_verify_signature_valid(self, bell_mfb_service):
        """Test valid webhook signature"""
        # Setup
        payload = '{"event": "transaction.completed", "amount": 1000}'
        expected_signature = hmac.new(
            bell_mfb_service.client_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Execute
        is_valid = bell_mfb_service.verify_webhook_signature(payload, expected_signature)
        
        # Verify
        assert is_valid is True
    
    def test_verify_signature_invalid(self, bell_mfb_service):
        """Test invalid webhook signature"""
        # Setup
        payload = '{"event": "transaction.completed", "amount": 1000}'
        invalid_signature = 'invalid_signature_abc123'
        
        # Execute
        is_valid = bell_mfb_service.verify_webhook_signature(payload, invalid_signature)
        
        # Verify
        assert is_valid is False
    
    def test_verify_signature_tampered_payload(self, bell_mfb_service):
        """Test signature verification with tampered payload"""
        # Setup
        original_payload = '{"event": "transaction.completed", "amount": 1000}'
        tampered_payload = '{"event": "transaction.completed", "amount": 5000}'
        
        signature = hmac.new(
            bell_mfb_service.client_secret.encode(),
            original_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Execute
        is_valid = bell_mfb_service.verify_webhook_signature(tampered_payload, signature)
        
        # Verify
        assert is_valid is False
    
    def test_verify_signature_empty_payload(self, bell_mfb_service):
        """Test signature verification with empty payload"""
        # Setup
        payload = ''
        signature = hmac.new(
            bell_mfb_service.client_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Execute
        is_valid = bell_mfb_service.verify_webhook_signature(payload, signature)
        
        # Verify
        assert is_valid is True


class TestGetAccountBalance:
    """Test suite for getting account balance"""
    
    @patch.object(BellMFBService, 'generate_token')
    @patch('requests.get')
    def test_get_balance_success(
        self,
        mock_get,
        mock_generate_token,
        bell_mfb_service
    ):
        """Test successfully retrieving account balance"""
        # Setup mocks
        mock_generate_token.return_value = 'test_token'
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'accountNumber': '1234567890',
            'balance': 5000.00,
            'currency': 'NGN'
        }
        mock_get.return_value = mock_response
        
        # Execute
        result = bell_mfb_service.get_account_balance('1234567890')
        
        # Verify
        assert result['balance'] == 5000.00
        assert result['currency'] == 'NGN'
        mock_get.assert_called_once()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
