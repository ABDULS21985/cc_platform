"""
Notification Service - Send notifications via multiple channels
Follows Single Responsibility Principle and uses HTML email templates
"""
import logging
import os
from typing import Dict, Any, List
from enum import Enum
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class NotificationChannel(Enum):
    """Notification delivery channels"""
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"


class NotificationService:
    """
    Service for sending notifications across multiple channels

    Responsibilities:
    - Send email notifications using HTML templates
    - Send push notifications via Firebase
    - Send SMS notifications (future)
    - Track notification delivery status

    Single Responsibility: Notification delivery only
    """

    def __init__(self):
        self.template_dir = Path(__file__).parent.parent / 'email_templates'
        self.push_enabled = os.getenv('ENABLE_PUSH_NOTIFICATIONS', 'false').lower() == 'true'

    def _load_template(self, template_name: str) -> str:
        """Load HTML email template from file"""
        template_path = self.template_dir / template_name
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to load template {template_name}: {e}")
            raise

    def _replace_placeholders(self, template: str, data: Dict[str, str]) -> str:
        """Replace {{placeholder}} with actual data in template"""
        result = template
        for key, value in data.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        return result

    def send_verification_complete(
        self,
        user_id: int,
        verification_type: str,
        status: str,
        channels: List[NotificationChannel] = None
    ) -> Dict[str, Any]:
        """
        Send notification when verification process completes

        Args:
            user_id: ID of user to notify
            verification_type: 'bvn' or 'nin'
            status: 'verified' or 'failed'
            channels: List of channels to use (defaults to email + push)

        Returns:
            Dictionary with delivery results per channel
        """
        from modules.auth_v2.models.user import User

        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Email-first for this backend; push is optional and disabled by default.
        channels = channels or [NotificationChannel.EMAIL]

        results = {}

        for channel in channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    result = self._send_email(user, verification_type, status)
                    results['email'] = result

                elif channel == NotificationChannel.PUSH:
                    result = self._send_push(user, verification_type, status)
                    results['push'] = result

                elif channel == NotificationChannel.SMS:
                    result = self._send_sms(user, verification_type, status)
                    results['sms'] = result

            except Exception as e:
                logger.error(f"Notification failed via {channel.value}: {str(e)}")
                results[channel.value] = {'success': False, 'error': str(e)}

        return results

    def send_transaction_notification(
        self,
        user_id: int,
        transaction_id: int,
        channels: List[NotificationChannel] = None
    ) -> Dict[str, Any]:
        """
        Send notification for new transaction

        Args:
            user_id: ID of user to notify
            transaction_id: ID of transaction
            channels: List of channels to use (defaults to push only)

        Returns:
            Dictionary with delivery results per channel
        """
        from modules.auth_v2.models.user import User
        from modules.wallet.repositories.wallet_transaction_repository import WalletTransactionRepository

        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        repo = WalletTransactionRepository()
        transaction = repo.find_by_id(transaction_id)
        if not transaction:
            raise ValueError(f"Transaction {transaction_id} not found")

        channels = channels or [NotificationChannel.PUSH]

        results = {}

        for channel in channels:
            try:
                if channel == NotificationChannel.PUSH:
                    result = self._send_transaction_push(user, transaction)
                    results['push'] = result

                elif channel == NotificationChannel.EMAIL:
                    result = self._send_transaction_email(user, transaction)
                    results['email'] = result

            except Exception as e:
                logger.error(f"Transaction notification failed via {channel.value}: {str(e)}")
                results[channel.value] = {'success': False, 'error': str(e)}

        return results

    def _send_email(self, user, verification_type: str, status: str) -> Dict:
        """Send verification email notification using SMTP EmailService."""
        from modules.auth_v2.services.email_service import EmailService

        try:
            if status == 'verified':
                template = self._load_template('verification_success.html')
                subject = f"{verification_type.upper()} Verification Complete"

                html_content = self._replace_placeholders(template, {
                    'firstname': user.firstname,
                    'verification_type': verification_type,
                    'verification_type_upper': verification_type.upper(),
                    'verified_at': datetime.now().strftime('%B %d, %Y at %I:%M %p')
                })
            else:
                template = self._load_template('verification_failed.html')
                subject = f"{verification_type.upper()} Verification Failed"

                html_content = self._replace_placeholders(template, {
                    'firstname': user.firstname,
                    'verification_type': verification_type,
                    'verification_type_upper': verification_type.upper(),
                    'attempted_at': datetime.now().strftime('%B %d, %Y at %I:%M %p')
                })

            email_service = EmailService()
            sent = email_service._send_email(user.email, subject, html_content)
            if not sent:
                raise RuntimeError('SMTP send returned false')

            logger.info(f"Verification email sent to {user.email}")
            return {'success': True, 'recipient': user.email}

        except Exception as e:
            logger.error(f"Email send failed: {str(e)}")
            raise

    def _send_push(self, user, verification_type: str, status: str) -> Dict:
        """Send verification push notification via Firebase (optional)."""
        if not self.push_enabled:
            return {'success': False, 'skipped': True, 'error': 'Push notifications are disabled'}

        try:
            from firebase.service import FirebaseService

            firebase = FirebaseService.get_instance()
            if not firebase or not getattr(firebase, 'app', None):
                return {'success': False, 'error': 'Firebase not configured'}

            # This project does not currently map user IDs to FCM tokens here.
            return {'success': False, 'error': 'Push delivery is not implemented for user-targeted verification notifications'}

        except Exception as e:
            logger.warning(f"Push notification failed (Firebase may not be configured): {str(e)}")
            return {'success': False, 'error': str(e)}

    def _send_transaction_push(self, user, transaction) -> Dict:
        """Send transaction push notification (optional)."""
        if not self.push_enabled:
            return {'success': False, 'skipped': True, 'error': 'Push notifications are disabled'}

        logger.warning('Push notifications are enabled but user-targeted transaction push is not implemented')
        return {'success': False, 'error': 'Push delivery not implemented'}

    def _send_transaction_email(self, user, transaction) -> Dict:
        """Send transaction email notification using HTML template"""
        from flask_mail import Message
        from extension.extensions import mail

        try:
            template = self._load_template('transaction_credit.html')

            html_content = self._replace_placeholders(template, {
                'firstname': user.firstname,
                'amount': f"{transaction.amount:,.2f}",
                'reference': transaction.reference,
                'source_name': transaction.source_account_name or 'Unknown',
                'source_bank': transaction.source_bank_name or 'Unknown',
                'timestamp': transaction.created_at.strftime('%B %d, %Y at %I:%M %p'),
                'description': transaction.description or 'Wallet credit'
            })

            subject = f"₦{transaction.amount:,.2f} Received in Your Wallet"

            msg = Message(
                subject=subject,
                recipients=[user.email],
                html=html_content
            )

            mail.send(msg)
            logger.info(f"Transaction email sent to {user.email}")
            return {'success': True, 'recipient': user.email}

        except Exception as e:
            logger.error(f"Transaction email send failed: {str(e)}")
            raise

    def _send_sms(self, user, verification_type: str, status: str) -> Dict:
        """
        Send SMS notification

        TODO: Integrate SMS provider (Twilio, Africa's Talking, Termii, etc.)
        """
        logger.info(f"SMS notification would be sent to {user.phone_number if hasattr(user, 'phone_number') else 'N/A'}")
        return {'success': True, 'note': 'SMS not yet implemented'}
