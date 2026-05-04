"""Event REST resource."""
import logging

from flask.views import MethodView
from flask_smorest import Blueprint

from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import (
    format_data,
    format_error,
    format_internal_error,
    format_not_found,
)
from modules.events.schemas.event_schema import (
    EventCreateSchema,
    EventErrorSchema,
    EventListQuerySchema,
    EventResponseSchema,
)
from modules.events.services.event_service import EventService

logger = logging.getLogger(__name__)

event_blp = Blueprint(
    'events',
    __name__,
    url_prefix='/api/v2/events',
    description='Event management endpoints',
)

event_service = EventService()


@event_blp.route('/')
class EventCollectionResource(MethodView):
    @token_required
    @event_blp.arguments(EventListQuerySchema, location='query')
    @event_blp.response(200, EventResponseSchema)
    @event_blp.alt_response(401, schema=EventErrorSchema)
    def get(self, args, current_user=None):
        try:
            result, status = event_service.list_for_user(
                user_id=current_user.id,
                scope=args.get('scope', 'upcoming'),
                limit=args.get('limit', 100),
                offset=args.get('offset', 0),
            )
            return format_data(data=result, message='Events retrieved', status_code=status)
        except Exception as exc:
            logger.error('Error listing events: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @event_blp.arguments(EventCreateSchema)
    @event_blp.response(201, EventResponseSchema)
    @event_blp.alt_response(403, schema=EventErrorSchema)
    def post(self, data, current_user=None):
        try:
            result, status = event_service.create(
                creator_id=current_user.id,
                title=data['title'],
                starts_at=data['starts_at'],
                ends_at=data.get('ends_at'),
                community_id=data.get('community_id'),
                description=data.get('description', ''),
                category=data.get('category'),
                location=data.get('location', ''),
                is_online=data.get('is_online', False),
                is_private=data.get('is_private', False),
                capacity=data.get('capacity', 0),
                ticket_price=data.get('ticket_price'),
                duration_label=data.get('duration_label'),
                cover_image=data.get('cover_image'),
            )
            if status >= 400:
                return format_error(
                    error=result.get('code', 'invalid_request'),
                    message=result.get('error', 'Invalid request'),
                    status_code=status,
                )
            return format_data(data=result, message='Event created', status_code=status)
        except Exception as exc:
            logger.error('Error creating event: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@event_blp.route('/<int:event_id>')
class EventItemResource(MethodView):
    @token_required
    @event_blp.response(200, EventResponseSchema)
    @event_blp.alt_response(404, schema=EventErrorSchema)
    def get(self, event_id, current_user=None):
        try:
            result, status = event_service.get(event_id, current_user.id)
            if status == 404:
                return format_not_found('Event')
            return format_data(data=result, message='Event retrieved', status_code=status)
        except Exception as exc:
            logger.error('Error getting event: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @event_blp.response(200, EventResponseSchema)
    @event_blp.alt_response(403, schema=EventErrorSchema)
    @event_blp.alt_response(404, schema=EventErrorSchema)
    def delete(self, event_id, current_user=None):
        try:
            result, status = event_service.cancel(event_id, current_user.id)
            if status == 404:
                return format_not_found('Event')
            if status >= 400:
                return format_error(
                    error=result.get('code', 'forbidden'),
                    message=result.get('error', 'Forbidden'),
                    status_code=status,
                )
            return format_data(data=result, message='Event cancelled', status_code=status)
        except Exception as exc:
            logger.error('Error cancelling event: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@event_blp.route('/<int:event_id>/attend')
class EventAttendResource(MethodView):
    @token_required
    @event_blp.response(200, EventResponseSchema)
    @event_blp.alt_response(404, schema=EventErrorSchema)
    @event_blp.alt_response(409, schema=EventErrorSchema)
    def post(self, event_id, current_user=None):
        try:
            result, status = event_service.attend(event_id, current_user.id)
            if status == 404:
                return format_not_found('Event')
            if status >= 400:
                return format_error(
                    error=result.get('code', 'invalid_request'),
                    message=result.get('error', 'Cannot attend'),
                    status_code=status,
                )
            return format_data(data=result, message='Attendance confirmed', status_code=status)
        except Exception as exc:
            logger.error('Error attending event: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @event_blp.response(200, EventResponseSchema)
    @event_blp.alt_response(404, schema=EventErrorSchema)
    def delete(self, event_id, current_user=None):
        try:
            result, status = event_service.cancel_attendance(event_id, current_user.id)
            if status == 404:
                return format_not_found('Event')
            return format_data(data=result, message='Attendance cancelled', status_code=status)
        except Exception as exc:
            logger.error('Error cancelling attendance: %s', exc, exc_info=True)
            return format_internal_error(str(exc))
