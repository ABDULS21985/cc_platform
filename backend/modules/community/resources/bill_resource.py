"""
Bill Resource - Flask-Smorest MethodView endpoints
GET/POST /api/v1/communities/<id>/bills - List/Create bills
GET/PUT/DELETE /api/v1/communities/<id>/bills/<bill_id> - Single bill operations
"""
from flask.views import MethodView
from flask_smorest import Blueprint
import logging

from modules.community.schemas.bill_schema import (
    CreateBillSchema,
    UpdateBillSchema,
    BillResponseSchema,
    BillListResponseSchema,
    BillListQuerySchema,
)
from modules.community.schemas.community_schema import CommunityErrorSchema
from modules.community.services import BillService, MembershipService
from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_not_found,
    format_unauthorized,
)

logger = logging.getLogger(__name__)

bill_blp = Blueprint(
    'bills',
    __name__,
    url_prefix='/api/v2/community',
    description='Community bill management endpoints'
)

bill_service = BillService()
membership_service = MembershipService()


@bill_blp.route('/<int:community_id>/bills')
class BillListResource(MethodView):
    """Bill list and creation endpoints"""
    
    @bill_blp.arguments(BillListQuerySchema, location='query')
    @bill_blp.response(200, BillListResponseSchema, description='Bills retrieved')
    @bill_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    def get(self, args, community_id):
        """
        List community bills

        Query Parameters:
            status: Filter by bill status (draft/active/closed/settled)
            limit: Page size (default 50)
            offset: Pagination offset (default 0)
        """
        try:
            limit = args.get('limit', 50)
            offset = args.get('offset', 0)
            bills, total = bill_service.get_community_bills(
                community_id, args=args, limit=limit, offset=offset
            )

            return format_data(
                data={
                    'bills': [bill_service.serialize_bill_data(bill) for bill in bills],
                    'pagination': {
                        'total': total,
                        'limit': limit,
                        'offset': offset,
                    }
                },
                message='Bills retrieved successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error getting bills: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
    
    @token_required
    @bill_blp.arguments(CreateBillSchema)
    @bill_blp.response(201, BillResponseSchema, description='Bill created')
    @bill_blp.alt_response(400, schema=CommunityErrorSchema, description='Validation error')
    @bill_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, data, community_id, current_user=None):
        """
        Create new bill
        
        Only owner/admin can create bills.
        """
        try:
            # Check authorization
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only admins/owners can create bills')
            
            # Convert Decimal to float for service
            bill_data = dict(data)
            for key in ['amount', 'min_amount']:
                if key in bill_data and bill_data[key] is not None:
                    bill_data[key] = float(bill_data[key])
            
            bill, error = bill_service.create_bill(community_id, current_user.id, bill_data)
            if error:
                return format_error(error='creation_failed', message=error, status_code=400)
            
            return format_data(
                data=bill.to_dict(),
                message='Bill created successfully',
                status_code=201,
            )
            
        except Exception as e:
            logger.error(f"Error creating bill: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@bill_blp.route('/<int:community_id>/bills/<int:bill_id>')
class BillResource(MethodView):
    """Single bill operations"""
    
    @bill_blp.response(200, BillResponseSchema, description='Bill retrieved')
    @bill_blp.alt_response(404, schema=CommunityErrorSchema, description='Bill not found')
    def get(self, community_id, bill_id):
        """
        Get bill details
        
        Returns detailed information about a specific bill.
        """
        try:
            bill, error = bill_service.get_bill(bill_id)
            if error:
                return format_error(error='not_found', message=error, status_code=404)
            
            # Verify bill belongs to community
            if bill.community_id != community_id:
                return format_error(
                    error='not_found',
                    message='Bill not found in this community',
                    status_code=404,
                )
            
            return format_data(
                data=bill_service.serialize_bill_data(bill, include_detail=True),
                message='Bill retrieved successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error getting bill: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
    
    @token_required
    @bill_blp.arguments(UpdateBillSchema)
    @bill_blp.response(200, BillResponseSchema, description='Bill updated')
    @bill_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @bill_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def put(self, data, community_id, bill_id, current_user=None):
        """
        Update bill
        
        Only owner/admin can update bills.
        """
        try:
            # Check authorization
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only admins/owners can update bills')
            
            # Convert Decimal to float and filter None values
            update_data = {}
            for k, v in data.items():
                if v is not None:
                    update_data[k] = float(v) if hasattr(v, 'as_tuple') else v
            
            bill, error = bill_service.update_bill(bill_id, update_data)
            if error:
                return format_error(error='update_failed', message=error, status_code=400)
            
            return format_data(
                data=bill_service.serialize_bill_data(bill),
                message='Bill updated successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error updating bill: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
    
    @token_required
    @bill_blp.response(204, description='Bill deleted')
    @bill_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @bill_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def delete(self, community_id, bill_id, current_user=None):
        """
        Delete/cancel bill
        
        Only owner/admin can delete bills.
        """
        try:
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only admins/owners can delete bills')
            
            success, error = bill_service.cancel_bill(bill_id)
            if error:
                return format_error(error='deletion_failed', message=error, status_code=400)
            
            return '', 204
            
        except Exception as e:
            logger.error(f"Error deleting bill: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@bill_blp.route('/<int:community_id>/bills/<int:bill_id>/progress')
class BillProgressResource(MethodView):
    """Bill progress endpoint"""

    @bill_blp.response(200, description='Bill progress retrieved')
    @bill_blp.alt_response(404, schema=CommunityErrorSchema, description='Bill not found')
    def get(self, community_id, bill_id):
        try:
            progress = bill_service.get_bill_progress(bill_id)
            # Service returns a (response, status) tuple from format_not_found
            # when the bill is missing — propagate it as-is.
            if isinstance(progress, tuple):
                return progress
            if not progress or progress.get('bill_id') != bill_id:
                return format_not_found('Bill')
            return format_data(
                data=progress,
                message='Bill progress retrieved successfully',
                status_code=200,
            )
        except Exception as e:
            logger.error(f"Error getting bill progress: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
