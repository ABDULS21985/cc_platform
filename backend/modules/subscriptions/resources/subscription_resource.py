"""
/v2/subscriptions endpoints.
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

subscription_blp = Blueprint(
    'subscriptions_v2',
    __name__,
    url_prefix='/api/v2/subscriptions',
    description='Recurring user-scoped outflows (subscriptions kind)',
)


def _service() -> SubscriptionService:
    return SubscriptionService()


@subscription_blp.route('/')
class SubscriptionCollection(MethodView):
    decorators = [login_required]

    @subscription_blp.arguments(SubscriptionListQuerySchema, location='query')
    @subscription_blp.response(200, SubscriptionListResponseSchema)
    @subscription_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    def get(self, query):
        try:
            result, status = _service().list_for_user(
                current_user.id,
                kind=query.get('kind'),
                status=query.get('status'),
                limit=query.get('limit', 100),
                offset=query.get('offset', 0),
            )
            if status >= 400:
                abort(status, message=result.get('error', 'Failed to load subscriptions'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error listing subscriptions: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')

    @subscription_blp.arguments(SubscriptionCreateSchema)
    @subscription_blp.response(201, SubscriptionResponseSchema)
    @subscription_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    def post(self, data):
        # /v2/subscriptions explicitly creates kind=subscription. Standing
        # instructions go through /v2/standing-instructions which forces
        # the kind discriminator.
        if data.get('kind') and data['kind'] != SubscriptionKind.SUBSCRIPTION:
            abort(400, message='Use /v2/standing-instructions for standing instructions')
        data['kind'] = SubscriptionKind.SUBSCRIPTION
        try:
            result, status = _service().create(current_user.id, data)
            if status >= 400:
                abort(status, message=result.get('error', 'Create failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error creating subscription: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')


@subscription_blp.route('/<int:sub_id>')
class SubscriptionItem(MethodView):
    decorators = [login_required]

    @subscription_blp.arguments(SubscriptionStatusUpdateSchema)
    @subscription_blp.response(200, SubscriptionResponseSchema)
    @subscription_blp.alt_response(404, schema=ApiErrorEnvelopeSchema)
    def patch(self, data, sub_id):
        try:
            result, status = _service().update_status(
                sub_id,
                current_user.id,
                data['status'],
                kind=SubscriptionKind.SUBSCRIPTION,
            )
            if status >= 400:
                abort(status, message=result.get('error', 'Update failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error updating subscription: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')

    @subscription_blp.response(200, SubscriptionResponseSchema)
    @subscription_blp.alt_response(404, schema=ApiErrorEnvelopeSchema)
    def delete(self, sub_id):
        try:
            result, status = _service().delete(
                sub_id,
                current_user.id,
                kind=SubscriptionKind.SUBSCRIPTION,
            )
            if status >= 400:
                abort(status, message=result.get('error', 'Delete failed'))
            return result, status
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Error deleting subscription: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')
