"""
Notification Service - Send notifications via multiple channels
Follows Single Responsibility Principle and uses HTML email templates
"""
import logging
import os
from typing import Dict, Any, List, Optional
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

    def _is_fcm_enabled(self) -> bool:
        """Sandbox-friendly FCM kill-switch.

        Reads ``Config.FCM_ENABLED`` at call-time (not at construction time)
        so test fixtures can flip it via ``monkeypatch.setattr`` without
        rebuilding the service.
        """
        try:
            from config import Config
            return bool(getattr(Config, 'FCM_ENABLED', True))
        except Exception:  # noqa: BLE001
            # If config is unimportable in some weird test path, default to
            # disabled rather than risk live FCM calls.
            return False

    def _resolve_fcm_tokens(self, user, tokens: Optional[List[str]] = None) -> List[str]:
        """Resolve FCM registration tokens for a user.

        Prefers an explicit ``tokens`` argument (used by tests + service
        callers that already know the device tokens). Falls back to a
        best-effort lookup against the device-token model in the
        notifications module.
        """
        if tokens:
            return [t for t in tokens if isinstance(t, str) and t.strip()]

        # Best-effort lookup of registered device tokens. We import lazily
        # so this module stays importable even if the notifications module
        # is temporarily unavailable in a slim deploy.
        try:
            from modules.notifications.models.device_token import DeviceToken
            rows = (
                DeviceToken.query
                .filter(DeviceToken.user_id == getattr(user, 'id', None))
                .filter(DeviceToken.revoked_at.is_(None))
                .all()
            )
            return [r.fcm_token for r in rows if r.fcm_token]
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                'Failed to resolve FCM tokens for user %s: %s',
                getattr(user, 'id', None),
                exc,
            )
            return []

    def _build_multicast(self, *, tokens: List[str], title: str, body: str, data: Dict[str, str]):
        """Construct a ``messaging.MulticastMessage`` with platform fallbacks."""
        from firebase_admin import messaging  # type: ignore

        # ``data`` payload values must be strings on the FCM side.
        data_payload = {k: str(v) for k, v in (data or {}).items()}
        return messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data_payload,
            tokens=tokens,
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                ),
                fcm_options=messaging.WebpushFCMOptions(
                    link=data_payload.get('link') or '/',
                ),
            ),
        )

    def _dispatch_multicast(self, message) -> Dict[str, Any]:
        """Send a multicast message and normalize the response shape."""
        from firebase_admin import messaging  # type: ignore

        try:
            response = messaging.send_multicast(message)
        except Exception as exc:  # noqa: BLE001
            # Wrap Firebase exceptions so an FCM outage never blows up the
            # verification flow that triggered the push.
            logger.error('FCM send_multicast failed: %s', exc, exc_info=True)
            return {
                'success': False,
                'success_count': 0,
                'failure_count': 0,
                'errors': [str(exc)],
            }

        errors: List[str] = []
        for resp in getattr(response, 'responses', []) or []:
            if not getattr(resp, 'success', False):
                err = getattr(resp, 'exception', None) or getattr(resp, 'error', None)
                if err is not None:
                    errors.append(str(err))

        return {
            'success': response.success_count > 0,
            'success_count': int(response.success_count),
            'failure_count': int(response.failure_count),
            'errors': errors,
        }

    def _send_push(
        self,
        user,
        verification_type: str,
        status: str,
        tokens: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Send a verification push notification via FCM.

        Sandbox short-circuit: returns ``{'success': False, 'error': 'FCM disabled'}``
        when ``Config.FCM_ENABLED`` is false (tests, sandbox).
        """
        if not self._is_fcm_enabled():
            return {'success': False, 'error': 'FCM disabled'}

        if not self.push_enabled:
            return {'success': False, 'skipped': True, 'error': 'Push notifications are disabled'}

        try:
            from firebase.service import FirebaseService

            firebase = FirebaseService.get_instance()
            if not firebase or not getattr(firebase, 'app', None):
                return {'success': False, 'error': 'Firebase not configured'}

            device_tokens = self._resolve_fcm_tokens(user, tokens)
            if not device_tokens:
                return {'success': False, 'error': 'No device tokens registered'}

            verb = 'is verified' if status == 'verified' else 'failed'
            title = f"{verification_type.upper()} verification {verb}"
            body = (
                f"Your {verification_type.upper()} verification has been completed."
                if status == 'verified'
                else f"Your {verification_type.upper()} verification could not be completed."
            )
            data = {
                'category': 'verification',
                'verification_type': verification_type,
                'status': status,
                'link': '/dashboard/settings/verification',
            }

            message = self._build_multicast(
                tokens=device_tokens, title=title, body=body, data=data,
            )
            result = self._dispatch_multicast(message)
            logger.info(
                'verification.push.sent',
                extra={
                    'event': 'verification.push.sent',
                    'user_id': getattr(user, 'id', None),
                    'verification_type': verification_type,
                    'status': status,
                    **{k: v for k, v in result.items() if k != 'errors'},
                },
            )
            return result

        except Exception as exc:  # noqa: BLE001
            logger.error('Verification push failed: %s', exc, exc_info=True)
            return {'success': False, 'error': str(exc)}

    def _send_transaction_push(
        self,
        user,
        transaction,
        tokens: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Send a transaction push notification via FCM."""
        if not self._is_fcm_enabled():
            return {'success': False, 'error': 'FCM disabled'}

        if not self.push_enabled:
            return {'success': False, 'skipped': True, 'error': 'Push notifications are disabled'}

        try:
            from firebase.service import FirebaseService

            firebase = FirebaseService.get_instance()
            if not firebase or not getattr(firebase, 'app', None):
                return {'success': False, 'error': 'Firebase not configured'}

            device_tokens = self._resolve_fcm_tokens(user, tokens)
            if not device_tokens:
                return {'success': False, 'error': 'No device tokens registered'}

            amount = getattr(transaction, 'amount', 0) or 0
            try:
                amount_str = f"{float(amount):,.2f}"
            except Exception:  # noqa: BLE001
                amount_str = str(amount)

            title = f"₦{amount_str} received"
            body = getattr(transaction, 'description', None) or 'Wallet credit'
            data = {
                'category': 'money',
                'transaction_id': str(getattr(transaction, 'id', '')),
                'reference': str(getattr(transaction, 'reference', '') or ''),
                'link': '/dashboard/wallet',
            }

            message = self._build_multicast(
                tokens=device_tokens, title=title, body=body, data=data,
            )
            result = self._dispatch_multicast(message)
            logger.info(
                'transaction.push.sent',
                extra={
                    'event': 'transaction.push.sent',
                    'user_id': getattr(user, 'id', None),
                    'transaction_id': getattr(transaction, 'id', None),
                    **{k: v for k, v in result.items() if k != 'errors'},
                },
            )
            return result

        except Exception as exc:  # noqa: BLE001
            logger.error('Transaction push failed: %s', exc, exc_info=True)
            return {'success': False, 'error': str(exc)}

    def _send_transaction_email(self, user, transaction) -> Dict:
        """Send transaction email notification through the central dispatcher."""
        from modules.notifications.services.email_dispatcher import EmailDispatcher

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

            # Money-category email — respects channel_email + money mute.
            result = EmailDispatcher().dispatch(
                user_id=user.id,
                category='money',
                subject=subject,
                html=html_content,
            )
            if result.get('sent'):
                logger.info(f"Transaction email sent to {user.email}")
            return {'success': bool(result.get('sent')), 'recipient': user.email, 'detail': result}

        except Exception as e:
            logger.error(f"Transaction email send failed: {str(e)}")
            raise

    def _send_sms(self, user, verification_type: str, status: str) -> Dict:
        """Send transactional verification SMS via the Termii-backed SmsService."""
        from modules.notifications.services.sms_service import SmsService

        verb = 'verified successfully' if status == 'verified' else f'failed ({status})'
        message = (
            f"Your {verification_type.upper()} verification has {verb}. "
            f"— CCPay"
        )
        try:
            return SmsService().send_transactional(user, message)
        except Exception as exc:
            logger.error(f"Verification SMS send failed: {exc}", exc_info=True)
            return {'success': False, 'reason': 'send_failed'}
