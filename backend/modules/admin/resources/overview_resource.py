"""
Admin Overview Resource

Provides platform-wide dashboard aggregates for the Super Admin portal.
"""

from flask.views import MethodView
from flask_smorest import Blueprint
from werkzeug.exceptions import HTTPException
import logging

from modules.admin.schemas.common_schema import AdminSuccessSchema
from modules.admin.services.overview_service import AdminOverviewService
from modules.auth_v2.utils.admin_decorators import platform_admin_required
from modules.core.response_formatter import format_data, format_internal_error

logger = logging.getLogger(__name__)


admin_overview_blp = Blueprint(
    "admin_overview",
    __name__,
    url_prefix="/api/v2/admin",
    description="Super Admin overview endpoints",
)


@admin_overview_blp.route("/overview")
class AdminOverviewResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_overview_blp.response(200, AdminSuccessSchema)
    def get(self, current_user):
        try:
            service = AdminOverviewService()
            data = service.get_overview()
            response, status = format_data(data=data, message="Overview retrieved", status_code=200)
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error building admin overview: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status

