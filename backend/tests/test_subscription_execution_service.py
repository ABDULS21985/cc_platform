"""Unit tests for scheduled subscription execution."""
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

from modules.subscriptions.models.subscription import (
    SubscriptionCadence,
    SubscriptionKind,
    SubscriptionStatus,
)
from modules.subscriptions.services.execution_service import SubscriptionExecutionService


def _item(**overrides):
    data = {
        "id": 7,
        "user_id": 11,
        "kind": SubscriptionKind.SUBSCRIPTION,
        "amount": Decimal("1500.00"),
        "cadence": SubscriptionCadence.MONTHLY,
        "status": SubscriptionStatus.ACTIVE,
        "source_bill_id": 22,
        "next_charge_at": datetime(2026, 5, 1, 9, 0, 0),
        "last_charged_at": None,
        "end_at": None,
        "failure_count": 0,
        "destination_bank_code": None,
        "destination_account_number": None,
        "destination_account_name": None,
        "description": None,
        "name": "Dues",
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _service():
    svc = SubscriptionExecutionService(repo=MagicMock())
    svc.payment_service = MagicMock()
    svc.withdrawal_service = MagicMock()
    return svc


def test_executes_due_subscription_bill_payment_and_advances_schedule():
    svc = _service()
    item = _item()
    svc.payment_service.pay_community_bill.return_value = (
        {"transaction_id": 101, "status": "successful"},
        None,
    )

    result = svc.execute_one(item, now=datetime(2026, 5, 6, 10, 0, 0))

    assert result["success"] is True
    svc.payment_service.pay_community_bill.assert_called_once()
    kwargs = svc.payment_service.pay_community_bill.call_args.kwargs
    assert kwargs["bill_id"] == 22
    assert kwargs["require_pin"] is False
    update_kwargs = svc.repo.update.call_args.kwargs
    assert update_kwargs["last_charged_at"] == datetime(2026, 5, 6, 10, 0, 0)
    assert update_kwargs["next_charge_at"] == datetime(2026, 6, 1, 9, 0, 0)
    assert update_kwargs["failure_count"] == 0


def test_executes_due_standing_instruction_with_withdrawal_service():
    svc = _service()
    item = _item(
        kind=SubscriptionKind.STANDING_INSTRUCTION,
        source_bill_id=None,
        destination_bank_code="044",
        destination_account_number="1234567890",
        destination_account_name="Estate",
    )
    svc.withdrawal_service.initiate_scheduled_withdrawal.return_value = {
        "transaction_id": 55,
        "reference": "SI-55",
        "status": "pending",
    }

    result = svc.execute_one(item, now=datetime(2026, 5, 6, 10, 0, 0))

    assert result["success"] is True
    svc.withdrawal_service.initiate_scheduled_withdrawal.assert_called_once()
    kwargs = svc.withdrawal_service.initiate_scheduled_withdrawal.call_args.kwargs
    assert kwargs["user_id"] == 11
    assert kwargs["bank_code"] == "044"
    assert kwargs["account_number"] == "1234567890"


def test_records_failure_and_defers_retry():
    svc = _service()
    item = _item()
    svc.payment_service.pay_community_bill.return_value = (None, "Insufficient balance")

    result = svc.execute_one(item, now=datetime(2026, 5, 6, 10, 0, 0))

    assert result["success"] is False
    update_kwargs = svc.repo.update.call_args.kwargs
    assert update_kwargs["failure_count"] == 1
    assert update_kwargs["last_failure_reason"] == "Insufficient balance"
    assert update_kwargs["next_charge_at"] == datetime(2026, 5, 6, 11, 0, 0)
