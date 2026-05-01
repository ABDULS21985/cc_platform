from marshmallow import Schema, fields, validate, EXCLUDE


class AdminCommunityListQuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    search = fields.Str(load_default=None)
    status = fields.Str(load_default=None)
    institution_id = fields.Int(load_default=None)
    organization_id = fields.Int(load_default=None)

    page = fields.Int(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))


class AdminCommunityTransactionsQuerySchema(Schema):
    """Query params for community-scoped transactions list (super admin)."""

    class Meta:
        unknown = EXCLUDE

    search = fields.Str(load_default=None)
    type = fields.Str(load_default=None)
    status = fields.Str(load_default=None)

    page = fields.Int(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))


class AdminCommunityMembersQuerySchema(Schema):
    """Query params for community-scoped members list (super admin)."""

    class Meta:
        unknown = EXCLUDE

    search = fields.Str(load_default=None)
    role = fields.Str(load_default=None, validate=validate.OneOf(["owner", "admin", "member"]))
    status = fields.Str(
        load_default=None,
        validate=validate.OneOf(["active", "suspended", "left", "pending_payment"]),
    )

    page = fields.Int(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))


class AdminCommunityMemberUpdateSchema(Schema):
    """Allowed community member actions (super admin)."""

    class Meta:
        unknown = EXCLUDE

    role = fields.Str(load_default=None, validate=validate.OneOf(["admin", "member"]))
    status = fields.Str(
        load_default=None,
        validate=validate.OneOf(["active", "suspended"]),
    )

