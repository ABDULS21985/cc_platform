"""
Invite Resource - Flask-Smorest MethodView endpoints
POST /api/v1/communities/<id>/invite - Create invite
POST /api/v1/communities/<id>/invite/revoke - Revoke invite
GET /api/v1/invite/<code> - Get invite info
POST /api/v1/invite/<code>/join - Join via invite
"""
from flask.views import MethodView
from flask_smorest import Blueprint
import logging

from modules.community.schemas.invite_schema import (
    CreateInviteSchema,
    InviteResponseSchema,
    InviteInfoResponseSchema
)
from modules.community.schemas.community_schema import CommunityErrorSchema
from modules.community.services import MembershipService
from modules.community.services.invite_service import InviteService
from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_unauthorized,
)

logger = logging.getLogger(__name__)

invite_blp = Blueprint(
    'invites',
    __name__,
    url_prefix='/api/v2/community',
    description='Community invite endpoints'
)

invite_service = InviteService()
membership_service = MembershipService()


@invite_blp.route('/<int:community_id>/invite')
class InviteResource(MethodView):
    """Create invite endpoint"""
    
    @token_required
    @invite_blp.arguments(CreateInviteSchema)
    @invite_blp.response(200, InviteResponseSchema, description='Invite created')
    @invite_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, data, community_id, current_user=None):
        """
        Create or refresh invite link
        
        Only owner/admin can create invites.
        Set regenerate=true to create a new code, invalidating the old one.
        """
        try:
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only owner/admin can create invite')
            
            invite, error = invite_service.generate_invite(
                community_id,
                expires_in_days=data.get('expires_in_days', 7),
                max_uses=data.get('max_uses'),
                regenerate=data.get('regenerate', False)
            )
            
            if error:
                return format_error(error='invite_error', message=error, status_code=400)
            
            return format_data(
                data={
                    'invite_code': invite['invite_code'],
                    'invite_url': f"/api/v2/community/invite/{invite['invite_code']}",
                    'expires_at': invite['expires_at'],
                    'max_uses': invite['max_uses'],
                    'uses': invite['uses'],
                    'status': invite['status']
                },
                message='Invite created successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error creating invite: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@invite_blp.route('/<int:community_id>/invite/revoke')
class InviteRevokeResource(MethodView):
    """Revoke invite endpoint"""
    
    @token_required
    @invite_blp.response(200, description='Invite revoked')
    @invite_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, community_id, current_user=None):
        """
        Revoke active invite link
        
        Invalidates the current invite code. A new invite must be created.
        """
        try:
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only owner/admin can revoke invite')
            
            success, error = invite_service.revoke_invite(community_id)
            if error:
                return format_error(error='revoke_error', message=error, status_code=400)
            
            return format_data(data={}, message='Invite revoked successfully', status_code=200)
            
        except Exception as e:
            logger.error(f"Error revoking invite: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@invite_blp.route('/invite/<string:invite_code>')
class InviteInfoResource(MethodView):
    """Get invite info endpoint - public access"""
    
    @invite_blp.response(200, InviteInfoResponseSchema, description='Invite info retrieved')
    @invite_blp.alt_response(404, schema=CommunityErrorSchema, description='Invalid invite')
    def get(self, invite_code):
        """
        Get invite information
        
        Returns community info for the invite code. Public endpoint.
        """
        try:
            info, error = invite_service.get_invite_info(invite_code)
            if error:
                return format_error(error='invalid_invite', message=error, status_code=404)
            
            return format_data(data=info, message='Invite info retrieved', status_code=200)
            
        except Exception as e:
            logger.error(f"Error getting invite info: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@invite_blp.route('/invite/<string:invite_code>/join')
class InviteJoinResource(MethodView):
    """Join via invite endpoint"""
    
    @token_required
    @invite_blp.response(200, description='Joined or payment required')
    @invite_blp.alt_response(400, schema=CommunityErrorSchema, description='Cannot join')
    @invite_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, invite_code, current_user=None):
        """
        Join community via invite code
        
        For FREE communities: Joins directly.
        For PAID communities: Returns payment information.
        """
        try:
            result, error = invite_service.join_via_invite(
                invite_code, 
                current_user.id
            )
            
            if error:
                return format_error(error='join_failed', message=error, status_code=400)
            
            return format_data(
                data=result,
                message=result.get('message', 'Processed successfully'),
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error joining via invite: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
