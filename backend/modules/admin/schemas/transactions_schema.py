from marshmallow import Schema, fields, validate, EXCLUDE


class AdminTransactionListQuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    search = fields.Str(load_default=None)
    type = fields.Str(load_default=None)  # credit/debit
    status = fields.Str(load_default=None)  # pending/successful/failed
    source = fields.Str(load_default=None)  # wallet (MVP)

    page = fields.Int(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))

