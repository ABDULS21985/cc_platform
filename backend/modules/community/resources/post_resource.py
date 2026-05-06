"""
Community Post Resource - Flask-Smorest MethodView endpoints
"""
from flask.views import MethodView
import logging
from flask import request

from flask_smorest import Blueprint

from modules.auth_v2.utils.decorators import token_required
from modules.community.schemas.community_schema import CommunityErrorSchema
from modules.community.schemas.post_schema import (
    CommunityPostCommentListQuerySchema,
    CommunityPostCommentListResponseSchema,
    CommunityPostCommentResponseSchema,
    CommunityPostListQuerySchema,
    CommunityPostListResponseSchema,
    CommunityPostMediaUploadResponseSchema,
    CommunityPostReactionResponseSchema,
    CommunityPostResponseSchema,
    CreateCommunityPostSchema,
    CreateCommunityPostCommentSchema,
    ToggleCommunityPostReactionSchema,
    UpdateCommunityPostSchema,
)
from modules.community.services.post_media_service import CommunityPostMediaService
from modules.community.services.post_service import CommunityPostService
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_not_found,
)

logger = logging.getLogger(__name__)

post_blp = Blueprint(
    'community_posts',
    __name__,
    url_prefix='/api/v2/community',
    description='Community post endpoints',
)

post_service = CommunityPostService()
post_media_service = CommunityPostMediaService()


