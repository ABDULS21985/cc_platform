"""
Subscription Service — business logic for /v2/subscriptions and
/v2/standing-instructions.

Note: actual scheduled execution (cron tick on next_charge_at) lives in
modules/tasks (planned) and is OUT OF SCOPE for this module — we only
manage the CRUD lifecycle here.
"""
import logging
from typing import Dict, Optional, Tuple

from modules.subscriptions.models.subscription import (
    Subscription,
    SubscriptionCadence,
    SubscriptionKind,
    SubscriptionStatus,
)
from modules.subscriptions.repositories.subscription_repository import (
    SubscriptionRepository,
)

logger = logging.getLogger(__name__)


class SubscriptionService:
    def __init__(self, pin_service=None):
        self.repo = SubscriptionRepository()
        self.pin_service = pin_service

    def _get_pin_service(self):
        if self.pin_service is not None:
            return self.pin_service

        from modules.wallet.services.pin_service import TransactionPinService

        return TransactionPinService()

    def verify_transaction_pin(self, user_id: int, pin: str) -> Tuple[Dict, int]:
        try:
            self._get_pin_service().verify_pin(user_id=user_id, pin=str(pin or ''))
            return (
                {
                    'success': True,
                    'message': 'PIN verified',
                    'data': {'verified': True},
                },
                200,
            )
        except ValueError as exc:
            return (
                {
                    'error': str(exc),
                    'code': 'INVALID_PIN',
                    'success': False,
                    'data': {'verified': False},
                },
                400,
            )

    def list_for_user(
        self,
        user_id: int,
        kind: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[Dict, int]:
        if kind and kind not in SubscriptionKind.ALL:
            return ({'error': 'Invalid kind', 'code': 'INVALID_KIND'}, 400)
        if status and status not in SubscriptionStatus.ALL:
            return ({'error': 'Invalid status', 'code': 'INVALID_STATUS'}, 400)

        items = self.repo.list_for_user(
            user_id, kind=kind, status=status, limit=limit, offset=offset
        )
        return (
            {
                'success': True,
                'message': 'Subscriptions retrieved',
                'data': {
                    'subscriptions': [s.to_dict() for s in items],
                    'total': len(items),
                },
            },
            200,
        )

    def create(self, user_id: int, data: Dict) -> Tuple[Dict, int]:
        # Backend default kind = subscription; standing-instructions
        # endpoint enforces the discriminator before reaching this method.
        kind = data.get('kind', SubscriptionKind.SUBSCRIPTION)
        if kind not in SubscriptionKind.ALL:
            return ({'error': 'Invalid kind', 'code': 'INVALID_KIND'}, 400)

        cadence = data.get('cadence', SubscriptionCadence.MONTHLY)
        if cadence not in SubscriptionCadence.ALL:
            return ({'error': 'Invalid cadence', 'code': 'INVALID_CADENCE'}, 400)

        if kind == SubscriptionKind.STANDING_INSTRUCTION:
            # Standing instructions require destination details and a verified
            # transaction PIN. The PIN is never persisted.
            required = (
                'destination_account_number',
                'destination_bank_code',
                'destination_account_name',
                'pin',
            )
            missing = [k for k in required if not data.get(k)]
            if missing:
                return (
                    {
                        'error': f'Missing required fields: {", ".join(missing)}',
                        'code': 'MISSING_FIELDS',
                    },
                    400,
                )

            pin_result, pin_status = self.verify_transaction_pin(user_id, data.get('pin'))
            if pin_status >= 400:
                return pin_result, pin_status

        item = self.repo.create(
            user_id=user_id,
            kind=kind,
            name=data['name'],
            description=data.get('description'),
            amount=data['amount'],
            currency=data.get('currency', 'NGN'),
            cadence=cadence,
            start_at=data.get('start_at'),
            end_at=data.get('end_at'),
            next_charge_at=data.get('next_charge_at'),
            counterparty_type=data.get('counterparty_type'),
            counterparty_id=data.get('counterparty_id'),
            source_bill_id=data.get('source_bill_id'),
            destination_account_number=data.get('destination_account_number'),
            destination_bank_code=data.get('destination_bank_code'),
            destination_account_name=data.get('destination_account_name'),
            split_member_name=data.get('split_member_name'),
            split_primary_amount=data.get('split_primary_amount'),
            split_secondary_amount=data.get('split_secondary_amount'),
            pin_required=(kind == SubscriptionKind.STANDING_INSTRUCTION),
            status=SubscriptionStatus.ACTIVE,
        )
        return (
            {
                'success': True,
                'message': 'Created',
                'data': {'subscription': item.to_dict()},
            },
            201,
        )

    def update_status(
        self, sub_id: int, user_id: int, status: str, kind: Optional[str] = None
    ) -> Tuple[Dict, int]:
        if status not in SubscriptionStatus.ALL:
            return ({'error': 'Invalid status', 'code': 'INVALID_STATUS'}, 400)

        item = self.repo.find_by_id(sub_id)
        if not item or item.user_id != user_id or (kind and item.kind != kind):
            return ({'error': 'Not found', 'code': 'NOT_FOUND'}, 404)

        updated = self.repo.update(sub_id, status=status)
        return (
            {
                'success': True,
                'message': f'Status set to {status}',
                'data': {'subscription': updated.to_dict()},
            },
            200,
        )

    def delete(self, sub_id: int, user_id: int, kind: Optional[str] = None) -> Tuple[Dict, int]:
        item = self.repo.find_by_id(sub_id)
        if not item or item.user_id != user_id or (kind and item.kind != kind):
            return ({'error': 'Not found', 'code': 'NOT_FOUND'}, 404)
        self.repo.delete(sub_id)
        return ({'success': True, 'message': 'Deleted', 'data': {}}, 200)
