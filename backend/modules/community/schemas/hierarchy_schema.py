"""
Schemas for institution and organization endpoints.
"""
from marshmallow import Schema, fields, validate


class PaginationSchema(Schema):
    limit = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    offset = fields.Integer(load_default=0, validate=validate.Range(min=0))


class CreateInstitutionSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=2, max=255))
    description = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=1000))


class InstitutionDataSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    slug = fields.String()
    description = fields.String(allow_none=True)
    status = fields.String()
    created_by = fields.Integer()
    created_at = fields.String()
    updated_at = fields.String()


class InstitutionListSchema(Schema):
    institutions = fields.List(fields.Nested(InstitutionDataSchema))
    pagination = fields.Dict()


class InstitutionResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(InstitutionDataSchema)


class InstitutionListResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(InstitutionListSchema)


class CreateOrganizationSchema(Schema):
    institution_id = fields.Integer(load_default=None, allow_none=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=255))
    description = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=1000))
    is_default = fields.Boolean(load_default=False)


class OrganizationListQuerySchema(Schema):
    institution_id = fields.Integer(load_default=None, allow_none=True)
    limit = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    offset = fields.Integer(load_default=0, validate=validate.Range(min=0))


class OrganizationDataSchema(Schema):
    id = fields.Integer()
    institution_id = fields.Integer(allow_none=True)
    name = fields.String()
    slug = fields.String()
    description = fields.String(allow_none=True)
    is_default = fields.Boolean()
    status = fields.String()
    created_by = fields.Integer()
    created_at = fields.String()
    updated_at = fields.String()


class OrganizationListSchema(Schema):
    organizations = fields.List(fields.Nested(OrganizationDataSchema))
    pagination = fields.Dict()


class OrganizationResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(OrganizationDataSchema)


class OrganizationListResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(OrganizationListSchema)


class HierarchyErrorSchema(Schema):
    success = fields.Boolean(dump_default=False)
    error = fields.String()
    message = fields.String()
