"""Unit tests for SubscriptionService — list/create/update_status/delete."""

from unittest.mock import MagicMock

from modules.subscriptions.models.subscription import (
    SubscriptionCadence,
    SubscriptionKind,
    SubscriptionStatus,
)
from modules.subscriptions.services.subscription_service import SubscriptionService


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
            },
        )
        assert status == 201
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
