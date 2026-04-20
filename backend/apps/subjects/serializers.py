"""
Serializers for Subject and FeeStructure models.
"""

from rest_framework import serializers
from .models import Subject, FeeStructure, SubjectBatch


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
        fields = ['id', 'name', 'description', 'category', 'activity_type', 'class_mode',
                  'duration_months', 'timing_schedule', 'monthly_fee', 'instructor_name',
                  'default_batch_timing', 'max_seats', 'enrolled_count', 'min_age', 'max_age',
                  'is_active', 'current_fee', 'fee_structures', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_enrolled_count(self, obj):
        """Calculate the number of active enrollments using annotated value if available."""
        return getattr(obj, 'enrolled_count_annotated', 0)
    
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


class SubjectBatchSerializer(serializers.ModelSerializer):
    """Serializer for SubjectBatch model with enrollment info."""
    
    enrolled_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()
    
    class Meta:
        model = SubjectBatch
        fields = ['id', 'subject', 'batch_time', 'capacity_limit', 'min_age', 'max_age',
                  'is_active', 'enrolled_count', 'available_seats', 'is_full', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_enrolled_count(self, obj):
        """Get current enrollment count for this batch."""
        return obj.enrolled_count
    
    def get_available_seats(self, obj):
        """Get available seats in this batch."""
        return obj.available_seats
    
    def get_is_full(self, obj):
        """Check if batch is full."""
        return obj.available_seats <= 0


class SubjectDetailSerializer(serializers.ModelSerializer):
    """Serializer for Subject with batch details."""
    
    current_fee = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()
    fee_structures = FeeStructureSerializer(many=True, read_only=True)
    batch_configs = SubjectBatchSerializer(many=True, read_only=True)
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'description', 'category', 'activity_type', 'duration_months', 
                  'timing_schedule', 'monthly_fee', 'instructor_name', 'default_batch_timing', 
                  'max_seats', 'enrolled_count', 'age_limit',
                  'is_active', 'current_fee', 'fee_structures', 'batch_configs', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_enrolled_count(self, obj):
        """Calculate the number of active enrollments using annotated value if available."""
        return getattr(obj, 'enrolled_count_annotated', 0)
    
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
