"""
Session Service - Business logic for /v2/auth/sessions

- record_login(): called from login_service after a successful login.
- list_for_user(): drives the user-facing Login history UI.
- revoke() / revoke_all_others(): user signs out a session from settings.
"""
import logging
import re
from typing import Dict, List, Optional, Tuple

from flask import request

from modules.auth_v2.repositories.auth_session_repository import AuthSessionRepository

logger = logging.getLogger(__name__)


def _parse_user_agent(ua: str) -> Tuple[str, str, str]:
    """
    Parse a user-agent string into (device_label, browser, os).

    A simple regex-based parser is sufficient for our display needs;
    we deliberately avoid depending on a UA-parsing lib to keep deps lean.
    """
    if not ua:
        return ('Unknown device', None, None)

    browser = None
    if 'Edg/' in ua:
        browser = 'Edge'
    elif 'Chrome/' in ua and 'Chromium' not in ua:
        browser = 'Chrome'
    elif 'Firefox/' in ua:
        browser = 'Firefox'
    elif 'Safari/' in ua and 'Chrome' not in ua:
        browser = 'Safari'

    os = None
    if 'Mac OS X' in ua or 'macOS' in ua:
        os = 'macOS'
    elif 'Windows' in ua:
        os = 'Windows'
    elif 'iPhone' in ua or 'iOS' in ua:
        os = 'iOS'
    elif 'Android' in ua:
        os = 'Android'
    elif 'Linux' in ua:
        os = 'Linux'

    if 'iPhone' in ua:
        device = 'iPhone'
    elif 'iPad' in ua:
        device = 'iPad'
    elif 'Android' in ua:
        device = 'Android phone'
    elif os in ('macOS', 'Windows', 'Linux'):
        device = f'{os} computer'
    else:
        device = 'Unknown device'

    return (device, browser, os)


def _extract_ip() -> Optional[str]:
    """Pull client IP, honoring X-Forwarded-For if present."""
    if not request:
        return None
    fwd = request.headers.get('X-Forwarded-For')
    if fwd:
        return fwd.split(',')[0].strip()
    return request.remote_addr


class SessionService:
    """Orchestrates AuthSession records."""

    def __init__(self):
        self.repo = AuthSessionRepository()

    def record_login(self, user_id: int, jti: Optional[str] = None) -> Optional[int]:
        """
        Insert a new AuthSession row for a successful login.

        Best-effort: if the call fails for any reason, we log and return None
        so the login flow itself is not blocked.
        """
        try:
            ua = request.headers.get('User-Agent', '') if request else ''
            device, browser, os_label = _parse_user_agent(ua)
            session = self.repo.create(
                user_id=user_id,
                jwt_jti=jti,
                device_label=device,
                browser=browser,
                os=os_label,
                ip=_extract_ip(),
                user_agent_raw=ua[:512] if ua else None,
            )
            return session.id
        except Exception as exc:
            logger.warning(f"Failed to record auth session for user {user_id}: {exc}")
            return None

    def list_for_user(
        self, user_id: int, include_revoked: bool = False
    ) -> Tuple[Dict, int]:
        sessions = self.repo.list_for_user(user_id, include_revoked=include_revoked)
        return (
            {
                'success': True,
                'message': 'Sessions retrieved',
                'data': {
                    'sessions': [s.to_dict() for s in sessions],
                    'total': len(sessions),
                },
            },
            200,
        )

    def revoke(self, session_id: int, user_id: int) -> Tuple[Dict, int]:
        session = self.repo.find_by_id(session_id)
        if not session or session.user_id != user_id:
            return ({'error': 'Session not found', 'code': 'NOT_FOUND'}, 404)
        if session.revoked_at is not None:
            return (
                {
                    'success': True,
                    'message': 'Session already revoked',
                    'data': {'session': session.to_dict()},
                },
                200,
            )
        self.repo.revoke(session_id)
        return (
            {
                'success': True,
                'message': 'Session revoked',
                'data': {'session': self.repo.find_by_id(session_id).to_dict()},
            },
            200,
        )

    def revoke_all_others(
        self, user_id: int, current_session_id: Optional[int]
    ) -> Tuple[Dict, int]:
        revoked = self.repo.revoke_all_others(user_id, current_session_id)
        return (
            {
                'success': True,
                'message': f'{revoked} session(s) revoked',
                'data': {'revoked_count': revoked},
            },
            200,
        )
