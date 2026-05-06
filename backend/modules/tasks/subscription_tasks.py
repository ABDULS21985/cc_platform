"""
Celery tasks for scheduled subscription / standing-instruction execution.

Cron entry point that drives subscription charges. Per-row charge logic
lives in :class:`SubscriptionService.charge_one`; the task here is
intentionally thin — it just finds due rows and dispatches.

Key production guarantees:
  * Idempotent on retry — a row is only re-fired when its `next_charge_at`
    is still <= now AND status is still `active`. `charge_one` rolls
    `next_charge_at` forward atomically, so successful charges cannot
    double-fire on the next tick.
  * Per-row failure isolation — one bad row never kills the batch.
  * Concurrency-safe on PostgreSQL via `SELECT ... FOR UPDATE SKIP LOCKED`
    at the repository layer; SQLite (test) falls back to plain SELECT.
"""
import logging
from datetime import datetime
from typing import Any, Dict

from modules.tasks.app_context import get_flask_app
from modules.tasks.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(name='tasks.process_due_subscriptions', bind=True, max_retries=3)
def process_due_subscriptions(self) -> Dict[str, Any]:
    """Charge all subscriptions / standing-instructions that are due.

    Returns a summary dict ``{processed, succeeded, failed, errors}`` for
    monitoring / Flower.
    """
    app = get_flask_app()
    with app.app_context():
        return _run_due_batch()


def _run_due_batch(limit: int = 100) -> Dict[str, Any]:
    """Inner runner kept separate so unit tests can call it without Celery."""
    # Local imports keep Celery worker startup cheap and avoid circular
    # imports during Flask app construction.
    from modules.subscriptions.repositories.subscription_repository import (
        SubscriptionRepository,
    )
    from modules.subscriptions.services.subscription_service import (
        SubscriptionExecutionError,
        SubscriptionService,
    )

    now = datetime.utcnow()
    repo = SubscriptionRepository()
    service = SubscriptionService()

    logger.info('subscriptions.cron.start', extra={'now': now.isoformat()})

    try:
        due = repo.find_due(limit=limit, now=now, for_update=True)
    except Exception:  # noqa: BLE001
        logger.exception('subscriptions.cron.find_due_failed')
        return {
            'processed': 0,
            'succeeded': 0,
            'failed': 0,
            'errors': ['find_due_failed'],
        }

    succeeded = 0
    failed = 0
    errors = []

    for item in due:
        try:
            service.charge_one(item.id, actor='cron', now=now)
            succeeded += 1
            logger.info(
                'subscriptions.cron.row.success',
                extra={'subscription_id': item.id, 'kind': item.kind},
            )
        except SubscriptionExecutionError as exc:
            failed += 1
            errors.append(
                {'subscription_id': item.id, 'code': exc.code, 'error': str(exc)}
            )
            logger.warning(
                'subscriptions.cron.row.failed',
                extra={
                    'subscription_id': item.id,
                    'kind': getattr(item, 'kind', None),
                    'code': exc.code,
                    'error': str(exc),
                },
            )
        except Exception as exc:  # noqa: BLE001 — never let one row kill the batch
            failed += 1
            errors.append(
                {'subscription_id': item.id, 'code': 'unhandled', 'error': str(exc)}
            )
            logger.error(
                'subscriptions.cron.row.unhandled',
                extra={'subscription_id': item.id, 'error': str(exc)},
                exc_info=True,
            )

    summary = {
        'processed': len(due),
        'succeeded': succeeded,
        'failed': failed,
        'errors': errors,
    }
    logger.info('subscriptions.cron.end', extra=summary)
    return summary
