"""
Admin Users Resource

Platform-wide user management for Super Admin portal.
"""

import logging

from flask.views import MethodView
from flask_smorest import Blueprint
from werkzeug.exceptions import HTTPException

from modules.admin.schemas.common_schema import AdminSuccessSchema
from modules.admin.schemas.users_schema import AdminUserListQuerySchema, AdminUserUpdateSchema
from modules.admin.services.users_service import AdminUsersService
from modules.auth_v2.utils.admin_decorators import platform_admin_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_not_found,
    format_paginated,
)

logger = logging.getLogger(__name__)


admin_users_blp = Blueprint(
    "admin_users",
    __name__,
    url_prefix="/api/v2/admin/users",
    description="Super Admin user management",
)


@admin_users_blp.route("/")
class AdminUsersCollectionResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_users_blp.arguments(AdminUserListQuerySchema, location="query")
    @admin_users_blp.response(200, AdminSuccessSchema)
    def get(self, args, current_user):
        try:
            service = AdminUsersService()
            items, total, page, page_size = service.list_users(args=args)
            response, status = format_paginated(
                items=items,
                total=total,
                page=page,
                per_page=page_size,
                message="Users retrieved",
                status_code=200,
            )
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error listing users: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@admin_users_blp.route("/<int:user_id>")
class AdminUsersItemResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_users_blp.response(200, AdminSuccessSchema)
    def get(self, user_id: int, current_user):
        service = AdminUsersService()
        user = service.get_user(user_id)
        if not user:
            response, status = format_not_found("User")
            return response, status
        response, status = format_data(data={"user": user}, message="User retrieved", status_code=200)
        return response, status

    @admin_users_blp.arguments(AdminUserUpdateSchema)
    @admin_users_blp.response(200, AdminSuccessSchema)
    def patch(self, updates, user_id: int, current_user):
        try:
            service = AdminUsersService()
            user, error = service.update_user(
                actor_user_id=current_user.id,
                user_id=user_id,
                updates=updates,
            )
            if error:
                if error.lower().startswith("user not found"):
                    response, status = format_not_found("User")
                    return response, status
                response, status = format_error(error="validation_error", message=error, status_code=400)
                return response, status

            response, status = format_data(data={"user": user}, message="User updated", status_code=200)
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating user: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status

