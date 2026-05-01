"""
Admin Communities Resource

Platform-wide community management for Super Admin portal.
"""

import logging

from flask.views import MethodView
from flask_smorest import Blueprint
from werkzeug.exceptions import HTTPException

from modules.admin.schemas.common_schema import AdminSuccessSchema
from modules.admin.schemas.communities_schema import (
    AdminCommunityListQuerySchema,
    AdminCommunityTransactionsQuerySchema,
    AdminCommunityMembersQuerySchema,
    AdminCommunityMemberUpdateSchema,
)
from modules.admin.services.communities_service import AdminCommunitiesService
from modules.auth_v2.utils.admin_decorators import platform_admin_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_not_found,
    format_paginated,
)

logger = logging.getLogger(__name__)


admin_communities_blp = Blueprint(
    "admin_communities",
    __name__,
    url_prefix="/api/v2/admin/communities",
    description="Super Admin community management",
)


@admin_communities_blp.route("/")
class AdminCommunitiesCollectionResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_communities_blp.arguments(AdminCommunityListQuerySchema, location="query")
    @admin_communities_blp.response(200, AdminSuccessSchema)
    def get(self, args, current_user):
        try:
            service = AdminCommunitiesService()
            items, total, page, page_size = service.list_communities(args=args)
            response, status = format_paginated(
                items=items,
                total=total,
                page=page,
                per_page=page_size,
                message="Communities retrieved",
                status_code=200,
            )
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error listing communities: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@admin_communities_blp.route("/<int:community_id>")
class AdminCommunitiesItemResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_communities_blp.response(200, AdminSuccessSchema)
    def get(self, community_id: int, current_user):
        service = AdminCommunitiesService()
        c = service.get_community(community_id)
        if not c:
            response, status = format_not_found("Community")
            return response, status
        response, status = format_data(data={"community": c}, message="Community retrieved", status_code=200)
        return response, status


@admin_communities_blp.route("/<int:community_id>/overview")
class AdminCommunityOverviewResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_communities_blp.response(200, AdminSuccessSchema)
    def get(self, community_id: int, current_user):
        service = AdminCommunitiesService()
        overview = service.get_overview(community_id)
        if not overview:
            response, status = format_not_found("Community")
            return response, status
        response, status = format_data(data=overview, message="Community overview retrieved", status_code=200)
        return response, status


@admin_communities_blp.route("/<int:community_id>/transactions")
class AdminCommunityTransactionsResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_communities_blp.arguments(AdminCommunityTransactionsQuerySchema, location="query")
    @admin_communities_blp.response(200, AdminSuccessSchema)
    def get(self, args, community_id: int, current_user):
        service = AdminCommunitiesService()
        items, total, page, page_size = service.list_transactions(community_id=community_id, args=args)
        response, status = format_paginated(
            items=items,
            total=total,
            page=page,
            per_page=page_size,
            message="Community transactions retrieved",
            status_code=200,
        )
        return response, status


@admin_communities_blp.route("/<int:community_id>/members")
class AdminCommunityMembersResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_communities_blp.arguments(AdminCommunityMembersQuerySchema, location="query")
    @admin_communities_blp.response(200, AdminSuccessSchema)
    def get(self, args, community_id: int, current_user):
        service = AdminCommunitiesService()
        items, total, page, page_size = service.list_members(community_id=community_id, args=args)
        response, status = format_paginated(
            items=items,
            total=total,
            page=page,
            per_page=page_size,
            message="Community members retrieved",
            status_code=200,
        )
        return response, status


@admin_communities_blp.route("/<int:community_id>/members/<int:user_id>")
class AdminCommunityMemberItemResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_communities_blp.arguments(AdminCommunityMemberUpdateSchema)
    @admin_communities_blp.response(200, AdminSuccessSchema)
    def patch(self, updates, community_id: int, user_id: int, current_user):
        try:
            service = AdminCommunitiesService()
            member, error = service.update_member(
                actor_user_id=current_user.id,
                community_id=community_id,
                user_id=user_id,
                updates=updates,
            )
            if error:
                if error.lower().startswith("member not found"):
                    response, status = format_not_found("Member")
                    return response, status
                response, status = format_error(error="validation_error", message=error, status_code=400)
                return response, status

            response, status = format_data(data={"member": member}, message="Member updated", status_code=200)
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating community member: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status

