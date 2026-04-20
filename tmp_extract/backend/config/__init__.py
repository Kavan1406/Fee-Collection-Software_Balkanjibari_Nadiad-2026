# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
# Celery disabled for MVP, will be enabled post-MVP
# from .celery import app as celery_app

# __all__ = ('celery_app',)
__all__ = ()
