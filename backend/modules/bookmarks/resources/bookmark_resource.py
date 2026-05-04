"""Bookmark REST resource."""
import logging

from flask.views import MethodView
from flask_smorest import Blueprint

from modules.auth_v2.utils.decorators import token_required
from modules.bookmarks.schemas.bookmark_schema import (
    BookmarkCreateSchema,
    BookmarkErrorSchema,
    BookmarkListQuerySchema,
    BookmarkResponseSchema,
)
from modules.bookmarks.services.bookmark_service import BookmarkService
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_not_found,
)

logger = logging.getLogger(__name__)

bookmark_blp = Blueprint(
    'bookmarks',
    __name__,
    url_prefix='/api/v2/bookmarks',
    description='User bookmark / saved-item endpoints',
)

bookmark_service = BookmarkService()


@bookmark_blp.route('/')
class BookmarkCollectionResource(MethodView):
    @token_required
    @bookmark_blp.arguments(BookmarkListQuerySchema, location='query')
    @bookmark_blp.response(200, BookmarkResponseSchema)
    @bookmark_blp.alt_response(401, schema=BookmarkErrorSchema)
    def get(self, args, current_user=None):
        try:
            result, status = bookmark_service.list(
                user_id=current_user.id,
                limit=args.get('limit', 100),
                offset=args.get('offset', 0),
                kind=args.get('kind'),
            )
            return format_data(data=result, message='Bookmarks retrieved', status_code=status)
        except Exception as exc:
            logger.error('Error listing bookmarks: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @bookmark_blp.arguments(BookmarkCreateSchema)
    @bookmark_blp.response(201, BookmarkResponseSchema)
    @bookmark_blp.alt_response(400, schema=BookmarkErrorSchema)
    def post(self, data, current_user=None):
        try:
            result, status = bookmark_service.save(
                user_id=current_user.id,
                kind=data['kind'],
                target_ref=data['target_ref'],
                title=data['title'],
                description=data.get('description', ''),
                source=data.get('source', ''),
                href=data.get('href', ''),
                amount=data.get('amount'),
                community_id=data.get('community_id'),
                community_name=data.get('community_name'),
            )
            if status >= 400:
                return format_error(
                    error=result.get('code', 'invalid_request'),
                    message=result.get('error', 'Invalid request'),
                    status_code=status,
                )
            return format_data(data=result, message='Bookmark saved', status_code=status)
        except Exception as exc:
            logger.error('Error creating bookmark: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@bookmark_blp.route('/<int:bookmark_id>')
class BookmarkItemResource(MethodView):
    @token_required
    @bookmark_blp.response(200, BookmarkResponseSchema)
    @bookmark_blp.alt_response(404, schema=BookmarkErrorSchema)
    def delete(self, bookmark_id, current_user=None):
        try:
            result, status = bookmark_service.remove(bookmark_id, current_user.id)
            if status == 404:
                return format_not_found('Bookmark')
            return format_data(data=result, message='Bookmark removed', status_code=status)
        except Exception as exc:
            logger.error('Error deleting bookmark: %s', exc, exc_info=True)
            return format_internal_error(str(exc))
