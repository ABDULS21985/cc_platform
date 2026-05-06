"""
Central per-channel email dispatcher.

Replaces ad-hoc `mail.send(...)` calls scattered through the modules. Honors
the user's `notification_preferences.channel_email` flag and the per-category
mute (`prefs.is_enabled(category)`).

Usage:
    from modules.notifications.services.email_dispatcher import EmailDispatcher
    EmailDispatcher().dispatch(
        user_id=user.id,
        category='money',
        subject='Wallet funded',
        html='<p>You received ₦40,000.</p>',
    )

For raw transactional emails that bypass the preference check (e.g. password
reset OTPs, security alerts), use `dispatch_security` which always sends.
"""
import logging
from typing import Dict, Optional

from flask import current_app
from flask_mail import Message

from modules.auth_v2.repositories.user_repository import UserRepository
from modules.notifications.repositories.notification_repository import NotificationRepository

logger = logging.getLogger(__name__)


class EmailDispatcher:
    def __init__(self):
        self.user_repo = UserRepository()
        self.notif_repo = NotificationRepository()

    # ---------------------------------------------------------------- public

    def dispatch(
        self,
        user_id: int,
        category: str,
        subject: str,
        html: str,
        text: Optional[str] = None,
    ) -> Dict:
        """Send an email if the user has both per-channel + per-category opt-in."""
        user = self.user_repo.find_by_id(user_id)
        if not user or not user.email:
            return {'sent': False, 'reason': 'no_email'}

        prefs = self.notif_repo.get_or_create_preferences(user_id)
        if not getattr(prefs, 'channel_email', True):
            return {'sent': False, 'reason': 'channel_off'}
        if not prefs.is_enabled(category):
            return {'sent': False, 'reason': 'category_muted'}

        return self._send(user.email, subject, html, text)

    def dispatch_security(self, user_id: int, subject: str, html: str, text: Optional[str] = None) -> Dict:
        """Bypass preferences for security/compliance emails."""
        user = self.user_repo.find_by_id(user_id)
        if not user or not user.email:
            return {'sent': False, 'reason': 'no_email'}
        return self._send(user.email, subject, html, text)

    # ---------------------------------------------------------------- internal

    def _send(self, recipient: str, subject: str, html: str, text: Optional[str] = None) -> Dict:
        try:
            from modules.auth_v2.extensions import mail
            msg = Message(subject=subject, recipients=[recipient], html=html, body=text)
            mail.send(msg)
            return {'sent': True, 'recipient': recipient}
        except Exception as exc:
            logger.error(f"Email dispatch failed to {recipient}: {exc}", exc_info=True)
            return {'sent': False, 'reason': 'send_failed', 'error': str(exc)}
