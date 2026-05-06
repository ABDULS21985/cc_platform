"""Marshmallow schemas for notifications."""
from marshmallow import Schema, fields, validate

from modules.notifications.models.notification import CATEGORIES


class NotificationAmountSchema(Schema):
    value = fields.String(required=True)
    direction = fields.String(required=True, validate=validate.OneOf(['in', 'out']))


class NotificationResponseSchema(Schema):
    id = fields.Integer()
    user_id = fields.Integer()
    community_id = fields.Integer(allow_none=True)
    category = fields.String()
    title = fields.String()
    body = fields.String()
    source = fields.String()
    action_href = fields.String(allow_none=True)
    action_label = fields.String(allow_none=True)
    amount = fields.Nested(NotificationAmountSchema, allow_none=True)
    initials = fields.String(allow_none=True)
    is_read = fields.Boolean()
    read_at = fields.String(allow_none=True)
    timestamp = fields.String()
    created_at = fields.String()
    updated_at = fields.String(allow_none=True)


class NotificationListQuerySchema(Schema):
    limit = fields.Integer(
        load_default=50, validate=validate.Range(min=1, max=200)
    )
    offset = fields.Integer(load_default=0, validate=validate.Range(min=0))
    unread_only = fields.Boolean(load_default=False)
    category = fields.String(
        load_default=None, validate=validate.OneOf(list(CATEGORIES))
    )
    community_id = fields.Integer(load_default=None, allow_none=True)


class NotificationListResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()


class NotificationCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    body = fields.String(load_default='')
    category = fields.String(
        load_default='system', validate=validate.OneOf(list(CATEGORIES))
    )
    source = fields.String(load_default='System', validate=validate.Length(max=120))
    action_href = fields.String(load_default=None, allow_none=True)
    action_label = fields.String(load_default=None, allow_none=True)


class NotificationErrorSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    error = fields.String()
    code = fields.String()


class NotificationPreferencesSchema(Schema):
    """All fields optional — only ones provided are updated."""
    money = fields.Boolean(load_default=None, allow_none=True)
    bills = fields.Boolean(load_default=None, allow_none=True)
    communities = fields.Boolean(load_default=None, allow_none=True)
    events = fields.Boolean(load_default=None, allow_none=True)
    system = fields.Boolean(load_default=None, allow_none=True)
    digest_frequency = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.OneOf(['off', 'daily', 'weekly']),
    )
    # Per-channel delivery toggles.
    channel_email = fields.Boolean(load_default=None, allow_none=True)
    channel_sms = fields.Boolean(load_default=None, allow_none=True)
    channel_push = fields.Boolean(load_default=None, allow_none=True)
