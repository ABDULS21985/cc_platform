"""
Email Service - Handles sending emails with templates

Single Responsibility: Email operations only
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Handles all email sending operations"""
    
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@ccpay.com')
        self.from_name = os.getenv('FROM_NAME', 'CCPay')
        
        # Template directory
        self.template_dir = Path(__file__).parent.parent / 'email_templates'
    
    def _load_template(self, template_name: str) -> str:
        """Load HTML email template"""
        template_path = self.template_dir / template_name
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to load template {template_name}: {e}")
            raise
    
    def _replace_placeholders(self, template: str, data: Dict[str, str]) -> str:
        """Replace {{placeholder}} with actual data"""
        result = template
        for key, value in data.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        return result
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send HTML email via SMTP"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Send via SMTP (use SSL if port 465, TLS if port 587)
            if self.smtp_port == 465:
                # Use SMTP_SSL for port 465
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=30) as server:
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            else:
                # Use SMTP with STARTTLS for port 587
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_signup_otp(self, to_email: str, firstname: str, lastname: str, otp: str) -> bool:
        """
        Send signup verification OTP email
        
        Args:
            to_email: Recipient email
            firstname: User's first name
            lastname: User's last name
            otp: 6-digit OTP code
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Load and populate template
            template = self._load_template('signup_otp.html')
            html_content = self._replace_placeholders(template, {
                'firstname': firstname,
                'lastname': lastname,
                'otp': otp
            })
            
            # Send email
            subject = f"Verify Your Email - OTP: {otp}"
            return self._send_email(to_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send signup OTP email: {e}")
            return False
    
    def send_welcome_email(self, to_email: str, firstname: str, lastname: str, created_at: str) -> bool:
        """
        Send welcome email after successful verification
        
        Args:
            to_email: Recipient email
            firstname: User's first name
            lastname: User's last name
            created_at: Account creation timestamp
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Load and populate template
            template = self._load_template('welcome.html')
            html_content = self._replace_placeholders(template, {
                'firstname': firstname,
                'lastname': lastname,
                'email': to_email,
                'created_at': created_at
            })
            
            # Send email
            subject = f"Welcome to CCPay, {firstname}! 🎉"
            return self._send_email(to_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
            return False
    
    def send_login_otp(
        self, 
        to_email: str, 
        firstname: str, 
        otp: str,
        timestamp: str,
        location: str = "Unknown",
        device: str = "Unknown"
    ) -> bool:
        """
        Send login verification OTP email
        
        Args:
            to_email: Recipient email
            firstname: User's first name
            otp: 6-digit OTP code
            timestamp: Login attempt timestamp
            location: Approximate location (city, country)
            device: Device info (browser, OS)
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Load and populate template
            template = self._load_template('login_otp.html')
            html_content = self._replace_placeholders(template, {
                'firstname': firstname,
                'email': to_email,
                'otp': otp,
                'timestamp': timestamp,
                'location': location,
                'device': device
            })
            
            # Send email
            subject = f"Login Verification - OTP: {otp}"
            return self._send_email(to_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send login OTP email: {e}")
            return False

    def send_password_reset_otp(
        self,
        *,
        to_email: str,
        firstname: str,
        otp: str,
        expiry_minutes: int = 10,
    ) -> bool:
        """Send password reset OTP email."""
        try:
            template = self._load_template('password_reset_otp.html')
            html_content = self._replace_placeholders(template, {
                'firstname': firstname,
                'otp': otp,
                'expiry_minutes': str(expiry_minutes),
            })
            subject = "Reset your CCPay password"
            return self._send_email(to_email, subject, html_content)
        except Exception as e:
            logger.error(f"Failed to send password reset OTP email: {e}")
            return False
