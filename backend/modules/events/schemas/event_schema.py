"""Marshmallow schemas for events."""
from marshmallow import Schema, fields, validate


class EventResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()


class EventCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    description = fields.String(load_default='')
    category = fields.String(load_default=None, allow_none=True)
    starts_at = fields.DateTime(required=True)
    ends_at = fields.DateTime(load_default=None, allow_none=True)
    duration_label = fields.String(load_default=None, allow_none=True)
    community_id = fields.Integer(load_default=None, allow_none=True)
    location = fields.String(load_default='', validate=validate.Length(max=255))
    is_online = fields.Boolean(load_default=False)
    is_private = fields.Boolean(load_default=False)
    capacity = fields.Integer(load_default=0, validate=validate.Range(min=0))
    ticket_price = fields.String(load_default=None, allow_none=True)
    cover_image = fields.String(load_default=None, allow_none=True)


class EventListQuerySchema(Schema):
    scope = fields.String(
        load_default='upcoming',
        validate=validate.OneOf(['upcoming', 'live', 'hosting', 'past', 'all']),
    )
    limit = fields.Integer(load_default=100, validate=validate.Range(min=1, max=200))
    offset = fields.Integer(load_default=0, validate=validate.Range(min=0))


class EventErrorSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    error = fields.String()
    code = fields.String()
