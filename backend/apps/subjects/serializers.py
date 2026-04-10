"""
Serializers for Subject and FeeStructure models.
"""

from rest_framework import serializers
from .models import Subject, FeeStructure


class FeeStructureSerializer(serializers.ModelSerializer):
    """Serializer for FeeStructure model."""
    
    class Meta:
        model = FeeStructure
        fields = ['id', 'fee_amount', 'duration', 'effective_from', 'effective_to', 'is_active']


class SubjectSerializer(serializers.ModelSerializer):
    """Serializer for Subject model."""
    
    current_fee = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()
    fee_structures = FeeStructureSerializer(many=True, read_only=True)
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'description', 'category', 'activity_type', 'duration_months', 
                  'timing_schedule', 'monthly_fee', 'instructor_name', 'default_batch_timing', 
                  'max_seats', 'enrolled_count',
                  'is_active', 'current_fee', 'fee_structures', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_enrolled_count(self, obj):
        """Calculate the number of active enrollments for this subject."""
        return obj.enrollments.filter(is_deleted=False, status='ACTIVE').count()
    
    def get_current_fee(self, obj):
        """Get the current active fee structure."""
        from datetime import date
        # Use prefetched data if available
        fee_structures = list(obj.fee_structures.all())
        current_fee = next((f for f in fee_structures if f.is_active and f.effective_from <= date.today()), None)
        
        if current_fee:
            return {
                'amount': str(current_fee.fee_amount),
                'duration': current_fee.duration
            }
        return None


class SubjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating subjects with fee structure."""
    
    fee_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    fee_duration = serializers.ChoiceField(choices=FeeStructure.DURATION_CHOICES)
    
    class Meta:
        model = Subject
        fields = ['name', 'description', 'category', 'activity_type', 'duration_months', 
                  'timing_schedule', 'monthly_fee', 'instructor_name', 'default_batch_timing', 
                  'max_seats', 'fee_amount', 'fee_duration']
    
    def create(self, validated_data):
        from datetime import date
        fee_amount = validated_data.pop('fee_amount', 0)
        fee_duration = validated_data.pop('fee_duration', '1_MONTH')
        
        # Create subject
        subject = Subject.objects.create(**validated_data)
        
        # Create fee structure
        FeeStructure.objects.create(
            subject=subject,
            fee_amount=fee_amount,
            duration=fee_duration,
            effective_from=date.today()
        )
        
        return subject

    def update(self, instance, validated_data):
        from datetime import date
        fee_amount = validated_data.pop('fee_amount', None)
        fee_duration = validated_data.pop('fee_duration', None)

        # Update subject fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create FeeStructure if provided
        if fee_amount is not None:
            # Deactivate old fee structures
            instance.fee_structures.filter(is_active=True).update(is_active=False)
            
            FeeStructure.objects.create(
                subject=instance,
                fee_amount=fee_amount,
                duration=fee_duration or '1_MONTH',
                effective_from=date.today(),
                is_active=True
            )
        
        return instance
