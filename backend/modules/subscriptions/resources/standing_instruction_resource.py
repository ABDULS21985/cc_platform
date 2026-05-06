"""
/v2/standing-instructions endpoints. Same backing service as
/v2/subscriptions; the kind discriminator is enforced by this resource.
"""
import logging

from flask.views import MethodView
from flask_login import current_user, login_required
from flask_smorest import Blueprint, abort
from werkzeug.exceptions import HTTPException

from modules.auth_v2.schemas.auth_schema import ApiErrorEnvelopeSchema
from modules.subscriptions.models.subscription import SubscriptionKind
from modules.subscriptions.schemas.subscription_schema import (
    SubscriptionCreateSchema,
    SubscriptionListQuerySchema,
    SubscriptionListResponseSchema,
    SubscriptionResponseSchema,
    SubscriptionStatusUpdateSchema,
)
from modules.subscriptions.services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)

standing_instruction_blp = Blueprint(
    'standing_instructions_v2',
    __name__,
    url_prefix='/api/v2/standing-instructions',
    description='Scheduled outbound transfers (standing-instruction kind)',
)


def _service() -> SubscriptionService:
    return SubscriptionService()


@standing_instruction_blp.route('/')
class StandingInstructionCollection(MethodView):
    decorators = [login_required]

    @standing_instruction_blp.arguments(SubscriptionListQuerySchema, location='query')
    @standing_instruction_blp.response(200, SubscriptionListResponseSchema)
    @standing_instruction_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    def get(self, query):
        try:
            result, status = _service().list_for_user(
                current_user.id,
                kind=SubscriptionKind.STANDING_INSTRUCTION,
                status=query.get('status'),
                limit=query.get('limit', 100),
                offset=query.get('offset', 0),
            )
            if status >= 400:
                abort(status, message=result.get('error', 'Failed to load standing instructions'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error listing standing instructions: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')

    @standing_instruction_blp.arguments(SubscriptionCreateSchema)
    @standing_instruction_blp.response(201, SubscriptionResponseSchema)
    @standing_instruction_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    def post(self, data):
        data['kind'] = SubscriptionKind.STANDING_INSTRUCTION
        try:
            result, status = _service().create(current_user.id, data)
            if status >= 400:
                abort(status, message=result.get('error', 'Create failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error creating standing instruction: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')


@standing_instruction_blp.route('/<int:sub_id>')
class StandingInstructionItem(MethodView):
    decorators = [login_required]

    @standing_instruction_blp.arguments(SubscriptionStatusUpdateSchema)
    @standing_instruction_blp.response(200, SubscriptionResponseSchema)
    @standing_instruction_blp.alt_response(404, schema=ApiErrorEnvelopeSchema)
    def patch(self, data, sub_id):
        try:
            result, status = _service().update_status(sub_id, current_user.id, data['status'])
            if status >= 400:
                abort(status, message=result.get('error', 'Update failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error updating standing instruction: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')

    @standing_instruction_blp.response(200, SubscriptionResponseSchema)
    @standing_instruction_blp.alt_response(404, schema=ApiErrorEnvelopeSchema)
    def delete(self, sub_id):
        try:
            result, status = _service().delete(sub_id, current_user.id)
            if status >= 400:
                abort(status, message=result.get('error', 'Delete failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error deleting standing instruction: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')
