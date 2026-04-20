"""
Performance Optimization Utilities
Session 13 - 16 April 2026
Provides caching and query optimization helpers
"""

from functools import wraps
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.db.models import Prefetch
from apps.enrollments.models import Enrollment
from apps.subjects.models import Subject

def cache_queryset(timeout=300):
    """
    Decorator to cache ViewSet list responses
    Usage:
        @cache_queryset(timeout=600)
        def list(self, request, *args, **kwargs):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Generate cache key from request parameters
            cache_key = f"view_{self.__class__.__name__}_{request.get_full_path()}"
            
            # Try to get from cache
            cached_response = cache.get(cache_key)
            if cached_response and request.method == 'GET':
                return cached_response
            
            # If not in cache, execute view
            response = view_func(self, request, *args, **kwargs)
            
            # Cache the response for GET requests only
            if request.method == 'GET' and hasattr(response, 'data'):
                cache.set(cache_key, response, timeout)
            
            return response
        return wrapper
    return decorator


def optimize_student_queryset(queryset):
    """
    Optimize student queryset to avoid N+1 queries
    Prefetches enrollments and subjects
    """
    return queryset.prefetch_related(
        Prefetch(
            'enrollments',
            queryset=Enrollment.objects.filter(is_deleted=False).select_related('subject')
        )
    )


def optimize_enrollment_queryset(queryset):
    """
    Optimize enrollment queryset
    Uses select_related for foreign keys
    """
    return queryset.select_related(
        'student',
        'subject',
        'student__user'
    ).prefetch_related('payments')


def optimize_payment_queryset(queryset):
    """
    Optimize payment queryset
    Includes related enrollment and student data
    """
    return queryset.select_related(
        'enrollment__student',
        'enrollment__subject',
        'recorded_by'
    )


def bulk_get_student_payments(student_ids, status=None):
    """
    Efficiently fetch payments for multiple students
    Reduces N+1 query problems in bulk operations
    """
    from apps.payments.models import Payment
    
    query = Payment.objects.filter(
        enrollment__student_id__in=student_ids,
        is_deleted=False
    ).select_related('enrollment__student', 'enrollment__subject')
    
    if status:
        query = query.filter(status=status)
    
    return query


def bulk_get_enrollments(student_ids):
    """
    Efficiently fetch all enrollments for multiple students
    """
    return Enrollment.objects.filter(
        student_id__in=student_ids,
        is_deleted=False
    ).select_related('subject').prefetch_related('payments')


class QueryOptimizationMiddleware:
    """
    Middleware to ensure all QuerySets use optimized patterns
    Logs queries in development for analysis
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        from django.db import connection
        from django.db.utils import DEFAULT_DB_ALIAS
        
        # Reset query counter
        if hasattr(connection, 'queries'):
            queries_before = len(connection.queries)
        
        response = self.get_response(request)
        
        # Log query count in development
        if hasattr(connection, 'queries'):
            queries_after = len(connection.queries)
            query_count = queries_after - queries_before
            
            # Log if too many queries (potential N+1 issue)
            if query_count > 20:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"⚠️ High query count: {query_count} queries for {request.path}",
                    extra={'request': request}
                )
        
        return response


# Cache warming function to preload commonly accessed data
def warm_cache():
    """
    Preload frequently accessed data into cache
    Call this on application startup for better performance
    """
    from apps.subjects.models import Subject
    from django.core.cache import cache
    
    # Cache all active subjects
    subjects = Subject.objects.filter(is_deleted=False).values('id', 'name', 'fees')
    cache.set('all_subjects', subjects, 3600)  # 1 hour
    
    print("✓ Cache warming completed")


print("✓ Performance optimization utilities loaded")
