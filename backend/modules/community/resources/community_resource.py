"""
Community Resource - Flask-Smorest MethodView endpoints
GET/POST /api/v1/communities - List/Create communities
GET/PUT/DELETE /api/v1/communities/<id> - Single community operations
"""
from flask.views import MethodView
from flask_smorest import Blueprint
import logging

from modules.community.schemas.community_schema import (
    CreateCommunitySchema,
    UpdateCommunitySchema,
    CommunityMediaUpdateSchema,
    SearchCommunitySchema,
    CommunityResponseSchema,
    CommunityListResponseSchema,
    CommunityErrorSchema,
    CommunityGenericResponseSchema,
)
from modules.community.services import CommunityService, MembershipService
from modules.community.utils import resolve_optional_user_id
from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_forbidden,
    format_internal_error,
    format_not_found,
)

logger = logging.getLogger(__name__)

community_blp = Blueprint(
    'communities',
    __name__,
    url_prefix='/api/v2/community',
    description='Community management endpoints'
)

community_service = CommunityService()
membership_service = MembershipService()


@community_blp.route('')
class CommunityListResource(MethodView):
    """Community list and creation endpoints"""
    
    @community_blp.arguments(SearchCommunitySchema, location='query')
    @community_blp.response(200, CommunityListResponseSchema, description='Communities retrieved')
    def get(self, args):
        """
        Search/list communities
        
        Query Parameters:
            query: Search string
            interest_id: Filter by interest category
            visibility: Filter by visibility (public/private)
            limit: Results per page (1-100, default 20)
            offset: Pagination offset (default 0)
        """
        try:
            current_user_id = resolve_optional_user_id()
            communities, total = community_service.search_communities(
                args=args,
                limit=args.get('limit', 20),
                offset=args.get('offset', 0)
            )

            return format_data(
                data={
                    'communities': [c.to_dict(current_user_id=current_user_id) for c in communities],
                    'pagination': {
                        'total': total,
                        'limit': args.get('limit', 20),
                        'offset': args.get('offset', 0)
                    }
                },
                message='Communities retrieved successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error searching communities: {str(e)}", exc_info=True)
            return format_internal_error('An error occurred while searching communities')
    
    @token_required
    @community_blp.arguments(CreateCommunitySchema)
    @community_blp.response(201, CommunityResponseSchema, description='Community created')
    @community_blp.alt_response(400, schema=CommunityErrorSchema, description='Validation error')
    @community_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, data, current_user=None):
        """
        Create new community
        
        Creates a new community with the authenticated user as owner.
        """
        try:
            # Convert Decimal to float for service
            community_data = dict(data)
            if 'member_cost' in community_data:
                community_data['member_cost'] = float(community_data['member_cost'])
            
            community, error = community_service.create_community(current_user.id, community_data)
            if error:
                return format_error(error='creation_failed', message=error, status_code=400)
            
            return format_data(
                data=community.to_dict(),
                message='Community created successfully',
                status_code=201,
            )
            
        except Exception as e:
            logger.error(f"Error creating community: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@community_blp.route('/category-counts')
class CommunityCategoryCountsResource(MethodView):
    """Aggregate community counts per Discover-page category label.

    The frontend's category taxonomy (estate, faith, sports, …) doesn't map
    cleanly to a single column on the community model. We accept the labels
    as repeated `?label=` query params and return a dict of label → count
    by matching against name/description (case-insensitive). Communities
    with explicit `category::<label>` interests are also counted.

    Example:
        GET /api/v2/community/category-counts?label=Estate%20%26%20HOA&label=Sports%20%26%20fitness
        →  { "data": { "counts": { "Estate & HOA": 4, "Sports & fitness": 12 } } }
    """

    @community_blp.response(200, CommunityGenericResponseSchema)
    def get(self):
        from flask import request
        from sqlalchemy import or_
        from modules.community.models.community import Community
        from modules.community.constants import CommunityStatus

        labels = request.args.getlist('label')
        if not labels:
            return format_data(data={'counts': {}}, message='No labels supplied', status_code=200)

        # Cap to a reasonable upper bound so a malicious caller can't run
        # 10k LIKE queries.
        labels = labels[:32]
        counts: dict = {}
        for label in labels:
            term = label.strip()
            if not term:
                counts[label] = 0
                continue
            try:
                like_pat = f'%{term}%'
                # Strip simple connectives so "Sports & fitness" still matches
                # a community named "Sports community".
                primary = term.split('&')[0].split('/')[0].strip() or term
                primary_pat = f'%{primary}%'
                count = (
                    Community.query.filter(
                        Community.status == CommunityStatus.ACTIVE.value,
                        or_(
                            Community.name.ilike(like_pat),
                            Community.description.ilike(like_pat),
                            Community.name.ilike(primary_pat),
                            Community.description.ilike(primary_pat),
                        ),
                    ).count()
                )
                counts[label] = int(count)
            except Exception as exc:  # noqa: BLE001
                logger.warning('category-count failed for %r: %s', label, exc)
                counts[label] = 0

        return format_data(data={'counts': counts}, message='Category counts', status_code=200)


@community_blp.route('/<int:community_id>')
class CommunityResource(MethodView):
    """Single community operations"""
    
    @community_blp.response(200, CommunityResponseSchema, description='Community retrieved')
    @community_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    def get(self, community_id):
        """
        Get community details
        
        Returns detailed information about a specific community.
        """
        try:
            current_user_id = resolve_optional_user_id()
            community, error = community_service.get_community(community_id)
            if error:
                return format_not_found('Community')
            
            payload = community.to_dict(current_user_id=current_user_id)

            return format_data(
                data=payload,
                message='Community retrieved successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error getting community: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
    
    @token_required
    @community_blp.arguments(UpdateCommunitySchema)
    @community_blp.response(200, CommunityResponseSchema, description='Community updated')
    @community_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @community_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def put(self, data, community_id, current_user=None):
        """
        Update community
        
        Update community details. Only owner/admin can update.
        """
        try:
            community, error = community_service.get_community(community_id)
            if error:
                return format_not_found('Community')
            
            # Check authorization
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_forbidden('Not authorized to update community')
            
            # Convert Decimal to float and filter None values
            update_data = {k: float(v) if hasattr(v, 'as_tuple') else v 
                          for k, v in data.items() if v is not None}
            
            community, error = community_service.update_community(community_id, update_data)
            if error:
                return format_error(error='update_failed', message=error, status_code=400)
            
            return format_data(
                data=community.to_dict(),
                message='Community updated successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error updating community: {str(e)}", exc_info=True)
            return format_internal_error(str(e))
    
    @token_required
    @community_blp.response(204, description='Community deleted')
    @community_blp.alt_response(403, schema=CommunityErrorSchema, description='Forbidden')
    @community_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def delete(self, community_id, current_user=None):
        """
        Delete community (soft delete)
        
        Only community owner can delete.
        """
        try:
            if not membership_service.is_owner(community_id, current_user.id):
                return format_forbidden('Only owner can delete community')
            
            success, error = community_service.delete_community(community_id)
            if error:
                return format_error(error='deletion_failed', message=error, status_code=400)
            
            return '', 204
            
        except Exception as e:
            logger.error(f"Error deleting community: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@community_blp.route('/<int:community_id>/stats')
class CommunityStatsResource(MethodView):
    """Community statistics endpoint"""
    
    @community_blp.response(200, description='Stats retrieved')
    @community_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def get(self, community_id):
        """
        Get community statistics
        
        Returns member count, active bills, total collections, etc.
        """
        try:
            stats = community_service.get_community_stats(community_id)
            if isinstance(stats, tuple):
                return stats
            if not stats or stats.get('error') == 'not_found':
                return format_not_found('Community')

            return format_data(
                data=stats,
                message='Stats retrieved successfully',
                status_code=200,
            )
            
        except Exception as e:
            logger.error(f"Error getting community stats: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@community_blp.route('/<int:community_id>/cover-photo')
class CommunityCoverPhotoResource(MethodView):
    """Community cover photo update endpoint."""

    @token_required
    @community_blp.arguments(CommunityMediaUpdateSchema)
    @community_blp.response(200, CommunityResponseSchema, description='Community cover photo updated')
    @community_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @community_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def put(self, data, community_id, current_user=None):
        """Update community cover photo URL. Owner/admin only."""
        try:
            community, error = community_service.get_community(community_id)
            if error:
                return format_not_found('Community')

            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_forbidden('Not authorized to update community cover photo')

            community, error = community_service.update_cover_photo(community_id, data['url'])
            if error:
                return format_error(error='update_failed', message=error, status_code=400)

            return format_data(
                data=community.to_dict(),
                message='Community cover photo updated successfully',
                status_code=200,
            )

        except Exception as e:
            logger.error(f"Error updating community cover photo: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@community_blp.route('/<int:community_id>/profile-picture')
class CommunityProfilePictureResource(MethodView):
    """Community profile picture update endpoint."""

    @token_required
    @community_blp.arguments(CommunityMediaUpdateSchema)
    @community_blp.response(200, CommunityResponseSchema, description='Community profile picture updated')
    @community_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @community_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def put(self, data, community_id, current_user=None):
        """Update community profile picture URL. Owner/admin only."""
        try:
            community, error = community_service.get_community(community_id)
            if error:
                return format_not_found('Community')

            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_forbidden('Not authorized to update community profile picture')

            community, error = community_service.update_profile_picture(community_id, data['url'])
            if error:
                return format_error(error='update_failed', message=error, status_code=400)

            return format_data(
                data=community.to_dict(),
                message='Community profile picture updated successfully',
                status_code=200,
            )

        except Exception as e:
            logger.error(f"Error updating community profile picture: {str(e)}", exc_info=True)
            return format_internal_error(str(e))


@community_blp.route('/me')
class UserCommunitiesResource(MethodView):
    """Communities where authenticated user belongs."""

    @token_required
    @community_blp.arguments(SearchCommunitySchema, location='query')
    @community_blp.response(200, CommunityListResponseSchema, description='User communities retrieved')
    def get(self, args, current_user=None):
        communities, total = community_service.get_user_communities(
            user_id=current_user.id,
            limit=args.get('limit', 20),
            offset=args.get('offset', 0),
        )
        return format_data(
            data={
                'communities': [c.to_dict(current_user_id=current_user.id) for c in communities],
                'pagination': {
                    'total': total,
                    'limit': args.get('limit', 20),
                    'offset': args.get('offset', 0),
                },
            },
            message='User communities retrieved successfully',
            status_code=200,
        )


@community_blp.route('/me/owned')
class UserOwnedCommunitiesResource(MethodView):
    """Communities where authenticated user is owner."""

    @token_required
    @community_blp.arguments(SearchCommunitySchema, location='query')
    @community_blp.response(200, CommunityListResponseSchema, description='User owned communities retrieved')
    def get(self, args, current_user=None):
        communities, total = community_service.get_user_owned_communities(
            user_id=current_user.id,
            limit=args.get('limit', 20),
            offset=args.get('offset', 0),
        )
        return format_data(
            data={
                'communities': [c.to_dict(current_user_id=current_user.id) for c in communities],
                'pagination': {
                    'total': total,
                    'limit': args.get('limit', 20),
                    'offset': args.get('offset', 0),
                },
            },
            message='User owned communities retrieved successfully',
            status_code=200,
        )


@community_blp.route('/me/admin')
class UserAdminCommunitiesResource(MethodView):
    """Communities where authenticated user is owner/admin (active)."""

    @token_required
    @community_blp.arguments(SearchCommunitySchema, location='query')
    @community_blp.response(200, CommunityListResponseSchema, description='User admin communities retrieved')
    def get(self, args, current_user=None):
        communities, total = community_service.get_user_admin_communities(
            user_id=current_user.id,
            limit=args.get('limit', 20),
            offset=args.get('offset', 0),
        )
        return format_data(
            data={
                'communities': [c.to_dict(current_user_id=current_user.id) for c in communities],
                'pagination': {
                    'total': total,
                    'limit': args.get('limit', 20),
                    'offset': args.get('offset', 0),
                },
            },
            message='User admin communities retrieved successfully',
            status_code=200,
        )


@community_blp.route('/me/overview')
class UserAdminOverviewResource(MethodView):
    """Aggregated overview for communities where authenticated user is owner/admin."""

    @token_required
    @community_blp.response(200, description='User admin overview retrieved')
    def get(self, current_user=None):
        try:
            payload = community_service.get_user_admin_overview(current_user.id)
            return format_data(
                data=payload,
                message='Overview retrieved successfully',
                status_code=200,
            )
        except Exception as e:
            logger.error(f"Error getting user admin overview: {str(e)}", exc_info=True)
            return format_internal_error('An error occurred while retrieving overview')


@community_blp.route('/me/bills-summary')
class UserBillsSummaryResource(MethodView):
    """Aggregate open bill totals for the authenticated user's memberships."""

    @token_required
    @community_blp.response(200, description='User bills summary retrieved')
    def get(self, current_user=None):
        try:
            payload = community_service.get_user_bills_summary(current_user.id)
            return format_data(
                data=payload,
                message='Bills summary retrieved successfully',
                status_code=200,
            )
        except Exception as e:
            logger.error(f"Error getting user bills summary: {str(e)}", exc_info=True)
            return format_internal_error('An error occurred while retrieving bills summary')


@community_blp.route('/<int:community_id>/overview')
class CommunityAdminOverviewResource(MethodView):
    """Community overview for owner/admin dashboard (scoped)."""

    @token_required
    @community_blp.response(200, description='Community overview retrieved')
    @community_blp.alt_response(403, schema=CommunityErrorSchema, description='Forbidden')
    @community_blp.alt_response(404, schema=CommunityErrorSchema, description='Not found')
    def get(self, community_id: int, current_user=None):
        try:
            if not membership_service.is_admin_or_owner(community_id, current_user.id):
                return format_forbidden('Not authorized to view this overview')

            overview, error = community_service.get_community_overview(community_id)
            if error:
                return format_not_found('Community')

            return format_data(
                data=overview,
                message='Overview retrieved successfully',
                status_code=200,
            )
        except Exception as e:
            logger.error(f"Error getting community overview: {str(e)}", exc_info=True)
            return format_internal_error('An error occurred while retrieving overview')
