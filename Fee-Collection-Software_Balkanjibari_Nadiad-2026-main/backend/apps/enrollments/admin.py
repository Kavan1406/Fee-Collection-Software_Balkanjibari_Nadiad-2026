"""
Admin configuration for enrollments app.
"""

from django.contrib import admin
from .models import Enrollment


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """Admin interface for Enrollment model."""
    
    list_display = ['enrollment_id', 'get_student_name', 'get_subject_name', 'status', 'total_fee', 'paid_amount', 'pending_amount', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['enrollment_id', 'student__name', 'subject__name']
    readonly_fields = ['enrollment_id', 'pending_amount', 'created_at', 'updated_at']
    
    def get_student_name(self, obj):
        return obj.student.name
    get_student_name.short_description = 'Student'
    
    def get_subject_name(self, obj):
        return obj.subject.name
    get_subject_name.short_description = 'Subject'
