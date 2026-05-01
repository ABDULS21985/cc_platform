"""
Unit Tests for Encryption Service
Tests encryption, decryption, and hashing functionality
"""
import pytest
import os
from cryptography.fernet import Fernet
from modules.verification.services.encryption_service import EncryptionService


class TestEncryptionService:
    """Test suite for EncryptionService"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test encryption key before each test"""
        # Generate test key
        self.test_key = Fernet.generate_key().decode()
        os.environ['ENCRYPTION_KEY'] = self.test_key
        self.service = EncryptionService()
        yield
        # Cleanup
        if 'ENCRYPTION_KEY' in os.environ:
            del os.environ['ENCRYPTION_KEY']
    
    def test_initialization_with_key(self):
        """Test service initializes correctly with valid key"""
        assert self.service.fernet is not None
    
    def test_initialization_without_key(self):
        """Test service raises error when key is missing"""
        del os.environ['ENCRYPTION_KEY']
        with pytest.raises(ValueError, match="ENCRYPTION_KEY not found"):
            EncryptionService()
    
    def test_encrypt_returns_string(self):
        """Test encrypt returns base64 encoded string"""
        plaintext = "22222222221"
        encrypted = self.service.encrypt(plaintext)
        
        assert isinstance(encrypted, str)
        assert len(encrypted) > 0
        assert encrypted != plaintext
    
    def test_decrypt_returns_original(self):
        """Test decrypt returns original plaintext"""
        plaintext = "22222222221"
        encrypted = self.service.encrypt(plaintext)
        decrypted = self.service.decrypt(encrypted)
        
        assert decrypted == plaintext
    
    def test_encrypt_decrypt_cycle(self):
        """Test full encryption/decryption cycle"""
        test_cases = [
            "22222222221",  # BVN
            "12345678901",  # NIN
            "test@example.com",  # Email
            "Some sensitive data 123!"  # Complex string
        ]
        
        for plaintext in test_cases:
            encrypted = self.service.encrypt(plaintext)
            decrypted = self.service.decrypt(encrypted)
            assert decrypted == plaintext
    
    def test_encrypt_produces_different_output_each_time(self):
        """Test encryption is non-deterministic (includes IV)"""
        plaintext = "22222222221"
        encrypted1 = self.service.encrypt(plaintext)
        encrypted2 = self.service.encrypt(plaintext)
        
        # Different ciphertext each time (due to IV)
        assert encrypted1 != encrypted2
        
        # But both decrypt to same plaintext
        assert self.service.decrypt(encrypted1) == plaintext
        assert self.service.decrypt(encrypted2) == plaintext
    
    def test_decrypt_with_invalid_ciphertext(self):
        """Test decrypt raises error with invalid ciphertext"""
        with pytest.raises(Exception):
            self.service.decrypt("invalid_ciphertext")
    
    def test_hash_for_duplicate_check(self):
        """Test hashing produces consistent output"""
        data = "22222222221"
        hash1 = self.service.hash_for_duplicate_check(data)
        hash2 = self.service.hash_for_duplicate_check(data)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 produces 64 hex chars
    
    def test_hash_different_for_different_data(self):
        """Test different data produces different hashes"""
        hash1 = self.service.hash_for_duplicate_check("22222222221")
        hash2 = self.service.hash_for_duplicate_check("11111111110")
        
        assert hash1 != hash2
    
    def test_encrypt_and_hash(self):
        """Test combined encrypt and hash operation"""
        data = "22222222221"
        encrypted, hash_value = self.service.encrypt_and_hash(data)
        
        # Encrypted value should decrypt correctly
        assert self.service.decrypt(encrypted) == data
        
        # Hash should match standalone hash
        assert hash_value == self.service.hash_for_duplicate_check(data)
    
    def test_empty_string_encryption(self):
        """Test encryption/decryption of empty string"""
        plaintext = ""
        encrypted = self.service.encrypt(plaintext)
        decrypted = self.service.decrypt(encrypted)
        
        assert decrypted == plaintext
    
    def test_unicode_encryption(self):
        """Test encryption handles unicode characters"""
        plaintext = "Tëst Dätä 日本語 🎉"
        encrypted = self.service.encrypt(plaintext)
        decrypted = self.service.decrypt(encrypted)
        
        assert decrypted == plaintext


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
