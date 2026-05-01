"""
OTP Service - Handles OTP generation, storage, and verification

Single Responsibility: OTP operations only
"""

import random
import string
from typing import Optional, Tuple
from datetime import datetime, timedelta
import logging
import os
import json
import redis

logger = logging.getLogger(__name__)


class OTPService:
    """Handles OTP generation and verification"""
    
    # Redis connection for production-ready OTP storage
    _redis_client = None
    
    @classmethod
    def _get_redis(cls):
        """Get or create Redis connection"""
        if cls._redis_client is None:
            redis_url = os.getenv('REDIS_URL')
            if redis_url:
                try:
                    cls._redis_client = redis.from_url(redis_url, decode_responses=True)
                    # Test connection
                    cls._redis_client.ping()
                    logger.info("Redis connection established")
                except Exception as e:
                    logger.error(f"Redis connection failed: {e}")
                    cls._redis_client = None
        return cls._redis_client
    
    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """
        Generate random numeric OTP
        
        Args:
            length: OTP length (default: 6)
            
        Returns:
            str: Generated OTP
        """
        return ''.join(random.choices(string.digits, k=length))
    
    @classmethod
    def create_otp(cls, email: str, otp_type: str = "signup", expiry_minutes: int = 10) -> str:
        """
        Create and store OTP for email
        
        Args:
            email: User's email
            otp_type: Type of OTP (signup, login, reset)
            expiry_minutes: OTP validity in minutes
            
        Returns:
            str: Generated OTP
        """
        otp = cls.generate_otp()
        email = email.lower()
        
        # Store OTP in Redis with TTL
        redis_client = cls._get_redis()
        if redis_client:
            key = f"otp:{otp_type}:{email}"
            otp_data = {
                "otp": otp,
                "type": otp_type,
                "attempts": 0,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Set with expiry (TTL in seconds)
            redis_client.setex(key, expiry_minutes * 60, json.dumps(otp_data))
            logger.info(f"OTP created for {email} (type: {otp_type}, expires in {expiry_minutes}min)")
        else:
            logger.error(f"Redis unavailable - OTP creation failed for {email}")
            raise Exception("OTP service temporarily unavailable")
        
        return otp
    
    @classmethod
    def verify_otp(cls, email: str, otp: str, otp_type: str = "signup") -> Tuple[bool, str]:
        """
        Verify OTP for email
        
        Args:
            email: User's email
            otp: OTP to verify
            otp_type: Expected OTP type
            
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        email = email.lower()
        redis_client = cls._get_redis()
        
        if not redis_client:
            return False, "OTP service temporarily unavailable"
        
        key = f"otp:{otp_type}:{email}"
        
        # Check if OTP exists
        otp_data_str = redis_client.get(key)
        if not otp_data_str:
            return False, "No OTP found for this email"
        
        otp_data = json.loads(otp_data_str)
        
        # Check OTP type
        if otp_data["type"] != otp_type:
            return False, f"Invalid OTP type (expected {otp_type})"
        
        # Check attempts (max 3)
        if otp_data["attempts"] >= 3:
            redis_client.delete(key)
            return False, "Too many failed attempts"
        
        # Verify OTP
        if otp_data["otp"] != otp:
            otp_data["attempts"] += 1
            # Update attempts in Redis (preserve TTL)
            ttl = redis_client.ttl(key)
            if ttl > 0:
                redis_client.setex(key, ttl, json.dumps(otp_data))
            return False, f"Invalid OTP ({3 - otp_data['attempts']} attempts remaining)"
        
        # Success - remove OTP
        redis_client.delete(key)
        logger.info(f"OTP verified successfully for {email}")
        return True, "OTP verified"
    
    @classmethod
    def resend_otp(cls, email: str, otp_type: str = "signup") -> Optional[str]:
        """
        Resend OTP (generate new one)
        
        Args:
            email: User's email
            otp_type: Type of OTP
            
        Returns:
            Optional[str]: New OTP or None if too soon
        """
        email = email.lower()
        redis_client = cls._get_redis()
        
        if not redis_client:
            raise Exception("OTP service temporarily unavailable")
        
        key = f"otp:{otp_type}:{email}"
        
        # Check if OTP exists and is still fresh (wait at least 1 minute)
        otp_data_str = redis_client.get(key)
        if otp_data_str:
            otp_data = json.loads(otp_data_str)
            created_at = datetime.fromisoformat(otp_data["created_at"])
            time_since_created = datetime.utcnow() - created_at
            
            if time_since_created < timedelta(minutes=1):
                logger.warning(f"OTP resend too soon for {email}")
                return None
            
            # Delete old OTP
            redis_client.delete(key)
        
        # Create new OTP
        return cls.create_otp(email, otp_type)
    
    @classmethod
    def get_remaining_time(cls, email: str) -> Optional[int]:
        """
        Get remaining validity time for OTP in seconds
        
        Args:
            email: User's email
            
        Returns:
            Optional[int]: Remaining seconds or None
        """
        email = email.lower()
        redis_client = cls._get_redis()
        
        if not redis_client:
            return None
        
        key = f"otp:*:{email}"  # Match any OTP type
        # Find the key (check both signup and login)
        for otp_type in ["signup", "login"]:
            key = f"otp:{otp_type}:{email}"
            ttl = redis_client.ttl(key)
            if ttl > 0:
                return ttl
        
        return None
