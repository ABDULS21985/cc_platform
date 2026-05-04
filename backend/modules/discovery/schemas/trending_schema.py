from marshmallow import Schema, fields, validate


class TrendingListQuerySchema(Schema):
    limit = fields.Integer(load_default=5, validate=validate.Range(min=1, max=20))


class TrendingResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()
