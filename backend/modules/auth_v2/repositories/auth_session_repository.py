"""
AuthSession Repository — Data access for login session records.
"""
from datetime import datetime
from typing import List, Optional, Tuple

from modules.auth_v2.extensions import db
from modules.auth_v2.models.auth_session import AuthSession


class AuthSessionRepository:
    """Read/write paths for the auth_sessions table."""

    def create(self, **kwargs) -> AuthSession:
        session = AuthSession(**kwargs)
        db.session.add(session)
        db.session.commit()
        return session

    def find_by_id(self, session_id: int) -> Optional[AuthSession]:
        return AuthSession.query.filter_by(id=session_id).first()

    def list_for_user(
        self, user_id: int, include_revoked: bool = False, limit: int = 50
    ) -> List[AuthSession]:
        q = AuthSession.query.filter_by(user_id=user_id)
        if not include_revoked:
            q = q.filter(AuthSession.revoked_at.is_(None))
        return q.order_by(AuthSession.last_seen_at.desc()).limit(limit).all()

    def revoke(self, session_id: int) -> Optional[AuthSession]:
        session = self.find_by_id(session_id)
        if not session:
            return None
        if session.revoked_at is None:
            session.revoked_at = datetime.utcnow()
            db.session.commit()
        return session

    def revoke_all_others(self, user_id: int, current_session_id: Optional[int]) -> int:
        """Revoke every active session for the user except the current one. Returns count."""
        q = AuthSession.query.filter_by(user_id=user_id, revoked_at=None)
        if current_session_id is not None:
            q = q.filter(AuthSession.id != current_session_id)
        sessions = q.all()
        now = datetime.utcnow()
        for s in sessions:
            s.revoked_at = now
        db.session.commit()
        return len(sessions)

    def touch_last_seen(self, session_id: int) -> None:
        session = self.find_by_id(session_id)
        if session and session.revoked_at is None:
            session.last_seen_at = datetime.utcnow()
            db.session.commit()

    def find_active_by_jti(self, user_id: int, jti: str) -> Optional[AuthSession]:
        return AuthSession.query.filter_by(
            user_id=user_id, jwt_jti=jti, revoked_at=None
        ).first()
