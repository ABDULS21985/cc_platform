"""Unit tests for SubscriptionService — list/create/update_status/delete/charge_one."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

from modules.subscriptions.models.subscription import (
    SubscriptionCadence,
    SubscriptionKind,
    SubscriptionStatus,
)
from modules.subscriptions.services.subscription_service import (
    SubscriptionExecutionError,
    SubscriptionService,
)


def _make_service():
    svc = SubscriptionService()
    svc.repo = MagicMock()
    return svc


class TestList:
    def test_list_rejects_unknown_kind(self):
        svc = _make_service()
        result, status = svc.list_for_user(user_id=1, kind='bogus')
        assert status == 400
        assert result['code'] == 'INVALID_KIND'

    def test_list_rejects_unknown_status(self):
        svc = _make_service()
        result, status = svc.list_for_user(user_id=1, status='ghosted')
        assert status == 400
        assert result['code'] == 'INVALID_STATUS'

    def test_list_returns_serialized_subscriptions(self):
        svc = _make_service()
        item = MagicMock()
        item.to_dict.return_value = {'id': 1, 'name': 'X'}
        svc.repo.list_for_user.return_value = [item]

        result, status = svc.list_for_user(user_id=1)
        assert status == 200
        assert result['data']['total'] == 1
        assert result['data']['subscriptions'] == [{'id': 1, 'name': 'X'}]


class TestCreate:
    def test_subscription_create_happy_path(self):
        svc = _make_service()
        created = MagicMock()
        created.to_dict.return_value = {'id': 1}
        svc.repo.create.return_value = created

        result, status = svc.create(
            user_id=1,
            data={'name': 'Yalleman', 'amount': 120, 'cadence': 'monthly'},
        )
        assert status == 201
        kwargs = svc.repo.create.call_args.kwargs
        assert kwargs['kind'] == SubscriptionKind.SUBSCRIPTION
        assert kwargs['pin_required'] is False

    def test_standing_instruction_requires_destination(self):
        svc = _make_service()
        result, status = svc.create(
            user_id=1,
            data={
                'name': 'Estate fund',
                'amount': 18500,
                'cadence': 'monthly',
                'kind': SubscriptionKind.STANDING_INSTRUCTION,
            },
        )
        assert status == 400
        assert result['code'] == 'MISSING_FIELDS'
        svc.repo.create.assert_not_called()

    def test_standing_instruction_marks_pin_required(self):
        svc = _make_service()
        svc.pin_service = MagicMock()
        created = MagicMock()
        created.to_dict.return_value = {'id': 2}
        svc.repo.create.return_value = created

        result, status = svc.create(
            user_id=1,
            data={
                'name': 'Estate fund',
                'amount': 18500,
                'cadence': 'monthly',
                'kind': SubscriptionKind.STANDING_INSTRUCTION,
                'destination_account_number': '1234567890',
                'destination_bank_code': '044',
                'destination_account_name': 'Lekki HOA',
                'pin': '1234',
            },
        )
        assert status == 201
        svc.pin_service.verify_pin.assert_called_once_with(user_id=1, pin='1234')
        kwargs = svc.repo.create.call_args.kwargs
        assert kwargs['kind'] == SubscriptionKind.STANDING_INSTRUCTION
        assert kwargs['pin_required'] is True


class TestUpdateStatus:
    def test_unknown_status_returns_400(self):
        svc = _make_service()
        result, status = svc.update_status(sub_id=1, user_id=1, status='ghost')
        assert status == 400

    def test_other_users_subscription_returns_404(self):
        svc = _make_service()
        item = MagicMock()
        item.user_id = 99
        svc.repo.find_by_id.return_value = item

        result, status = svc.update_status(sub_id=1, user_id=1, status='paused')
        assert status == 404

    def test_pause_updates_and_returns_subscription(self):
        svc = _make_service()
        item = MagicMock()
        item.user_id = 1
        svc.repo.find_by_id.return_value = item
        updated = MagicMock()
        updated.to_dict.return_value = {'id': 1, 'status': 'paused'}
        svc.repo.update.return_value = updated

        result, status = svc.update_status(sub_id=1, user_id=1, status='paused')
        assert status == 200
        svc.repo.update.assert_called_once_with(1, status='paused')


class TestDelete:
    def test_other_users_subscription_returns_404(self):
        svc = _make_service()
        item = MagicMock()
        item.user_id = 99
        svc.repo.find_by_id.return_value = item

        result, status = svc.delete(sub_id=1, user_id=1)
        assert status == 404
        svc.repo.delete.assert_not_called()

    def test_owner_can_delete(self):
        svc = _make_service()
        item = MagicMock()
        item.user_id = 1
        svc.repo.find_by_id.return_value = item

        result, status = svc.delete(sub_id=1, user_id=1)
        assert status == 200
        svc.repo.delete.assert_called_once_with(1)


class TestCreatePersistsSourceBillId:
    """Regression: create() must forward source_bill_id to the repo."""

    def test_create_passes_source_bill_id(self):
        svc = _make_service()
        created = MagicMock()
        created.to_dict.return_value = {'id': 1}
        svc.repo.create.return_value = created

        result, status = svc.create(
            user_id=1,
            data={
                'name': 'Lekki HOA dues',
                'amount': 18500,
                'cadence': 'monthly',
                'source_bill_id': 4242,
                'counterparty_type': 'community',
                'counterparty_id': 7,
            },
        )
        assert status == 201
        kwargs = svc.repo.create.call_args.kwargs
        assert kwargs['source_bill_id'] == 4242
        assert kwargs['counterparty_type'] == 'community'
        assert kwargs['counterparty_id'] == 7

    def test_create_without_source_bill_id_passes_none(self):
        svc = _make_service()
        created = MagicMock()
        created.to_dict.return_value = {'id': 2}
        svc.repo.create.return_value = created

        svc.create(
            user_id=1,
            data={'name': 'Yalla', 'amount': 100, 'cadence': 'weekly'},
        )
        kwargs = svc.repo.create.call_args.kwargs
        assert kwargs['source_bill_id'] is None


def _make_due_subscription(**overrides):
    """Build a MagicMock that quacks like an active, due Subscription row."""
    now = datetime.utcnow()
    item = MagicMock()
    item.id = overrides.get('id', 11)
    item.user_id = overrides.get('user_id', 7)
    item.kind = overrides.get('kind', SubscriptionKind.SUBSCRIPTION)
    item.status = overrides.get('status', SubscriptionStatus.ACTIVE)
    item.amount = overrides.get('amount', 1500)
    item.cadence = overrides.get('cadence', SubscriptionCadence.MONTHLY)
    item.next_charge_at = overrides.get('next_charge_at', now - timedelta(minutes=1))
    item.end_at = overrides.get('end_at', None)
    item.source_bill_id = overrides.get('source_bill_id', 99)
    item.destination_account_number = overrides.get('destination_account_number')
    item.destination_bank_code = overrides.get('destination_bank_code')
    item.destination_account_name = overrides.get('destination_account_name')
    item.description = overrides.get('description', 'Test sub')
    item.name = overrides.get('name', 'Test sub')
    return item


class TestChargeOne:
    """Per-row charge entrypoint used by the cron."""

    def test_subscription_kind_charges_via_bill_payment_service(self):
        svc = _make_service()
        item = _make_due_subscription()
        svc.repo.find_by_id.return_value = item
        updated = MagicMock()
        updated.to_dict.return_value = {'id': item.id, 'status': 'active'}
        svc.repo.update.return_value = updated

        bill_svc = MagicMock()
        bill_svc.pay_community_bill.return_value = (
            {'transaction_id': 555, 'reference': 'BIL-555', 'status': 'successful'},
            None,
        )

        result = svc.charge_one(item.id, bill_payment_service=bill_svc)

        bill_svc.pay_community_bill.assert_called_once()
        kwargs = bill_svc.pay_community_bill.call_args.kwargs
        assert kwargs['bill_id'] == 99
        assert kwargs['require_pin'] is False
        assert result == {'id': item.id, 'status': 'active'}

    def test_subscription_kind_propagates_wallet_failure(self):
        svc = _make_service()
        item = _make_due_subscription()
        svc.repo.find_by_id.return_value = item

        bill_svc = MagicMock()
        bill_svc.pay_community_bill.return_value = (None, 'Insufficient wallet balance')

        with pytest.raises(SubscriptionExecutionError) as exc_info:
            svc.charge_one(item.id, bill_payment_service=bill_svc)
        assert exc_info.value.code == 'bill_payment_failed'
        # Must NOT mark as charged or roll forward when the wallet refused.
        svc.repo.update.assert_not_called()

    def test_subscription_kind_raises_when_no_source_bill(self):
        svc = _make_service()
        item = _make_due_subscription(source_bill_id=None)
        svc.repo.find_by_id.return_value = item

        with pytest.raises(SubscriptionExecutionError) as exc_info:
            svc.charge_one(item.id)
        assert exc_info.value.code == 'missing_source_bill'

    def test_charge_one_advances_next_charge_at_by_cadence_monthly(self):
        svc = _make_service()
        prev_due = datetime(2026, 1, 31, 9, 0, 0)
        item = _make_due_subscription(
            cadence=SubscriptionCadence.MONTHLY, next_charge_at=prev_due
        )
        svc.repo.find_by_id.return_value = item
        svc.repo.update.return_value = MagicMock(to_dict=lambda: {'id': item.id})

        bill_svc = MagicMock()
        bill_svc.pay_community_bill.return_value = ({'transaction_id': 1}, None)

        # Force `now` to satisfy the `next_charge_at <= now` check.
        svc.charge_one(
            item.id,
            now=prev_due + timedelta(seconds=1),
            bill_payment_service=bill_svc,
        )

        update_kwargs = svc.repo.update.call_args.kwargs
        # relativedelta clamps Jan 31 to last day of Feb (28 or 29).
        next_charge_at = update_kwargs['next_charge_at']
        assert next_charge_at.month == 2
        assert next_charge_at.year == 2026
        assert next_charge_at.day in (28, 29)

    def test_charge_one_advances_next_charge_at_by_cadence_weekly(self):
        svc = _make_service()
        prev_due = datetime(2026, 5, 1, 12, 0, 0)
        item = _make_due_subscription(
            cadence=SubscriptionCadence.WEEKLY, next_charge_at=prev_due
        )
        svc.repo.find_by_id.return_value = item
        svc.repo.update.return_value = MagicMock(to_dict=lambda: {'id': item.id})
        bill_svc = MagicMock()
        bill_svc.pay_community_bill.return_value = ({'transaction_id': 1}, None)

        svc.charge_one(
            item.id,
            now=prev_due + timedelta(seconds=1),
            bill_payment_service=bill_svc,
        )

        update_kwargs = svc.repo.update.call_args.kwargs
        assert update_kwargs['next_charge_at'] == prev_due + timedelta(weeks=1)

    def test_charge_one_skips_paused_rows(self):
        svc = _make_service()
        item = _make_due_subscription(status=SubscriptionStatus.PAUSED)
        svc.repo.find_by_id.return_value = item

        with pytest.raises(SubscriptionExecutionError) as exc_info:
            svc.charge_one(item.id)
        assert exc_info.value.code == 'not_active'

    def test_charge_one_skips_not_yet_due_rows(self):
        svc = _make_service()
        future = datetime.utcnow() + timedelta(days=1)
        item = _make_due_subscription(next_charge_at=future)
        svc.repo.find_by_id.return_value = item

        with pytest.raises(SubscriptionExecutionError) as exc_info:
            svc.charge_one(item.id)
        assert exc_info.value.code == 'not_due'

    def test_charge_one_routes_standing_instruction_to_withdrawal_service(self):
        svc = _make_service()
        item = _make_due_subscription(
            kind=SubscriptionKind.STANDING_INSTRUCTION,
            destination_account_number='1234567890',
            destination_bank_code='044',
            destination_account_name='HOA',
            source_bill_id=None,
        )
        svc.repo.find_by_id.return_value = item
        svc.repo.update.return_value = MagicMock(to_dict=lambda: {'id': item.id})

        wd_svc = MagicMock()
        wd_svc.initiate_scheduled_withdrawal.return_value = {
            'transaction_id': 12,
            'reference': 'SI-12',
            'status': 'pending',
        }

        svc.charge_one(item.id, withdrawal_service=wd_svc)

        wd_svc.initiate_scheduled_withdrawal.assert_called_once()
        kwargs = wd_svc.initiate_scheduled_withdrawal.call_args.kwargs
        assert kwargs['account_number'] == '1234567890'
        assert kwargs['bank_code'] == '044'

    def test_charge_one_standing_instruction_missing_destination_raises(self):
        svc = _make_service()
        item = _make_due_subscription(
            kind=SubscriptionKind.STANDING_INSTRUCTION,
            destination_account_number=None,
            destination_bank_code=None,
            source_bill_id=None,
        )
        svc.repo.find_by_id.return_value = item

        with pytest.raises(SubscriptionExecutionError) as exc_info:
            svc.charge_one(item.id)
        assert exc_info.value.code == 'missing_destination'
