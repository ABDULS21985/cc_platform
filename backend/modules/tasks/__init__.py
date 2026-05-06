"""
Background Tasks Module
Handles async processing with Celery.
"""
from modules.tasks.celery_app import celery
from modules.tasks.subscription_tasks import process_due_subscriptions
from modules.tasks.verification_tasks import (
    check_pending_verifications,
    process_bvn_verification,
    process_nin_verification,
)

__all__ = [
    'celery',
    'process_bvn_verification',
    'process_nin_verification',
    'check_pending_verifications',
    'process_due_subscriptions',
]
