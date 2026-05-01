"""
Background Tasks Module
Handles async processing with Celery.
"""
from modules.tasks.celery_app import celery
from modules.tasks.verification_tasks import (
    process_bvn_verification,
    process_nin_verification,
    check_pending_verifications
)

__all__ = [
    'celery',
    'process_bvn_verification',
    'process_nin_verification',
    'check_pending_verifications'
]
