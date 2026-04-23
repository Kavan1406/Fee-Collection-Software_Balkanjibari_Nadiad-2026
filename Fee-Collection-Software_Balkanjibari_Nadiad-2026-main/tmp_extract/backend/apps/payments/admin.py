"""
Admin configuration for payments app.
"""

from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Admin interface for Payment model."""
    
    list_display = ['payment_id', 'receipt_number', 'get_student_name', 'amount', 'payment_date', 'payment_mode', 'created_at']
    list_filter = ['payment_mode', 'payment_date', 'created_at']
    search_fields = ['payment_id', 'receipt_number', 'enrollment__student__name', 'transaction_id']
    readonly_fields = ['payment_id', 'receipt_number', 'created_at']
    
    def get_student_name(self, obj):
        return obj.enrollment.student.name
    get_student_name.short_description = 'Student'
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_id', 'receipt_number', 'enrollment', 'amount')
        }),
        ('Payment Details', {
            'fields': ('payment_date', 'payment_mode', 'transaction_id', 'notes')
        }),
        ('Metadata', {
            'fields': ('recorded_by', 'created_at', 'is_deleted')
        }),
    )
