"""User audit log REST resource."""
import logging

from flask.views import MethodView
from flask_smorest import Blueprint

from modules.auth_v2.utils.decorators import token_required
from modules.audit.schemas.audit_schema import (
    AuditErrorSchema,
    AuditListQuerySchema,
    AuditResponseSchema,
)
from modules.audit.services.audit_service import AuditService
from modules.core.response_formatter import format_data, format_internal_error

logger = logging.getLogger(__name__)

audit_blp = Blueprint(
    'audit',
    __name__,
    url_prefix='/api/v2/audit',
    description='User-facing audit log',
)

audit_service = AuditService()


@audit_blp.route('/')
class AuditCollectionResource(MethodView):
    @token_required
    @audit_blp.arguments(AuditListQuerySchema, location='query')
    @audit_blp.response(200, AuditResponseSchema)
    @audit_blp.alt_response(401, schema=AuditErrorSchema)
    def get(self, args, current_user=None):
        try:
            result, status = audit_service.list(
                user_id=current_user.id,
                limit=args.get('limit', 100),
                offset=args.get('offset', 0),
                category=args.get('category'),
                severity=args.get('severity'),
            )
            return format_data(data=result, message='Audit events retrieved', status_code=status)
        except Exception as exc:
            logger.error('Error listing audit events: %s', exc, exc_info=True)
            return format_internal_error(str(exc))
