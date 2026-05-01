"""
Admin "me" resource

Provides a simple identity endpoint for the admin portal after login.
"""

from flask.views import MethodView
from flask_smorest import Blueprint

from modules.auth_v2.utils.admin_decorators import platform_admin_required
from modules.admin.schemas.common_schema import AdminSuccessSchema
from modules.core.response_formatter import format_data


admin_me_blp = Blueprint(
    "admin_me",
    __name__,
    url_prefix="/api/v2/admin",
    description="Super Admin identity endpoints",
)


@admin_me_blp.route("/me")
class AdminMeResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_me_blp.response(200, AdminSuccessSchema)
    def get(self, current_user):
        response, status = format_data(
            data={"user": current_user.to_dict()},
            message="Admin identity retrieved",
            status_code=200,
        )
        return response, status

