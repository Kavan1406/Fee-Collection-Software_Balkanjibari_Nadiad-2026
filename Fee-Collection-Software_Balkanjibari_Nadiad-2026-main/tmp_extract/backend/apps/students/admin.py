"""
Admin configuration for students app.
"""

from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """Admin interface for Student model."""
    
    list_display = ['student_id', 'name', 'age', 'gender', 'area', 'status', 'created_at']
    list_filter = ['status', 'gender', 'area', 'created_at']
    search_fields = ['student_id', 'name', 'phone', 'parent_name']
    readonly_fields = ['student_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('student_id', 'name', 'age', 'gender', 'date_of_birth')
        }),
        ('Contact Information', {
            'fields': ('parent_name', 'phone', 'address', 'area')
        }),
        ('Status', {
            'fields': ('status', 'is_deleted')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
