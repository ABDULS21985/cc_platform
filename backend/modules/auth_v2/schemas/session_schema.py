"""
Marshmallow schemas for /v2/auth/sessions responses.
"""
from marshmallow import Schema, fields


class AuthSessionDataSchema(Schema):
    id = fields.Integer()
    user_id = fields.Integer()
    device_label = fields.String(allow_none=True)
    browser = fields.String(allow_none=True)
    os = fields.String(allow_none=True)
    ip = fields.String(allow_none=True)
    location = fields.String(allow_none=True)
    last_seen_at = fields.String(allow_none=True)
    created_at = fields.String(allow_none=True)
    revoked_at = fields.String(allow_none=True)
    is_active = fields.Boolean()


class AuthSessionListResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()


class AuthSessionResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()


class AuthSessionRevokeResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()
