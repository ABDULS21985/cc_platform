"""
Marshmallow schemas for /v2/subscriptions and /v2/standing-instructions.
"""
from marshmallow import Schema, fields, validate

from modules.subscriptions.models.subscription import (
    SubscriptionCadence,
    SubscriptionKind,
    SubscriptionStatus,
)


class SubscriptionCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=2, max=200))
    description = fields.String(load_default=None, validate=validate.Length(max=500))
    amount = fields.Decimal(required=True, as_string=True)
    currency = fields.String(load_default='NGN', validate=validate.Length(equal=3))
    cadence = fields.String(
        load_default=SubscriptionCadence.MONTHLY,
        validate=validate.OneOf(list(SubscriptionCadence.ALL)),
    )
    kind = fields.String(
        load_default=SubscriptionKind.SUBSCRIPTION,
        validate=validate.OneOf(list(SubscriptionKind.ALL)),
    )
    next_charge_at = fields.DateTime(load_default=None)

    counterparty_type = fields.String(load_default=None)
    counterparty_id = fields.Integer(load_default=None)
    source_bill_id = fields.Integer(load_default=None)

    destination_account_number = fields.String(load_default=None, validate=validate.Length(max=20))
    destination_bank_code = fields.String(load_default=None, validate=validate.Length(max=20))
    destination_account_name = fields.String(load_default=None, validate=validate.Length(max=200))


class SubscriptionStatusUpdateSchema(Schema):
    status = fields.String(
        required=True, validate=validate.OneOf(list(SubscriptionStatus.ALL))
    )


class SubscriptionListQuerySchema(Schema):
    kind = fields.String(
        load_default=None,
        validate=validate.OneOf(list(SubscriptionKind.ALL)),
    )
    status = fields.String(
        load_default=None,
        validate=validate.OneOf(list(SubscriptionStatus.ALL)),
    )
    limit = fields.Integer(load_default=100, validate=validate.Range(min=1, max=200))
    offset = fields.Integer(load_default=0, validate=validate.Range(min=0))


class SubscriptionListResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()


class SubscriptionResponseSchema(Schema):
    success = fields.Boolean()
    message = fields.String()
    data = fields.Dict()
