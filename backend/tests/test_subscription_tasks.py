"""Unit tests for the subscription cron task.

These tests exercise the inner ``_run_due_batch`` helper directly so we
don't need a running Celery broker. They patch the repository and service
to verify that:

  * paused / cancelled rows are skipped (``find_due`` already filters
    them, so we assert no charge call happens for them).
  * a thrown ``SubscriptionExecutionError`` from one row is captured in
    the failure summary without aborting the rest of the batch.
  * the summary dict shape matches the documented contract.
"""
from unittest.mock import MagicMock, patch

from modules.subscriptions.services.subscription_service import (
    SubscriptionExecutionError,
)
from modules.tasks import subscription_tasks


def _row(id_, kind='subscription', status='active'):
    item = MagicMock()
    item.id = id_
    item.kind = kind
    item.status = status
    return item


class TestRunDueBatch:
    def test_empty_due_returns_zeroed_summary(self):
        with patch.object(
            subscription_tasks, 'SubscriptionRepository', create=True
        ), patch(
            'modules.subscriptions.repositories.subscription_repository.SubscriptionRepository.find_due',
            return_value=[],
        ), patch(
            'modules.subscriptions.services.subscription_service.SubscriptionService.charge_one'
        ) as charge_one:
            summary = subscription_tasks._run_due_batch(limit=10)

        assert summary['processed'] == 0
        assert summary['succeeded'] == 0
        assert summary['failed'] == 0
        assert summary['errors'] == []
        charge_one.assert_not_called()

    def test_only_due_active_rows_are_charged(self):
        # find_due is responsible for filtering paused/cancelled rows.
        # We assert: rows it returns get charge_one called; rows it
        # excludes (because we don't return them) do not.
        active_a = _row(1)
        active_b = _row(2)

        with patch(
            'modules.subscriptions.repositories.subscription_repository.SubscriptionRepository.find_due',
            return_value=[active_a, active_b],
        ), patch(
            'modules.subscriptions.services.subscription_service.SubscriptionService.charge_one'
        ) as charge_one:
            summary = subscription_tasks._run_due_batch(limit=10)

        assert charge_one.call_count == 2
        called_ids = {call.args[0] for call in charge_one.call_args_list}
        assert called_ids == {1, 2}
        assert summary['processed'] == 2
        assert summary['succeeded'] == 2
        assert summary['failed'] == 0

    def test_one_failing_row_is_isolated_in_summary(self):
        good = _row(1)
        bad = _row(2)

        def charge_side_effect(sub_id, *args, **kwargs):
            if sub_id == 2:
                raise SubscriptionExecutionError(
                    'wallet says no', code='bill_payment_failed'
                )
            return {'id': sub_id}

        with patch(
            'modules.subscriptions.repositories.subscription_repository.SubscriptionRepository.find_due',
            return_value=[good, bad],
        ), patch(
            'modules.subscriptions.services.subscription_service.SubscriptionService.charge_one',
            side_effect=charge_side_effect,
        ):
            summary = subscription_tasks._run_due_batch(limit=10)

        assert summary['processed'] == 2
        assert summary['succeeded'] == 1
        assert summary['failed'] == 1
        assert len(summary['errors']) == 1
        err = summary['errors'][0]
        assert err['subscription_id'] == 2
        assert err['code'] == 'bill_payment_failed'

    def test_unhandled_exception_is_caught_and_recorded(self):
        bad = _row(7)
        with patch(
            'modules.subscriptions.repositories.subscription_repository.SubscriptionRepository.find_due',
            return_value=[bad],
        ), patch(
            'modules.subscriptions.services.subscription_service.SubscriptionService.charge_one',
            side_effect=RuntimeError('boom'),
        ):
            summary = subscription_tasks._run_due_batch(limit=10)

        assert summary['processed'] == 1
        assert summary['succeeded'] == 0
        assert summary['failed'] == 1
        assert summary['errors'][0]['code'] == 'unhandled'

    def test_find_due_failure_returns_error_summary(self):
        with patch(
            'modules.subscriptions.repositories.subscription_repository.SubscriptionRepository.find_due',
            side_effect=RuntimeError('db down'),
        ):
            summary = subscription_tasks._run_due_batch(limit=10)

        assert summary['processed'] == 0
        assert summary['failed'] == 0
        assert 'find_due_failed' in summary['errors']


class TestBeatSchedule:
    def test_beat_schedule_registers_subscription_cron(self):
        from modules.tasks.celery_app import celery

        beat = celery.conf.beat_schedule or {}
        assert 'process-due-subscriptions' in beat
        assert beat['process-due-subscriptions']['task'] == 'tasks.process_due_subscriptions'
        # Either crontab or numeric schedule — both are acceptable, but
        # numeric must be 300 (5 min) per the spec.
        sched = beat['process-due-subscriptions']['schedule']
        assert sched == 300.0 or hasattr(sched, 'minute')


class TestCeleryTaskRegistration:
    def test_task_is_registered_under_documented_name(self):
        from modules.tasks.celery_app import celery

        assert 'tasks.process_due_subscriptions' in celery.tasks
