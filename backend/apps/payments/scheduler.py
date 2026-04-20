"""
APScheduler configuration for Django scheduled tasks.
Add this to your Django settings.py to enable scheduled payment syncing.

Installation:
    pip install apscheduler

Usage:
    The scheduler is automatically initialized when Django starts (via apps.py ready() method).
    Run: python manage.py sync_razorpay_payments  # Manual trigger
"""

from django.conf import settings
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

scheduler = None


def init_scheduler():
    """
    Initialize the background scheduler for periodic payment syncs.
    Called from payments app ready() method.
    """
    global scheduler

    if scheduler is not None:
        return

    scheduler = BackgroundScheduler()

    def sync_payments_job():
        """Job to run payment sync every 30 minutes."""
        try:
            logger.info('🔄 [APScheduler] Starting scheduled Razorpay payment sync...')
            call_command('sync_razorpay_payments', '--limit=100', '--verbose')
            logger.info('✓ [APScheduler] Razorpay payment sync completed successfully')
        except Exception as e:
            logger.error(f'✗ [APScheduler] Razorpay payment sync failed: {e}')

    # Add job to run every 30 minutes
    scheduler.add_job(
        sync_payments_job,
        trigger=IntervalTrigger(minutes=30),
        id='sync_razorpay_payments_job',
        name='Sync Razorpay Payments',
        replace_existing=True,  # Replace if already scheduled
        max_instances=1,  # Prevent concurrent executions
    )

    # Start scheduler only in main process (avoid duplicate jobs in development)
    if getattr(settings, 'SCHEDULER_ENABLED', True):
        try:
            scheduler.start()
            logger.info('✓ APScheduler started - Payment sync scheduled for every 30 minutes')
        except RuntimeError:
            # Already running
            pass


def get_scheduler():
    """Get the global scheduler instance."""
    return scheduler


def stop_scheduler():
    """Stop the scheduler (called on Django shutdown)."""
    global scheduler
    if scheduler is not None and scheduler.running:
        scheduler.shutdown()
        logger.info('✓ APScheduler stopped')
        scheduler = None
