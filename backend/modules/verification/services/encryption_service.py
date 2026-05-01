"""
Encryption Service - Handles sensitive data encryption/decryption
Follows Single Responsibility Principle - ONLY handles encryption
Uses Fernet (symmetric encryption) for BVN/NIN data
"""
import os
import hashlib
from typing import Tuple
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Service for encrypting and decrypting sensitive data
    Uses Fernet symmetric encryption (AES-128)
    
    Single Responsibility: Encryption/Decryption only
    """
    
    def __init__(self):
        """
        Initialize encryption service with key from environment
        
        Raises:
            ValueError: If ENCRYPTION_KEY not set in environment
        """
        encryption_key = os.getenv('ENCRYPTION_KEY')
        
        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY not found in environment variables. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        
        self.fernet = Fernet(encryption_key.encode())
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string
        
        Args:
            plaintext: String to encrypt (e.g., BVN number)
            
        Returns:
            Base64 encoded encrypted string
            
        Example:
            >>> service = EncryptionService()
            >>> encrypted = service.encrypt("22222222221")
            >>> print(encrypted)
            'gAAAAABh...'
        """
        try:
            encrypted_bytes = self.fernet.encrypt(plaintext.encode())
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt ciphertext string
        
        Args:
            ciphertext: Encrypted string to decrypt
            
        Returns:
            Original plaintext string
            
        Raises:
            cryptography.fernet.InvalidToken: If decryption fails
            
        Example:
            >>> service = EncryptionService()
            >>> decrypted = service.decrypt("gAAAAABh...")
            >>> print(decrypted)
            '22222222221'
        """
        try:
            decrypted_bytes = self.fernet.decrypt(ciphertext.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise
    
    def hash_for_duplicate_check(self, data: str) -> str:
        """
        Create SHA-256 hash of data for duplicate detection
        
        This allows us to check if BVN/NIN already exists 
        without decrypting all records.
        
        Args:
            data: String to hash (e.g., BVN number)
            
        Returns:
            Hex string of SHA-256 hash
            
        Example:
            >>> service = EncryptionService()
            >>> hash1 = service.hash_for_duplicate_check("22222222221")
            >>> hash2 = service.hash_for_duplicate_check("22222222221")
            >>> hash1 == hash2
            True
        """
        return hashlib.sha256(data.encode()).hexdigest()
    
    def encrypt_and_hash(self, data: str) -> Tuple[str, str]:
        """
        Encrypt data and generate hash for duplicate checking
        
        Convenience method that combines encrypt() and hash_for_duplicate_check()
        
        Args:
            data: String to encrypt and hash
            
        Returns:
            Tuple of (encrypted_data, hash_for_duplicates)
            
        Example:
            >>> service = EncryptionService()
            >>> encrypted, hash_val = service.encrypt_and_hash("22222222221")
            >>> print(f"Encrypted: {encrypted}")
            >>> print(f"Hash: {hash_val}")
        """
        encrypted = self.encrypt(data)
        hash_value = self.hash_for_duplicate_check(data)
        return encrypted, hash_value


# Generate encryption key utility
def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key
    
    Run this once and add the key to your .env file:
    
    ```bash
    python -c "from modules.verification.services.encryption_service import generate_encryption_key; print(generate_encryption_key())"
    ```
    
    Returns:
        Base64 encoded Fernet key
    """
    return Fernet.generate_key().decode()


if __name__ == '__main__':
    # Test the encryption service
    print("=" * 60)
    print("Encryption Service Test")
    print("=" * 60)
    
    # Generate key for testing
    test_key = Fernet.generate_key()
    os.environ['ENCRYPTION_KEY'] = test_key.decode()
    
    service = EncryptionService()
    
    # Test encryption/decryption
    test_bvn = "22222222221"
    print(f"\nOriginal BVN: {test_bvn}")
    
    encrypted, hash_val = service.encrypt_and_hash(test_bvn)
    print(f"Encrypted: {encrypted}")
    print(f"Hash: {hash_val}")
    
    decrypted = service.decrypt(encrypted)
    print(f"Decrypted: {decrypted}")
    
    assert test_bvn == decrypted, "Decryption failed!"
    print("\n✅ Encryption/Decryption works correctly!")
    
    # Test duplicate detection
    same_bvn_hash = service.hash_for_duplicate_check(test_bvn)
    different_bvn_hash = service.hash_for_duplicate_check("11111111110")
    
    print(f"\nSame BVN hash matches: {hash_val == same_bvn_hash}")
    print(f"Different BVN hash matches: {hash_val == different_bvn_hash}")
    
    print("\n" + "=" * 60)
    print("Generate a new encryption key for production:")
    print(generate_encryption_key())
    print("=" * 60)
