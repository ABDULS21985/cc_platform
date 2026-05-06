"""
/v2/notifications/device-tokens — register/revoke FCM tokens for the
current user. Used by the frontend service-worker bootstrap to plumb push.
"""
import logging

from flask.views import MethodView
from flask_login import current_user, login_required
from flask_smorest import Blueprint, abort
from marshmallow import Schema, fields, validate
from werkzeug.exceptions import HTTPException

from modules.auth_v2.schemas.auth_schema import (
    ApiErrorEnvelopeSchema,
    ApiSuccessEnvelopeSchema,
)
from modules.notifications.services.push_service import PushService

logger = logging.getLogger(__name__)

device_token_blp = Blueprint(
    'device_tokens_v2',
    __name__,
    url_prefix='/api/v2/notifications/device-tokens',
    description='FCM device-token registration for push notifications',
)


class DeviceTokenRegisterSchema(Schema):
    fcm_token = fields.String(required=True, validate=validate.Length(min=20))
    platform = fields.String(
        load_default='web', validate=validate.OneOf(['web', 'ios', 'android'])
    )


class DeviceTokenRevokeSchema(Schema):
    fcm_token = fields.String(required=True, validate=validate.Length(min=20))


def _service() -> PushService:
    return PushService()


@device_token_blp.route('/')
class DeviceTokenCollection(MethodView):
    decorators = [login_required]

    @device_token_blp.arguments(DeviceTokenRegisterSchema)
    @device_token_blp.response(201, ApiSuccessEnvelopeSchema)
    @device_token_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    def post(self, data):
        try:
            token = _service().register_token(
                user_id=current_user.id,
                fcm_token=data['fcm_token'],
                platform=data.get('platform', 'web'),
            )
            return (
                {
                    'success': True,
                    'message': 'Device token registered',
                    'data': {'token': token.to_dict()},
                },
                201,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Token register error: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')

    @device_token_blp.arguments(DeviceTokenRevokeSchema)
    @device_token_blp.response(200, ApiSuccessEnvelopeSchema)
    def delete(self, data):
        try:
            _service().revoke_token(
                user_id=current_user.id, fcm_token=data['fcm_token']
            )
            return (
                {'success': True, 'message': 'Device token revoked', 'data': {}},
                200,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Token revoke error: {exc}", exc_info=True)
            abort(500, message='An unexpected error occurred.')
