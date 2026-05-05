"""
Member Resource - Flask-Smorest MethodView endpoints
GET /api/v1/communities/<id>/members - List members
POST /api/v1/communities/<id>/join - Join community
POST /api/v1/communities/<id>/leave - Leave community
PUT /api/v1/communities/<id>/members/<user_id>/role - Update member role
"""
from flask.views import MethodView
from flask_smorest import Blueprint
import logging

from modules.community.schemas.member_schema import (
    UpdateMemberRoleSchema,
    MemberResponseSchema,
    MemberListResponseSchema,
    MemberListQuerySchema,
)
from modules.community.schemas.community_schema import CommunityErrorSchema
from modules.community.services import MembershipService, CommunityService
from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_forbidden,
    format_internal_error,
    format_not_found,
    format_unauthorized,
)

logger = logging.getLogger(__name__)

member_blp = Blueprint(
    'members',
    __name__,
    url_prefix='/api/v2/community',
    description='Community membership endpoints'
)

membership_service = MembershipService()
community_service = CommunityService()


@member_blp.route('/<int:community_id>/members')
class CommunityMembersResource(MethodView):
    """List community members"""
    
    @member_blp.arguments(MemberListQuerySchema, location='query')
    @member_blp.response(200, MemberListResponseSchema, description='Members retrieved')
    @member_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    def get(self, args, community_id):
        """
        List community members

        Query Parameters:
            status: Membership status filter (default: active)
            role: Role filter (owner/admin/member)
            limit: Page size (default 50)
            offset: Pagination offset (default 0)
        """
        try:
            community, error = community_service.get_community(community_id)
            if error:
                return format_not_found('Community')

            limit = args.get('limit', 50)
            offset = args.get('offset', 0)
            members, total = membership_service.get_filtered_members(
                community_id=community_id,
                args=args,
                limit=limit,
                offset=offset,
            )

            # Batch each member's post count in this community in one
            # GROUP BY rather than N+1 individual count queries.
            user_ids = [m.user_id for m in members if m.user_id]
            posts_by_user: dict[int, int] = {}
            if user_ids:
                from sqlalchemy import func as _sa_func
                from modules.auth_v2.extensions import db as _db
                from modules.community.models.community_post import CommunityPost
                rows = (
                    _db.session.query(
                        CommunityPost.author_id,
                        _sa_func.count(CommunityPost.id),
                    )
                    .filter(
                        CommunityPost.community_id == community_id,
                        CommunityPost.author_id.in_(user_ids),
                        CommunityPost.status == 'active',
                    )
                    .group_by(CommunityPost.author_id)
                    .all()
                )
                posts_by_user = {int(uid): int(cnt) for uid, cnt in rows}

            payload = []
            for m in members:
                row = m.to_dict(include_user=True)
                if row.get('user') and m.user_id is not None:
                    row['user']['posts_count'] = posts_by_user.get(int(m.user_id), 0)
                payload.append(row)

            return format_data(
                data={
                    'members': payload,
                    'pagination': {
                        'total': total,
                        'limit': limit,
                        'offset': offset,
                    }
                },
                message='Members retrieved successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error getting members: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@member_blp.route('/<int:community_id>/join')
class JoinCommunityResource(MethodView):
    """Join community endpoint"""
    
    @token_required
    @member_blp.response(200, description='Joined successfully')
    @member_blp.alt_response(400, schema=CommunityErrorSchema, description='Cannot join')
    @member_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, community_id, current_user=None):
        """
        Join community (FREE communities only)
        
        For PAID communities, use the membership payment flow:
        1. POST /invite/{code}/join - Get payment details
        2. POST /communities/{id}/membership/payment/initiate - Get virtual account
        3. Make payment to virtual account
        4. POST /communities/{id}/membership/payment/verify - Activate membership
        """
        try:
            community, error = community_service.get_community(community_id)
            if error:
                return format_not_found('Community')
            
            # Block direct join for paid communities
            if community.member_cost > 0:
                return format_error(
                    error='payment_required',
                    message='This is a paid community. Use the membership payment flow.',
                    status_code=400,
                )
            
            # Only allow free communities to join directly
            member, error = membership_service.add_member(community_id, current_user.id)
            if error:
                return format_error(error='join_failed', message=error, status_code=400)
            
            return format_data(
                data={'message': 'Joined community successfully'},
                message='Joined community successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error joining community: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@member_blp.route('/<int:community_id>/leave')
class LeaveCommunityResource(MethodView):
    """Leave community endpoint"""
    
    @token_required
    @member_blp.response(200, description='Left successfully')
    @member_blp.alt_response(400, schema=CommunityErrorSchema, description='Cannot leave')
    @member_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, community_id, current_user=None):
        """
        Leave community
        
        Members can leave anytime. Owners cannot leave without transferring ownership.
        """
        try:
            success, error = membership_service.remove_member(community_id, current_user.id)
            if error:
                return format_error(error='leave_failed', message=error, status_code=400)
            
            return format_data(
                data={'message': 'Left community successfully'},
                message='Left community successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error leaving community: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@member_blp.route('/<int:community_id>/members/<int:user_id>/role')
class MemberRoleResource(MethodView):
    """Update member role endpoint"""
    
    @token_required
    @member_blp.arguments(UpdateMemberRoleSchema)
    @member_blp.response(200, MemberResponseSchema, description='Role updated')
    @member_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @member_blp.alt_response(404, schema=CommunityErrorSchema, description='Member not found')
    def put(self, data, community_id, user_id, current_user=None):
        """
        Update member role
        
        Only owner/admin can update roles. Owner role can only be set by current owner.
        """
        try:
            # Check authorization
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only admins/owners can update roles')
            
            # Only owner can transfer ownership
            if data['role'] == 'owner' and not membership_service.is_owner(community_id, current_user.id):
                return format_unauthorized('Only owner can transfer ownership')
            
            member, error = membership_service.update_member_role(
                community_id, 
                user_id, 
                data['role']
            )
            if error:
                return format_error(error='update_failed', message=error, status_code=400)
            
            return format_data(
                data=member.to_dict(),
                message='Role updated successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error updating role: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@member_blp.route('/<int:community_id>/members/<int:user_id>/suspend')
class SuspendMemberResource(MethodView):
    """Suspend a community member (admin/owner only). Suspended members cannot post or pay bills."""

    @token_required
    @member_blp.response(200, MemberResponseSchema, description='Member suspended')
    @member_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @member_blp.alt_response(404, schema=CommunityErrorSchema, description='Member not found')
    def post(self, community_id, user_id, current_user=None):
        try:
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only admins/owners can suspend members')
            if membership_service.is_owner(community_id, user_id):
                return format_forbidden('Cannot suspend community owner')
            member, error = membership_service.suspend_member(community_id, user_id)
            if error:
                return format_error(error='suspend_failed', message=error, status_code=400)
            return format_data(
                data=member.to_dict(),
                message='Member suspended successfully',
                status_code=200,
            )
        except Exception as e:
            logger.error(f"Error suspending member: {e}", exc_info=True)
            return format_internal_error(str(e))


@member_blp.route('/<int:community_id>/members/<int:user_id>')
class RemoveMemberResource(MethodView):
    """Remove member endpoint"""
    
    @token_required
    @member_blp.response(204, description='Member removed')
    @member_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @member_blp.alt_response(404, schema=CommunityErrorSchema, description='Member not found')
    def delete(self, community_id, user_id, current_user=None):
        """
        Remove member from community
        
        Only owner/admin can remove members.
        """
        try:
            # Check authorization
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_unauthorized('Only admins/owners can remove members')
            
            # Cannot remove owner
            if membership_service.is_owner(community_id, user_id):
                return format_forbidden('Cannot remove community owner')
            
            success, error = membership_service.remove_member(community_id, user_id)
            if error:
                return format_error(error='removal_failed', message=error, status_code=400)
            
            return '', 204
            
        except Exception as e:
            logger.error(f"Error removing member: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
