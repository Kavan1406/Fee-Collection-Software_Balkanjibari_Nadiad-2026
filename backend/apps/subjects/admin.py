"""
Admin configuration for subjects app.
"""

from django.contrib import admin
from .models import Subject, FeeStructure, SubjectBatch


class FeeStructureInline(admin.TabularInline):
    model = FeeStructure
    extra = 1


class SubjectBatchInline(admin.TabularInline):
    model = SubjectBatch
    extra = 1
    fields = ['batch_time', 'capacity_limit', 'is_active']
    readonly_fields = []


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """Admin interface for Subject model."""
    
    list_display = ['name', 'category', 'instructor_name', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'instructor_name']
    inlines = [FeeStructureInline, SubjectBatchInline]


@admin.register(SubjectBatch)
class SubjectBatchAdmin(admin.ModelAdmin):
    """Admin interface for SubjectBatch model."""
    
    list_display = ['subject', 'batch_time', 'capacity_limit', 'enrolled_count', 'available_seats', 'is_active']
    list_filter = ['subject__category', 'is_active', 'subject']
    search_fields = ['subject__name', 'batch_time']
    readonly_fields = ['enrolled_count', 'available_seats', 'created_at', 'updated_at']
    fieldsets = (
        ('Batch Configuration', {
            'fields': ('subject', 'batch_time', 'capacity_limit', 'is_active')
        }),
        ('Statistics', {
            'fields': ('enrolled_count', 'available_seats'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
