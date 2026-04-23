"""
Admin configuration for subjects app.
"""

from django.contrib import admin
from .models import Subject, FeeStructure


class FeeStructureInline(admin.TabularInline):
    model = FeeStructure
    extra = 1


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """Admin interface for Subject model."""
    
    list_display = ['name', 'category', 'instructor_name', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'instructor_name']
    inlines = [FeeStructureInline]
