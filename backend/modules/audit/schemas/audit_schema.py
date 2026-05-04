"""Marshmallow schemas for user audit events."""
from marshmallow import Schema, fields, validate

from modules.audit.models.audit_event import AUDIT_CATEGORIES, AUDIT_SEVERITIES


class AuditResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()


class AuditListQuerySchema(Schema):
    limit = fields.Integer(load_default=100, validate=validate.Range(min=1, max=200))
    offset = fields.Integer(load_default=0, validate=validate.Range(min=0))
    category = fields.String(load_default=None, validate=validate.OneOf(list(AUDIT_CATEGORIES)))
    severity = fields.String(load_default=None, validate=validate.OneOf(list(AUDIT_SEVERITIES)))


class AuditErrorSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    error = fields.String()
    code = fields.String()
