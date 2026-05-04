"""Discovery REST resource — trending topics."""
import logging

from flask.views import MethodView
from flask_smorest import Blueprint

from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import format_data, format_internal_error
from modules.discovery.schemas.trending_schema import (
    TrendingListQuerySchema,
    TrendingResponseSchema,
)
from modules.discovery.services.trending_service import TrendingService

logger = logging.getLogger(__name__)

discovery_blp = Blueprint(
    'discovery',
    __name__,
    url_prefix='/api/v2/discovery',
    description='Discovery endpoints (trending topics, etc.)',
)

trending_service = TrendingService()


@discovery_blp.route('/trending')
class TrendingResource(MethodView):
    @token_required
    @discovery_blp.arguments(TrendingListQuerySchema, location='query')
    @discovery_blp.response(200, TrendingResponseSchema)
    def get(self, args, current_user=None):
        try:
            result, status = trending_service.list_for_user(
                user_id=current_user.id, limit=args.get('limit', 5)
            )
            return format_data(data=result, message='Trending topics retrieved', status_code=status)
        except Exception as exc:
            logger.error('Error listing trending topics: %s', exc, exc_info=True)
            return format_internal_error(str(exc))
