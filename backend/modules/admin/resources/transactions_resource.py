"""
Admin Transactions Resource

Platform-wide transactions ledger for Super Admin portal.
"""

import logging

from flask.views import MethodView
from flask_smorest import Blueprint
from werkzeug.exceptions import HTTPException

from modules.admin.schemas.common_schema import AdminSuccessSchema
from modules.admin.schemas.transactions_schema import AdminTransactionListQuerySchema
from modules.admin.services.transactions_service import AdminTransactionsService
from modules.auth_v2.utils.admin_decorators import platform_admin_required
from modules.core.response_formatter import format_data, format_internal_error, format_not_found, format_paginated

logger = logging.getLogger(__name__)


admin_transactions_blp = Blueprint(
    "admin_transactions",
    __name__,
    url_prefix="/api/v2/admin/transactions",
    description="Super Admin transactions ledger",
)


@admin_transactions_blp.route("/")
class AdminTransactionsCollectionResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_transactions_blp.arguments(AdminTransactionListQuerySchema, location="query")
    @admin_transactions_blp.response(200, AdminSuccessSchema)
    def get(self, args, current_user):
        try:
            service = AdminTransactionsService()
            items, total, page, page_size = service.list_transactions(args=args)
            response, status = format_paginated(
                items=items,
                total=total,
                page=page,
                per_page=page_size,
                message="Transactions retrieved",
                status_code=200,
            )
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error listing transactions: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@admin_transactions_blp.route("/<string:reference>")
class AdminTransactionsItemResource(MethodView):
    decorators = [platform_admin_required(["super_admin"])]

    @admin_transactions_blp.response(200, AdminSuccessSchema)
    def get(self, reference: str, current_user):
        try:
            service = AdminTransactionsService()
            t = service.get_transaction(reference)
            if not t:
                response, status = format_not_found("Transaction")
                return response, status
            response, status = format_data(data={"transaction": t}, message="Transaction retrieved", status_code=200)
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving transaction: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status

