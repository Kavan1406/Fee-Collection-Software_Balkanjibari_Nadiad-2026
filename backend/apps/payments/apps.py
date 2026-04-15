from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.payments'

    def ready(self):
        import apps.payments.signals
        
        # Initialize APScheduler for payment syncing
        try:
            from apps.payments.scheduler import init_scheduler
            init_scheduler()
        except Exception as e:
            logger.warning(f'Could not initialize APScheduler: {e}')
