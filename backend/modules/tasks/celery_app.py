"""
Celery Application Configuration
Handles background job processing for long-running tasks
"""
import os
import ssl
from celery import Celery
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def make_celery() -> Celery:
    """
    Create and configure Celery application

    Returns:
        Configured Celery instance
    """
    # Get Redis URL from environment (same Redis instance for sessions and Celery)
    redis_url = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')

    # SSL configuration for rediss:// URLs (Upstash, Redis Cloud, etc.)
    broker_use_ssl = None
    redis_backend_use_ssl = None

    if redis_url.startswith('rediss://'):
        # ✅ Use CERT_REQUIRED for production security
        # Managed Redis providers (Upstash) have valid SSL certificates
        ssl_settings = {
            'ssl_cert_reqs': ssl.CERT_REQUIRED,  # Validate SSL certificates
            'ssl_check_hostname': True,  # Verify hostname matches certificate
        }
        broker_use_ssl = ssl_settings
        redis_backend_use_ssl = ssl_settings

    # Create Celery app
    celery_app = Celery(
        'ccpay_tasks',
        broker=redis_url,
        backend=redis_url,
        include=[
            'modules.tasks.verification_tasks',
            'modules.tasks.notification_tasks',
            'modules.tasks.subscription_tasks',
        ]
    )
    
    # Configure Celery
    celery_app.conf.update(
        # Serialization
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',

        # Timezone
        timezone='Africa/Lagos',
        enable_utc=True,

        # Task execution
        task_track_started=True,
        task_time_limit=300,  # 5 minutes hard limit
        task_soft_time_limit=240,  # 4 minutes soft limit
        task_acks_late=True,  # Acknowledge after task completion
        worker_prefetch_multiplier=1,  # Process one task at a time

        # Retry configuration
        task_reject_on_worker_lost=True,
        task_acks_on_failure_or_timeout=True,

        # Result backend
        result_expires=3600,  # Results expire after 1 hour

        # SSL configuration for broker and backend
        broker_use_ssl=broker_use_ssl,
        redis_backend_use_ssl=redis_backend_use_ssl,

        # ✅ Broker connection retry on startup (required for Celery 6.0+)
        broker_connection_retry_on_startup=True,

        # Logging
        worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
        worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s] [%(task_name)s(%(task_id)s)] %(message)s',

        beat_schedule={
            'execute-due-subscriptions-every-5-minutes': {
                'task': 'modules.tasks.subscription_tasks.execute_due_subscriptions',
                'schedule': 300.0,
                'args': (100,),
            },
        },
    )
    
    return celery_app


# Create global Celery instance
celery = make_celery()


if __name__ == '__main__':
    # Start worker: celery -A modules.tasks.celery_app worker --loglevel=info
    celery.start()
