"""
Serializers for Enrollment model.
"""

from rest_framework import serializers
from .models import Enrollment
from apps.students.serializers import StudentSimpleSerializer
from apps.subjects.serializers import SubjectSerializer


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for Enrollment model."""
    
    student = StudentSimpleSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    payment_status = serializers.SerializerMethodField()
    id_card = serializers.SerializerMethodField()
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'enrollment_id', 'student', 'subject',
            'enrollment_date', 'batch_time', 'status', 'total_fee', 'paid_amount',
            'pending_amount', 'payment_status', 'id_card', 'created_at'
        ]
        read_only_fields = ['id', 'enrollment_id', 'enrollment_date', 'created_at']
    
    def get_id_card(self, obj):
        """Standardize Cloudinary URL for ID card PDF/Image with aggressive cleaning."""
        if not obj.id_card:
            return None
        try:
            import re
            clean_path = str(obj.id_card)
            if not clean_path or clean_path == 'None':
                return None
            
            # Aggressive Recursive Cleaning
            prefixes = [
                r'^https?://res\.cloudinary\.com/[^/]+/image/upload/',
                r'^image/upload/',
                r'^v\d+/'
            ]
            
            changed = True
            while changed:
                changed = False
                for pattern in prefixes:
                    new_path = re.sub(pattern, '', clean_path)
                    if new_path != clean_path:
                        clean_path = new_path
                        changed = True
            
            return f"https://res.cloudinary.com/dvkfuevyw/image/upload/{clean_path}"
        except Exception:
            return None
    
    def get_payment_status(self, obj):
        """Get payment status from model property."""
        return obj.payment_status


class EnrollmentCreateSerializer(serializers.Serializer):
    """Serializer for creating enrollments."""
    
    student_id = serializers.IntegerField()
    subject_id = serializers.IntegerField()
    batch_time = serializers.ChoiceField(choices=[
        ('7-8 AM', '7-8 AM (Morning)'),
        ('8-9 AM', '8-9 AM (Morning)'),
        ('5-6 PM', '5-6 PM (Evening)'),
        ('6-7 PM', '6-7 PM (Evening)'),
    ])
    
    def validate(self, data):
        from apps.students.models import Student
        from apps.subjects.models import Subject
        
        # Validate student exists
        try:
            student = Student.objects.get(id=data['student_id'], is_deleted=False)
        except Student.DoesNotExist:
            raise serializers.ValidationError({'student_id': 'Student not found.'})
        
        # Check active enrollment count (Max 4)
        active_count = Enrollment.objects.filter(student=student, is_deleted=False, status='ACTIVE').count()
        if active_count >= 4:
            raise serializers.ValidationError('Student has already reached the maximum of 4 subjects.')

        # Validate subject exists
        try:
            subject = Subject.objects.get(id=data['subject_id'], is_deleted=False, is_active=True)
        except Subject.DoesNotExist:
            raise serializers.ValidationError({'subject_id': 'Subject not found.'})
        
        # Check if enrollment already exists
        if Enrollment.objects.filter(student=student, subject=subject, is_deleted=False).exists():
            raise serializers.ValidationError('Student is already enrolled in this subject.')
        
        data['student'] = student
        data['subject'] = subject
        
        # Fee logic for subsequent enrollments: Always 500 (Lib fee is only for the first one)
        # However, if this is technically the FIRST enrollment (e.g. registered but not enrolled),
        # we check if any enrollment exists at all.
        has_existing = Enrollment.objects.filter(student=student, is_deleted=False).exists()
        data['total_fee'] = 500.00 if has_existing else 510.00
        
        return data
