"""
Push service — FCM-backed delivery for opted-in users.

Honors `notification_preferences.channel_push` and the per-category mute
(`prefs.is_enabled(category)`). Invalid/expired tokens are pruned (revoked)
on the well-known FCM error responses so the active-tokens list converges.
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional

from modules.auth_v2.extensions import db
from modules.notifications.models.device_token import DeviceToken
from modules.notifications.repositories.notification_repository import (
    NotificationRepository,
)

logger = logging.getLogger(__name__)


class PushService:
    """Orchestrates FCM delivery + device-token CRUD."""

    def __init__(self):
        self.notif_repo = NotificationRepository()

    # ---------------------------------------------------------------- tokens

    def register_token(
        self, user_id: int, fcm_token: str, platform: str = 'web'
    ) -> DeviceToken:
        """Idempotent token registration — re-registers a previously revoked one."""
        existing = (
            DeviceToken.query
            .filter_by(user_id=user_id, fcm_token=fcm_token)
            .first()
        )
        if existing:
            existing.revoked_at = None
            existing.platform = platform or existing.platform
            existing.last_seen_at = datetime.utcnow()
            db.session.commit()
            return existing

        token = DeviceToken(
            user_id=user_id,
            fcm_token=fcm_token,
            platform=platform or 'web',
        )
        db.session.add(token)
        db.session.commit()
        return token

    def revoke_token(self, user_id: int, fcm_token: str) -> bool:
        token = (
            DeviceToken.query
            .filter_by(user_id=user_id, fcm_token=fcm_token, revoked_at=None)
            .first()
        )
        if not token:
            return False
        token.revoked_at = datetime.utcnow()
        db.session.commit()
        return True

    def list_active_for_user(self, user_id: int) -> List[DeviceToken]:
        return (
            DeviceToken.query
            .filter_by(user_id=user_id, revoked_at=None)
            .all()
        )

    # ---------------------------------------------------------------- send

    def send_to_user(
        self,
        user_id: int,
        category: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        force: bool = False,
    ) -> Dict:
        """Fan out a push to every active device the user owns. Best-effort."""
        prefs = self.notif_repo.get_or_create_preferences(user_id)
        if not force and not getattr(prefs, 'channel_push', False):
            return {'sent': False, 'reason': 'channel_off'}
        if not force and not prefs.is_enabled(category):
            return {'sent': False, 'reason': 'category_muted'}

        tokens = self.list_active_for_user(user_id)
        if not tokens:
            return {'sent': False, 'reason': 'no_tokens'}

        # Lazy import — Firebase admin SDK is initialized in firebase/service.py
        # but its messaging path is optional. If it can't be loaded, treat as
        # sandbox: log & return success-with-note.
        try:
            from firebase_admin import messaging
        except Exception:
            logger.info(f"[fcm sandbox] push to user={user_id}: {title}")
            return {'sent': True, 'sandbox': True}

        results: List[Dict] = []
        invalid_tokens: List[DeviceToken] = []
        for tok in tokens:
            try:
                message = messaging.Message(
                    token=tok.fcm_token,
                    notification=messaging.Notification(title=title, body=body),
                    data={k: str(v) for k, v in (data or {}).items()},
                )
                resp = messaging.send(message)
                results.append({'token_id': tok.id, 'message_id': resp})
            except Exception as exc:
                err = str(exc).lower()
                results.append({'token_id': tok.id, 'error': str(exc)})
                # Prune obviously dead tokens.
                if 'unregistered' in err or 'invalid' in err or 'not-registered' in err:
                    invalid_tokens.append(tok)

        for tok in invalid_tokens:
            tok.revoked_at = datetime.utcnow()
        if invalid_tokens:
            db.session.commit()

        return {
            'sent': True,
            'count': len(tokens),
            'pruned': len(invalid_tokens),
            'results': results,
        }
