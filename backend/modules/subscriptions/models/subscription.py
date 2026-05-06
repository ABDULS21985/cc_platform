"""
Subscription Model

Single table powering both /v2/subscriptions (kind=subscription) and
/v2/standing-instructions (kind=standing_instruction). They share lifecycle
semantics (active/paused/cancelled), cadence, and next_charge_at.
"""
from modules.auth_v2.extensions import db
from sqlalchemy import func


class SubscriptionKind:
    SUBSCRIPTION = 'subscription'
    STANDING_INSTRUCTION = 'standing_instruction'
    ALL = (SUBSCRIPTION, STANDING_INSTRUCTION)


class SubscriptionCadence:
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly'
    YEARLY = 'yearly'
    ALL = (WEEKLY, MONTHLY, QUARTERLY, YEARLY)


class SubscriptionStatus:
    ACTIVE = 'active'
    PAUSED = 'paused'
    CANCELLED = 'cancelled'
    ALL = (ACTIVE, PAUSED, CANCELLED)


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )

    kind = db.Column(db.String(32), nullable=False, default=SubscriptionKind.SUBSCRIPTION, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)

    amount = db.Column(db.Numeric(20, 2), nullable=False)
    currency = db.Column(db.String(8), nullable=False, default='NGN')

    cadence = db.Column(db.String(16), nullable=False, default=SubscriptionCadence.MONTHLY)
    next_charge_at = db.Column(db.DateTime, nullable=True, index=True)
    last_charged_at = db.Column(db.DateTime, nullable=True)

    status = db.Column(db.String(16), nullable=False, default=SubscriptionStatus.ACTIVE, index=True)

    # Counterparty descriptors (subscription kind).
    counterparty_type = db.Column(db.String(32), nullable=True)  # 'community' | 'external_vendor' | 'merchant'
    counterparty_id = db.Column(db.Integer, nullable=True)
    source_bill_id = db.Column(db.Integer, nullable=True, index=True)

    # Standing-instruction destination (only required when kind = standing_instruction).
    destination_account_number = db.Column(db.String(20), nullable=True)
    destination_bank_code = db.Column(db.String(20), nullable=True)
    destination_account_name = db.Column(db.String(200), nullable=True)
    pin_required = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    user = db.relationship(
        'User',
        backref=db.backref('subscriptions', lazy='dynamic', cascade='all, delete-orphan'),
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'kind': self.kind,
            'name': self.name,
            'description': self.description,
            'amount': float(self.amount) if self.amount is not None else 0.0,
            'currency': self.currency,
            'cadence': self.cadence,
            'next_charge_at': self.next_charge_at.isoformat() if self.next_charge_at else None,
            'last_charged_at': self.last_charged_at.isoformat() if self.last_charged_at else None,
            'status': self.status,
            'counterparty_type': self.counterparty_type,
            'counterparty_id': self.counterparty_id,
            'source_bill_id': self.source_bill_id,
            'destination_account_number': self.destination_account_number,
            'destination_bank_code': self.destination_bank_code,
            'destination_account_name': self.destination_account_name,
            'pin_required': self.pin_required,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
