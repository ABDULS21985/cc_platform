"""Scheduled execution for subscriptions and standing instructions."""
import calendar
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, Optional

from modules.auth_v2.extensions import db
from modules.community.services.payment_intent_service import PaymentIntentService
from modules.subscriptions.models.subscription import (
    Subscription,
    SubscriptionCadence,
    SubscriptionKind,
    SubscriptionStatus,
)
from modules.subscriptions.repositories.subscription_repository import SubscriptionRepository
from modules.wallet.services.withdrawal_service import WithdrawalService

logger = logging.getLogger(__name__)


class SubscriptionExecutionService:
    """Find and execute due active subscription rows."""

    RETRY_DELAY = timedelta(hours=1)

    def __init__(self, repo: Optional[SubscriptionRepository] = None):
        self.repo = repo or SubscriptionRepository()
        self.payment_service = PaymentIntentService()
        self.withdrawal_service = WithdrawalService()

    def execute_due(self, *, now: Optional[datetime] = None, limit: int = 100) -> Dict[str, Any]:
        now = now or datetime.utcnow()
        due = self.repo.list_due_active(now, limit=limit)
        results = [self.execute_one(item, now=now) for item in due]
        return {
            'success': True,
            'checked': len(due),
            'executed': sum(1 for r in results if r.get('success')),
            'failed': sum(1 for r in results if not r.get('success')),
            'results': results,
        }

    def execute_one(self, item: Subscription, *, now: Optional[datetime] = None) -> Dict[str, Any]:
        now = now or datetime.utcnow()
        if item.status != SubscriptionStatus.ACTIVE:
            return {'success': False, 'subscription_id': item.id, 'error': 'not_active'}

        if item.end_at and now > item.end_at:
            self.repo.update(item.id, status=SubscriptionStatus.CANCELLED, next_charge_at=None)
            return {'success': True, 'subscription_id': item.id, 'status': 'cancelled'}

        try:
            result = self._execute_work(item, now)
            next_charge_at = self._next_charge_at(item.next_charge_at or now, item.cadence)
            status = item.status
            if item.end_at and next_charge_at > item.end_at:
                next_charge_at = None
                status = SubscriptionStatus.CANCELLED

            self.repo.update(
                item.id,
                last_charged_at=now,
                next_charge_at=next_charge_at,
                status=status,
                failure_count=0,
                last_failure_at=None,
                last_failure_reason=None,
                last_execution_reference=result.get('reference') or result.get('transaction_reference'),
            )
            return {
                'success': True,
                'subscription_id': item.id,
                'next_charge_at': next_charge_at.isoformat() if next_charge_at else None,
                'result': result,
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning("subscription execution failed for %s: %s", item.id, exc, exc_info=True)
            try:
                self.repo.update(
                    item.id,
                    failure_count=(item.failure_count or 0) + 1,
                    last_failure_at=now,
                    last_failure_reason=str(exc)[:1000],
                    next_charge_at=now + self.RETRY_DELAY,
                )
            except Exception:
                db.session.rollback()
                logger.error("failed to record subscription execution failure", exc_info=True)
            return {'success': False, 'subscription_id': item.id, 'error': str(exc)}

    def _execute_work(self, item: Subscription, now: datetime) -> Dict[str, Any]:
        amount = Decimal(str(item.amount))
        idempotency_key = f"subscription:{item.id}:{(item.next_charge_at or now).isoformat()}"

        if item.kind == SubscriptionKind.SUBSCRIPTION:
            if not item.source_bill_id:
                raise ValueError('Subscription has no source bill to charge')
            result, error = self.payment_service.pay_community_bill(
                bill_id=item.source_bill_id,
                user_id=item.user_id,
                amount=amount,
                payment_method='wallet',
                require_pin=False,
                idempotency_key=idempotency_key,
            )
            if error:
                raise ValueError(error)
            return {
                'transaction_id': result.get('transaction_id'),
                'reference': str(result.get('transaction_id') or ''),
                'status': result.get('status'),
            }

        if item.kind == SubscriptionKind.STANDING_INSTRUCTION:
            result = self.withdrawal_service.initiate_scheduled_withdrawal(
                user_id=item.user_id,
                amount=amount,
                bank_code=item.destination_bank_code or '',
                account_number=item.destination_account_number or '',
                account_name=item.destination_account_name,
                note=item.description or item.name,
                idempotency_key=idempotency_key,
            )
            return {
                'transaction_id': result.get('transaction_id'),
                'reference': result.get('reference'),
                'status': result.get('status'),
            }

        raise ValueError(f'Unsupported subscription kind: {item.kind}')

    def _next_charge_at(self, current: datetime, cadence: str) -> datetime:
        if cadence == SubscriptionCadence.WEEKLY:
            return current + timedelta(weeks=1)
        if cadence == SubscriptionCadence.QUARTERLY:
            return self._add_months(current, 3)
        if cadence == SubscriptionCadence.YEARLY:
            return self._add_months(current, 12)
        return self._add_months(current, 1)

    def _add_months(self, value: datetime, months: int) -> datetime:
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        day = min(value.day, calendar.monthrange(year, month)[1])
        return value.replace(year=year, month=month, day=day)