@post_blp.route('/posts/media/upload')
class CommunityPostMediaUploadResource(MethodView):
    """Multi-image upload endpoint for composing community posts."""

    @token_required
    @post_blp.response(200, CommunityPostMediaUploadResponseSchema, description='Post media uploaded')
    @post_blp.alt_response(400, schema=CommunityErrorSchema, description='Invalid upload request')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    def post(self, current_user=None):
        try:
            files = request.files.getlist('files')
            media, error = post_media_service.upload_images(files=files, user_id=current_user.id)
            if error:
                return format_error(error='media_upload_failed', message=error, status_code=400)

            return format_data(
                data={
                    'media': media,
                    'count': len(media),
                },
                message='Post media uploaded successfully',
                status_code=200,
            )
        except Exception as exc:
            logger.error('Error uploading post media: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@post_blp.route('/<int:community_id>/posts')
class CommunityPostListResource(MethodView):
    """Community post listing and creation."""

    @token_required
    @post_blp.arguments(CommunityPostListQuerySchema, location='query')
    @post_blp.response(200, CommunityPostListResponseSchema, description='Community posts retrieved')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    def get(self, args, community_id, current_user=None):
        try:
            result, error = post_service.list_posts(community_id, current_user.id, args)
            if error == 'Community not found':
                return format_not_found('Community')
            if error:
                return format_error(error='forbidden', message=error, status_code=403)

            posts, total = result
            return format_data(
                data={
                    'posts': [post.to_dict(current_user_id=current_user.id) for post in posts],
                    'pagination': {
                        'total': total,
                        'limit': args.get('limit', 20),
                        'offset': args.get('offset', 0),
                    },
                },
                message='Community posts retrieved successfully',
                status_code=200,
            )
        except Exception as exc:
            logger.error("Error retrieving community posts: %s", exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @post_blp.arguments(CreateCommunityPostSchema)
    @post_blp.response(201, CommunityPostResponseSchema, description='Community post created')
    @post_blp.alt_response(400, schema=CommunityErrorSchema, description='Invalid request')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Community not found')
    def post(self, data, community_id, current_user=None):
        try:
            post, error = post_service.create_post(community_id, current_user.id, data)
            if error == 'Community not found':
                return format_not_found('Community')
            if error:
                status_code = 403 if 'Only active community members' in error or 'Only admins or owners' in error else 400
                return format_error(error='post_creation_failed', message=error, status_code=status_code)

            return format_data(
                data=post.to_dict(current_user_id=current_user.id),
                message='Community post created successfully',
                status_code=201,
            )
        except Exception as exc:
            logger.error("Error creating community post: %s", exc, exc_info=True)
            return format_internal_error(str(exc))


@post_blp.route('/posts/<int:post_id>')
class CommunityPostResource(MethodView):
    """Single community post operations."""

    @token_required
    @post_blp.response(200, CommunityPostResponseSchema, description='Community post retrieved')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Post not found')
    def get(self, post_id, current_user=None):
        try:
            post, error = post_service.get_post(post_id, current_user.id)
            if error == 'Post not found':
                return format_not_found('Post')
            if error:
                return format_error(error='forbidden', message=error, status_code=403)

            return format_data(
                data=post.to_dict(current_user_id=current_user.id),
                message='Community post retrieved successfully',
                status_code=200,
            )
        except Exception as exc:
            logger.error("Error retrieving community post %s: %s", post_id, exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @post_blp.arguments(UpdateCommunityPostSchema)
    @post_blp.response(200, CommunityPostResponseSchema, description='Community post updated')
    @post_blp.alt_response(400, schema=CommunityErrorSchema, description='Invalid request')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Post not found')
    def put(self, data, post_id, current_user=None):
        try:
            post, error = post_service.update_post(post_id, current_user.id, data)
            if error == 'Post not found':
                return format_not_found('Post')
            if error:
                status_code = 403 if 'Not authorized' in error or 'Only active community members' in error or 'Only admins or owners' in error else 400
                return format_error(error='post_update_failed', message=error, status_code=status_code)

            return format_data(
                data=post.to_dict(current_user_id=current_user.id),
                message='Community post updated successfully',
                status_code=200,
            )
        except Exception as exc:
            logger.error("Error updating community post %s: %s", post_id, exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @post_blp.response(204, description='Community post deleted')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Post not found')
    def delete(self, post_id, current_user=None):
        try:
            success, error = post_service.delete_post(post_id, current_user.id)
            if error == 'Post not found':
                return format_not_found('Post')
            if error:
                status_code = 403 if 'Not authorized' in error or 'Only active community members' in error else 400
                return format_error(error='post_delete_failed', message=error, status_code=status_code)

            return '', 204
        except Exception as exc:
            logger.error("Error deleting community post %s: %s", post_id, exc, exc_info=True)
            return format_internal_error(str(exc))


@post_blp.route('/posts/<int:post_id>/comments')
class CommunityPostCommentsResource(MethodView):
    """Post comment listing and creation."""

    @token_required
    @post_blp.arguments(CommunityPostCommentListQuerySchema, location='query')
    @post_blp.response(200, CommunityPostCommentListResponseSchema, description='Post comments retrieved')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Post not found')
    def get(self, args, post_id, current_user=None):
        try:
            result, error = post_service.list_comments(post_id, current_user.id, args)
            if error == 'Post not found':
                return format_not_found('Post')
            if error:
                return format_error(error='forbidden', message=error, status_code=403)

            comments, total = result
            return format_data(
                data={
                    'comments': [comment.to_dict() for comment in comments],
                    'pagination': {
                        'total': total,
                        'limit': args.get('limit', 20),
                        'offset': args.get('offset', 0),
                    },
                },
                message='Post comments retrieved successfully',
                status_code=200,
            )
        except Exception as exc:
            logger.error("Error retrieving comments for post %s: %s", post_id, exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @post_blp.arguments(CreateCommunityPostCommentSchema)
    @post_blp.response(201, CommunityPostCommentResponseSchema, description='Post comment created')
    @post_blp.alt_response(400, schema=CommunityErrorSchema, description='Invalid request')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Post not found')
    def post(self, data, post_id, current_user=None):
        try:
            comment, error = post_service.create_comment(post_id, current_user.id, data)
            if error == 'Post not found':
                return format_not_found('Post')
            if error:
                status_code = 403 if 'Only active community members' in error else 400
                return format_error(error='comment_creation_failed', message=error, status_code=status_code)

            return format_data(
                data=comment.to_dict(),
                message='Post comment created successfully',
                status_code=201,
            )
        except Exception as exc:
            logger.error("Error creating comment for post %s: %s", post_id, exc, exc_info=True)
            return format_internal_error(str(exc))


@post_blp.route('/posts/comments/<int:comment_id>')
class CommunityPostCommentResource(MethodView):
    """Single post comment operations."""

    @token_required
    @post_blp.response(204, description='Post comment deleted')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Comment not found')
    def delete(self, comment_id, current_user=None):
        try:
            success, error = post_service.delete_comment(comment_id, current_user.id)
            if error == 'Comment not found':
                return format_not_found('Comment')
            if error == 'Post not found':
                return format_not_found('Post')
            if error:
                status_code = 403 if 'Not authorized' in error or 'Only active community members' in error else 400
                return format_error(error='comment_delete_failed', message=error, status_code=status_code)

            return '', 204
        except Exception as exc:
            logger.error("Error deleting comment %s: %s", comment_id, exc, exc_info=True)
            return format_internal_error(str(exc))


@post_blp.route('/posts/<int:post_id>/reactions')
class CommunityPostReactionResource(MethodView):
    """Current-user post reaction toggle."""

    @token_required
    @post_blp.arguments(ToggleCommunityPostReactionSchema)
    @post_blp.response(200, CommunityPostReactionResponseSchema, description='Post reaction toggled')
    @post_blp.alt_response(400, schema=CommunityErrorSchema, description='Invalid request')
    @post_blp.alt_response(401, schema=CommunityErrorSchema, description='Unauthorized')
    @post_blp.alt_response(404, schema=CommunityErrorSchema, description='Post not found')
    def post(self, data, post_id, current_user=None):
        try:
            result, error = post_service.toggle_reaction(post_id, current_user.id, data)
            if error == 'Post not found':
                return format_not_found('Post')
            if error:
                status_code = 403 if 'Only active community members' in error else 400
                return format_error(error='reaction_toggle_failed', message=error, status_code=status_code)

            return format_data(
                data=result,
                message='Post reaction updated successfully',
                status_code=200,
            )
        except Exception as exc:
            logger.error("Error toggling reaction for post %s: %s", post_id, exc, exc_info=True)
            return format_internal_error(str(exc))
