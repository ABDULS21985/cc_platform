"""Notification REST resource."""
import logging

from flask.views import MethodView
from flask_smorest import Blueprint

from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import (
    format_data,
    format_internal_error,
    format_not_found,
)
from modules.notifications.schemas.notification_schema import (
    NotificationCreateSchema,
    NotificationErrorSchema,
    NotificationListQuerySchema,
    NotificationListResponseSchema,
    NotificationPreferencesSchema,
)
from modules.notifications.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

notification_blp = Blueprint(
    'notifications',
    __name__,
    url_prefix='/api/v2/notifications',
    description='In-app notification endpoints',
)

notification_service = NotificationService()


@notification_blp.route('/')
class NotificationCollectionResource(MethodView):
    @token_required
    @notification_blp.arguments(NotificationListQuerySchema, location='query')
    @notification_blp.response(200, NotificationListResponseSchema)
    @notification_blp.alt_response(401, schema=NotificationErrorSchema)
    def get(self, args, current_user=None):
        try:
            result, status = notification_service.list(
                user_id=current_user.id,
                limit=args.get('limit', 50),
                offset=args.get('offset', 0),
                unread_only=args.get('unread_only', False),
                category=args.get('category'),
                community_id=args.get('community_id'),
            )
            return format_data(data=result, message='Notifications retrieved', status_code=status)
        except Exception as exc:
            logger.error('Error listing notifications: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @notification_blp.arguments(NotificationCreateSchema)
    @notification_blp.response(201, NotificationListResponseSchema)
    @notification_blp.alt_response(401, schema=NotificationErrorSchema)
    def post(self, data, current_user=None):
        """Create a notification for the current user (test/seed helper).

        Returns the standard `{success, message, data}` envelope. When the
        user has muted the category the response is `{skipped: true,
        reason: 'category_muted'}` with status 200.
        """
        try:
            notif = notification_service.create_for_user(
                user_id=current_user.id,
                title=data['title'],
                body=data.get('body', ''),
                category=data.get('category', 'system'),
                source=data.get('source', 'System'),
                action_href=data.get('action_href'),
                action_label=data.get('action_label'),
            )
            if notif is None:
                return format_data(
                    data={'skipped': True, 'reason': 'category_muted'},
                    message='Notification suppressed by user preferences',
                    status_code=200,
                )
            return format_data(
                data=notif.to_dict(), message='Notification created', status_code=201
            )
        except Exception as exc:
            logger.error('Error creating notification: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/unread-count')
class NotificationUnreadCountResource(MethodView):
    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def get(self, current_user=None):
        try:
            count = notification_service.repo.count_unread(current_user.id)
            return format_data(data={'unread_count': count}, message='OK', status_code=200)
        except Exception as exc:
            logger.error('Error counting unread notifications: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/read-all')
class NotificationMarkAllReadResource(MethodView):
    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def post(self, current_user=None):
        try:
            result, status = notification_service.mark_all_read(current_user.id)
            return format_data(data=result, message='All notifications marked read', status_code=status)
        except Exception as exc:
            logger.error('Error marking all notifications read: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/unread-by-category')
class NotificationUnreadByCategoryResource(MethodView):
    """Per-category unread counts. Used to badge sidebar nav items."""

    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def get(self, current_user=None):
        try:
            result, status = notification_service.unread_by_category(current_user.id)
            return format_data(data=result, message='OK', status_code=status)
        except Exception as exc:
            logger.error('Error counting per-category unread: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/communities/<int:community_id>/unread-count')
class NotificationCommunityUnreadCountResource(MethodView):
    """Unread notification count scoped to one community."""

    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def get(self, community_id, current_user=None):
        try:
            result, status = notification_service.unread_for_community(
                current_user.id,
                community_id,
            )
            return format_data(data=result, message='OK', status_code=status)
        except Exception as exc:
            logger.error('Error counting community unread: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/community-mutes')
class NotificationCommunityMutesResource(MethodView):
    """List the IDs of communities muted by the current user."""

    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def get(self, current_user=None):
        try:
            result, status = notification_service.list_muted_communities(current_user.id)
            return format_data(data=result, message='OK', status_code=status)
        except Exception as exc:
            logger.error('Error listing muted communities: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/community-mutes/<int:community_id>')
class NotificationCommunityMuteItemResource(MethodView):
    """Mute or unmute notifications from a single community."""

    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def post(self, community_id, current_user=None):
        try:
            result, status = notification_service.mute_community(current_user.id, community_id)
            return format_data(data=result, message='Community muted', status_code=status)
        except Exception as exc:
            logger.error('Error muting community: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def delete(self, community_id, current_user=None):
        try:
            result, status = notification_service.unmute_community(current_user.id, community_id)
            return format_data(data=result, message='Community unmuted', status_code=status)
        except Exception as exc:
            logger.error('Error unmuting community: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/preferences')
class NotificationPreferencesResource(MethodView):
    """Per-user category mute settings."""

    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    def get(self, current_user=None):
        try:
            result, status = notification_service.get_preferences(current_user.id)
            return format_data(data=result, message='Preferences retrieved', status_code=status)
        except Exception as exc:
            logger.error('Error fetching notification preferences: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @notification_blp.arguments(NotificationPreferencesSchema)
    @notification_blp.response(200, NotificationListResponseSchema)
    def put(self, data, current_user=None):
        try:
            # Drop None entries — only update fields the caller actually sent.
            flags = {k: v for k, v in data.items() if v is not None}
            result, status = notification_service.update_preferences(current_user.id, flags)
            return format_data(data=result, message='Preferences updated', status_code=status)
        except Exception as exc:
            logger.error('Error updating notification preferences: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/<int:notification_id>')
class NotificationItemResource(MethodView):
    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    @notification_blp.alt_response(404, schema=NotificationErrorSchema)
    def patch(self, notification_id, current_user=None):
        """Mark a single notification as read."""
        try:
            result, status = notification_service.mark_read(notification_id, current_user.id)
            if status == 404:
                return format_not_found('Notification')
            return format_data(data=result, message='Notification updated', status_code=status)
        except Exception as exc:
            logger.error('Error updating notification: %s', exc, exc_info=True)
            return format_internal_error(str(exc))

    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    @notification_blp.alt_response(404, schema=NotificationErrorSchema)
    def delete(self, notification_id, current_user=None):
        try:
            result, status = notification_service.delete(notification_id, current_user.id)
            if status == 404:
                return format_not_found('Notification')
            return format_data(data=result, message='Notification deleted', status_code=status)
        except Exception as exc:
            logger.error('Error deleting notification: %s', exc, exc_info=True)
            return format_internal_error(str(exc))


@notification_blp.route('/<int:notification_id>/unread')
class NotificationMarkUnreadResource(MethodView):
    @token_required
    @notification_blp.response(200, NotificationListResponseSchema)
    @notification_blp.alt_response(404, schema=NotificationErrorSchema)
    def post(self, notification_id, current_user=None):
        """Mark a single notification as unread."""
        try:
            result, status = notification_service.mark_unread(notification_id, current_user.id)
            if status == 404:
                return format_not_found('Notification')
            return format_data(data=result, message='Notification updated', status_code=status)
        except Exception as exc:
            logger.error('Error marking notification unread: %s', exc, exc_info=True)
            return format_internal_error(str(exc))
