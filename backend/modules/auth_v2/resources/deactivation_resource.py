"""
/v2/auth/deactivate and /v2/auth/reactivate endpoints.
"""
import logging

from flask.views import MethodView
from flask_login import current_user, login_required, logout_user
from flask_smorest import Blueprint, abort
from marshmallow import Schema, fields, validate
from werkzeug.exceptions import HTTPException

from modules.auth_v2.schemas.auth_schema import (
    ApiErrorEnvelopeSchema,
    ApiSuccessEnvelopeSchema,
)
from modules.auth_v2.services.deactivation_service import DeactivationService

logger = logging.getLogger(__name__)

deactivation_blp = Blueprint(
    'auth_deactivation_v2',
    __name__,
    url_prefix='/api/v2/auth',
    description='Account deactivation lifecycle (soft-delete + reactivate)',
)


class DeactivationRequestSchema(Schema):
    password = fields.String(required=True, validate=validate.Length(min=1))
    reason = fields.String(load_default='', validate=validate.Length(max=500))


def _service() -> DeactivationService:
    return DeactivationService()


@deactivation_blp.route('/deactivate/preflight')
class DeactivationPreflight(MethodView):
    decorators = [login_required]

    @deactivation_blp.response(200, ApiSuccessEnvelopeSchema)
    def get(self):
        try:
            result, status = _service().preflight(current_user.id)
            if status >= 400:
                abort(status, message=result.get('error', 'Preflight failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Preflight error: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')


@deactivation_blp.route('/deactivate')
class DeactivateAccount(MethodView):
    decorators = [login_required]

    @deactivation_blp.arguments(DeactivationRequestSchema)
    @deactivation_blp.response(200, ApiSuccessEnvelopeSchema)
    @deactivation_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @deactivation_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    def post(self, data):
        try:
            result, status = _service().request_deactivation(
                user_id=current_user.id,
                password=data['password'],
                reason=data.get('reason', ''),
            )
            if status >= 400:
                abort(
                    status,
                    message=result.get('error', 'Deactivation failed'),
                    blockers=result.get('blockers'),
                )
            # Drop the cookie session immediately.
            try:
                logout_user()
            except Exception:
                pass
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Deactivation error: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')


@deactivation_blp.route('/reactivate')
class ReactivateAccount(MethodView):
    decorators = [login_required]

    @deactivation_blp.response(200, ApiSuccessEnvelopeSchema)
    @deactivation_blp.alt_response(410, schema=ApiErrorEnvelopeSchema)
    def post(self):
        try:
            result, status = _service().reactivate(current_user.id)
            if status >= 400:
                abort(status, message=result.get('error', 'Reactivation failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Reactivation error: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')
