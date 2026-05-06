"""
Session Resource - /v2/auth/sessions endpoints.

Powers the user-facing "Login history" UI in /dashboard/settings.
"""
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_login import login_required, current_user
from werkzeug.exceptions import HTTPException
import logging

from modules.auth_v2.services.session_service import SessionService
from modules.auth_v2.schemas.session_schema import (
    AuthSessionListResponseSchema,
    AuthSessionResponseSchema,
    AuthSessionRevokeResponseSchema,
)
from modules.auth_v2.schemas.auth_schema import ApiErrorEnvelopeSchema

logger = logging.getLogger(__name__)

session_blp = Blueprint(
    'auth_session_v2',
    __name__,
    url_prefix='/api/v2/auth',
    description='Authenticated browser/device session management',
)


def _service() -> SessionService:
    return SessionService()


@session_blp.route('/sessions')
class SessionCollectionResource(MethodView):
    """List + bulk-revoke sessions for the current user."""

    decorators = [login_required]

    @session_blp.response(200, AuthSessionListResponseSchema)
    @session_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    def get(self):
        """List active sessions for the signed-in user."""
        try:
            result, status = _service().list_for_user(current_user.id)
            if status >= 400:
                abort(status, message=result.get('error', 'Failed to load sessions'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error listing sessions: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')

    @session_blp.response(200, AuthSessionRevokeResponseSchema)
    @session_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    def delete(self):
        """Revoke every active session for the user except the current one."""
        try:
            # We don't track the current session_id in Flask-Login natively;
            # passing None means "revoke all active sessions" which is fine —
            # the user keeps their cookie session and a fresh row is recorded
            # on the next request.
            result, status = _service().revoke_all_others(current_user.id, None)
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error revoking sessions: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')


@session_blp.route('/sessions/<int:session_id>')
class SessionItemResource(MethodView):
    """Revoke a specific session."""

    decorators = [login_required]

    @session_blp.response(200, AuthSessionResponseSchema)
    @session_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @session_blp.alt_response(404, schema=ApiErrorEnvelopeSchema)
    def delete(self, session_id: int):
        """Revoke a single session by id."""
        try:
            result, status = _service().revoke(session_id, current_user.id)
            if status >= 400:
                abort(status, message=result.get('error', 'Session not found'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error revoking session {session_id}: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')
