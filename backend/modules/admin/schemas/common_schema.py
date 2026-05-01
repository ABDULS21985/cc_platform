from marshmallow import Schema, fields, EXCLUDE


class AdminUserSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    id = fields.Int(required=True)
    email = fields.Email(required=True)
    firstname = fields.Str(required=True)
    lastname = fields.Str(required=True)
    full_name = fields.Str(required=True)
    role = fields.Str(required=True)
    is_active = fields.Bool(required=True)
    email_verified = fields.Bool(required=True)
    bvn_verified = fields.Bool(required=True)
    nin_verified = fields.Bool(required=True)
    verification_status = fields.Str(required=True)
    created_at = fields.Str(allow_none=True)
    updated_at = fields.Str(allow_none=True)


class AdminSuccessSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    success = fields.Bool(dump_default=True)
    message = fields.Str()
    data = fields.Raw(allow_none=True)

