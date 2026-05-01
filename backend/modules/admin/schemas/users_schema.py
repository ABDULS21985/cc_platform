from marshmallow import Schema, fields, validate, EXCLUDE


PLATFORM_ROLES = [
    "user",
    "admin",
    "super_admin",
    "support",
    "moderator",
    "finance",
    "ops",
]


class AdminUserListQuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    search = fields.Str(load_default=None)
    role = fields.Str(load_default=None)
    verification_status = fields.Str(load_default=None)
    email_verified = fields.Bool(load_default=None)
    bvn_verified = fields.Bool(load_default=None)
    nin_verified = fields.Bool(load_default=None)
    is_active = fields.Bool(load_default=None)

    page = fields.Int(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))


class AdminUserUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    role = fields.Str(load_default=None, validate=validate.OneOf(PLATFORM_ROLES))
    is_active = fields.Bool(load_default=None)

