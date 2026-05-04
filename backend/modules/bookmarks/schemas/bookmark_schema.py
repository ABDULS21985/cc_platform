"""Marshmallow schemas for bookmarks."""
from marshmallow import Schema, fields, validate

from modules.bookmarks.models.bookmark import BOOKMARK_KINDS


class BookmarkResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()


class BookmarkCreateSchema(Schema):
    kind = fields.String(required=True, validate=validate.OneOf(list(BOOKMARK_KINDS)))
    target_ref = fields.String(required=True, validate=validate.Length(min=1, max=255))
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    description = fields.String(load_default='')
    source = fields.String(load_default='', validate=validate.Length(max=120))
    href = fields.String(load_default='', validate=validate.Length(max=512))
    amount = fields.String(load_default=None, allow_none=True)
    community_id = fields.Integer(load_default=None, allow_none=True)
    community_name = fields.String(load_default=None, allow_none=True)


class BookmarkListQuerySchema(Schema):
    limit = fields.Integer(load_default=100, validate=validate.Range(min=1, max=200))
    offset = fields.Integer(load_default=0, validate=validate.Range(min=0))
    kind = fields.String(load_default=None, validate=validate.OneOf(list(BOOKMARK_KINDS)))


class BookmarkErrorSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    error = fields.String()
    code = fields.String()
