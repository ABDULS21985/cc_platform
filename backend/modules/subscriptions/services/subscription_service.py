"""
Subscription Service — business logic for /v2/subscriptions and
/v2/standing-instructions.

Scheduled execution lives in `modules.tasks.subscription_tasks` which calls
:meth:`SubscriptionService.charge_one` per due row. Keeping the per-row
business logic on the service (not the cron) lets us unit-test the
charge/rollover path without spinning up Celery.
"""
import calendar
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, Optional, Tuple

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

try:  # pragma: no cover - dateutil is a transitive Celery dep, prefer it
    from dateutil.relativedelta import relativedelta  # type: ignore
    _HAS_RELATIVEDELTA = True
except Exception:  # pragma: no cover
    relativedelta = None  # type: ignore
    _HAS_RELATIVEDELTA = False


class SubscriptionExecutionError(RuntimeError):
    """Raised when a subscription row cannot be charged.

    Use a typed exception so the cron can record per-row failure reasons
    and so callers don't accidentally treat a routing miss as success.
    """

    def __init__(self, message: str, *, code: str = 'execution_failed'):
        super().__init__(message)
        self.code = code


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

    # ------------------------------------------------------------------
    # Scheduled execution
    # ------------------------------------------------------------------

    def charge_one(
        self,
        subscription_id: int,
        *,
        actor: str = 'cron',
        now: Optional[datetime] = None,
        bill_payment_service=None,
        withdrawal_service=None,
    ) -> Dict[str, Any]:
        """Charge a single subscription and roll its cadence forward.

        This is the per-row entry point used by the Celery cron and is
        intentionally synchronous so it can be unit-tested with mocked
        wallet adapters.

        Idempotency: callers must rely on `status == 'active'` and
        `next_charge_at <= now` as the gating predicate; we re-check both
        here defensively. After a successful charge `next_charge_at` is
        rolled forward by the cadence so the next tick will not re-fire.

        Raises:
            SubscriptionExecutionError on any unrecoverable failure
            (no matching wallet route, wallet service raised, missing
            destination data, etc.). The cron wraps this per-row.
        """
        now = now or datetime.utcnow()

        item = self.repo.find_by_id(subscription_id)
        if not item:
            raise SubscriptionExecutionError(
                f'Subscription {subscription_id} not found',
                code='not_found',
            )
        if item.status != SubscriptionStatus.ACTIVE:
            raise SubscriptionExecutionError(
                f'Subscription {subscription_id} is not active (status={item.status})',
                code='not_active',
            )
        if item.next_charge_at is None or item.next_charge_at > now:
            raise SubscriptionExecutionError(
                f'Subscription {subscription_id} is not due yet',
                code='not_due',
            )

        logger.info(
            'subscription.charge.start',
            extra={
                'subscription_id': item.id,
                'user_id': item.user_id,
                'kind': item.kind,
                'cadence': item.cadence,
                'actor': actor,
            },
        )

        amount = Decimal(str(item.amount))
        idempotency_key = (
            f'subscription:{item.id}:{item.next_charge_at.isoformat()}'
        )

        try:
            charge_result = self._dispatch_charge(
                item,
                amount=amount,
                idempotency_key=idempotency_key,
                bill_payment_service=bill_payment_service,
                withdrawal_service=withdrawal_service,
            )
        except SubscriptionExecutionError as exc:
            self._record_execution_failure(item, now=now, reason=str(exc))
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                'subscription.charge.failed',
                extra={'subscription_id': item.id, 'error': str(exc)},
                exc_info=True,
            )
            self._record_execution_failure(item, now=now, reason=str(exc))
            raise SubscriptionExecutionError(str(exc), code='wallet_error') from exc

        next_charge_at = self._next_charge_at(item.next_charge_at, item.cadence)
        new_status = item.status
        if item.end_at and next_charge_at and next_charge_at > item.end_at:
            next_charge_at = None
            new_status = SubscriptionStatus.CANCELLED

        update_kwargs: Dict[str, Any] = {
            'last_charged_at': now,
            'next_charge_at': next_charge_at,
            'status': new_status,
        }
        # Only touch the failure/reference columns when present on the
        # model (older deployments may not have them yet).
        if hasattr(Subscription, 'failure_count'):
            update_kwargs['failure_count'] = 0
        if hasattr(Subscription, 'last_failure_at'):
            update_kwargs['last_failure_at'] = None
        if hasattr(Subscription, 'last_failure_reason'):
            update_kwargs['last_failure_reason'] = None
        if hasattr(Subscription, 'last_execution_reference'):
            ref = (
                charge_result.get('reference')
                or charge_result.get('transaction_reference')
                or str(charge_result.get('transaction_id') or '')
                or None
            )
            update_kwargs['last_execution_reference'] = ref

        updated = self.repo.update(item.id, **update_kwargs)

        logger.info(
            'subscription.charge.success',
            extra={
                'subscription_id': item.id,
                'next_charge_at': (
                    next_charge_at.isoformat() if next_charge_at else None
                ),
                'cadence': item.cadence,
                'actor': actor,
            },
        )
        return updated.to_dict() if updated is not None else {}

    def _dispatch_charge(
        self,
        item: Subscription,
        *,
        amount: Decimal,
        idempotency_key: str,
        bill_payment_service=None,
        withdrawal_service=None,
    ) -> Dict[str, Any]:
        """Route a due row to the appropriate wallet service.

        Raises SubscriptionExecutionError if no clean route exists for the
        kind/counterparty combo — we *never* silently succeed.
        """
        if item.kind == SubscriptionKind.SUBSCRIPTION:
            if not item.source_bill_id:
                raise SubscriptionExecutionError(
                    'Subscription has no source_bill_id to charge',
                    code='missing_source_bill',
                )
            svc = bill_payment_service or self._default_bill_payment_service()
            result, error = svc.pay_community_bill(
                bill_id=item.source_bill_id,
                user_id=item.user_id,
                amount=amount,
                payment_method='wallet',
                require_pin=False,
                idempotency_key=idempotency_key,
            )
            if error:
                raise SubscriptionExecutionError(error, code='bill_payment_failed')
            return result or {}

        if item.kind == SubscriptionKind.STANDING_INSTRUCTION:
            if not (
                item.destination_account_number and item.destination_bank_code
            ):
                raise SubscriptionExecutionError(
                    'Standing instruction is missing destination details',
                    code='missing_destination',
                )
            svc = withdrawal_service or self._default_withdrawal_service()
            return svc.initiate_scheduled_withdrawal(
                user_id=item.user_id,
                amount=amount,
                bank_code=item.destination_bank_code,
                account_number=item.destination_account_number,
                account_name=item.destination_account_name,
                note=item.description or item.name,
                idempotency_key=idempotency_key,
            )

        raise SubscriptionExecutionError(
            f'Unsupported subscription kind: {item.kind}',
            code='unsupported_kind',
        )

    def _record_execution_failure(
        self,
        item: Subscription,
        *,
        now: datetime,
        reason: str,
    ) -> None:
        """Persist failure metadata and defer the next retry window."""
        update_kwargs: Dict[str, Any] = {'next_charge_at': now + timedelta(hours=1)}
        if hasattr(Subscription, 'failure_count'):
            raw_count = getattr(item, 'failure_count', 0) or 0
            if not isinstance(raw_count, int):
                raw_count = 0
            update_kwargs['failure_count'] = raw_count + 1
        if hasattr(Subscription, 'last_failure_at'):
            update_kwargs['last_failure_at'] = now
        if hasattr(Subscription, 'last_failure_reason'):
            update_kwargs['last_failure_reason'] = str(reason)[:1000]

        try:
            self.repo.update(item.id, **update_kwargs)
        except Exception:  # noqa: BLE001
            logger.error(
                'subscription.charge.failure_record_failed',
                extra={'subscription_id': getattr(item, 'id', None)},
                exc_info=True,
            )

    def _default_bill_payment_service(self):
        # Imported lazily to avoid a circular import between the
        # subscriptions and community modules.
        from modules.community.services.payment_intent_service import (
            PaymentIntentService,
        )

        return PaymentIntentService()

    def _default_withdrawal_service(self):
        from modules.wallet.services.withdrawal_service import WithdrawalService

        return WithdrawalService()

    def _next_charge_at(
        self, current: datetime, cadence: str
    ) -> Optional[datetime]:
        """Roll `next_charge_at` forward by one cadence step.

        Uses dateutil.relativedelta when available so monthly/yearly
        rollovers handle month-end correctly (e.g. Jan 31 → Feb 28).
        Falls back to fixed-day arithmetic otherwise.
        """
        if cadence == SubscriptionCadence.WEEKLY:
            return current + timedelta(weeks=1)

        months = {
            SubscriptionCadence.MONTHLY: 1,
            SubscriptionCadence.QUARTERLY: 3,
            SubscriptionCadence.YEARLY: 12,
        }.get(cadence)

        if months is None:
            # Unknown cadence — default to monthly rather than raise so a
            # legacy row can't poison the whole tick.
            months = 1

        if _HAS_RELATIVEDELTA:
            return current + relativedelta(months=months)
        return self._add_months_calendar(current, months)

    @staticmethod
    def _add_months_calendar(value: datetime, months: int) -> datetime:
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        day = min(value.day, calendar.monthrange(year, month)[1])
        return value.replace(year=year, month=month, day=day)
