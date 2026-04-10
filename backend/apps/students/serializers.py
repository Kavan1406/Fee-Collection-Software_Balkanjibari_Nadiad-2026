"""
Serializers for Student model.
"""

from rest_framework import serializers
from .models import Student
from apps.authentication.models import User


class StudentSimpleSerializer(serializers.ModelSerializer):
    """Simple serializer for Student model to be used in nested lists."""
    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'phone', 'email', 'status']


class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model."""
    
    payment_status = serializers.SerializerMethodField()
    total_enrollments = serializers.SerializerMethodField()
    paid_enrollments = serializers.SerializerMethodField()
    enrollments = serializers.SerializerMethodField()
    
    photo = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'name', 'age', 'gender', 'date_of_birth', 'photo',
            'parent_name', 'phone', 'email', 'address', 'area', 'blood_group', 'enrollment_date',
            'status', 'payment_status', 'total_enrollments', 'paid_enrollments', 'enrollments',
            'total_fees', 'total_paid', 'total_pending',
            'login_username', 'login_password_hint',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student_id', 'login_username', 'login_password_hint', 'created_at', 'updated_at']
    
    def get_photo(self, obj):
        if not obj.photo:
            return None
        
        try:
            import re
            # 1. Standardize raw value as string
            clean_path = str(obj.photo)
            if not clean_path or clean_path == 'None':
                return None
                
            # 2. Aggressive Recursive Cleaning
            # Strips base URLs, redundant 'image/upload/' and version numbers (v1/)
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
            
            # 3. Construct clean HTTPS URL
            return f"https://res.cloudinary.com/dvkfuevyw/image/upload/{clean_path}"
        except Exception as e:
            print(f"DEBUG: Photo URL resolution error: {str(e)}")
            return None

    def get_payment_status(self, obj):
        """Get overall payment status across all enrollments efficiently."""
        # Use prefetched enrollments to avoid extra queries
        enrollments = obj.enrollments.all()
        active_enrollments = [e for e in enrollments if not e.is_deleted]
        
        if not active_enrollments:
            return 'N/A'
        
        # Check annotated total pending if available
        total_pending = getattr(obj, 'annotated_total_pending', None)
        if total_pending is None:
            total_pending = sum(e.pending_amount for e in active_enrollments)
            
        if total_pending == 0:
            return 'Paid'
        elif any(e.paid_amount > 0 for e in active_enrollments):
            return 'Partial'
        else:
            return 'Pending'
    
    def get_total_enrollments(self, obj):
        """Get count of active enrollments using annotation or prefetch."""
        annotated_count = getattr(obj, 'annotated_total_enrollments', None)
        if annotated_count is not None:
            return annotated_count
        return len([e for e in obj.enrollments.all() if not e.is_deleted and e.status == 'ACTIVE'])

    def get_enrollments(self, obj):
        """Get list of active enrollments using prefetched data."""
        return [
            {
                'id': e.id, 
                'subject_id': e.subject.id,
                'subject_name': e.subject.name,
                'batch_time': e.batch_time,
                'include_library_fee': e.include_library_fee,
                'total_fee': float(e.total_fee),
                'paid_amount': float(e.paid_amount),
                'pending_amount': float(e.pending_amount),
                'id_card_url': e.id_card.url if e.id_card else None,
                'status': e.status
            } 
            for e in obj.enrollments.all() if not e.is_deleted
        ]

    def get_paid_enrollments(self, obj):
        """Get list of fully paid enrollments for ID card generation using prefetched data."""
        return [
            {
                'id': e.id, 
                'subject_name': e.subject.name
            } 
            for e in obj.enrollments.all() if not e.is_deleted and e.pending_amount == 0
        ]


class StudentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating students with optional initial enrollments."""
    
    enrollments = serializers.CharField(
        write_only=True,
        required=False,
        help_text='JSON string list of objects with subject_id and batch_time'
    )
    
    payment_method = serializers.ChoiceField(
        choices=[('CASH', 'Cash'), ('CHEQUE', 'Cheque'), ('ONLINE', 'Online')],
        default='CASH',
        required=False,
        write_only=True,
        help_text='Payment method for all enrollments'
    )
    
    class Meta:
        model = Student
        fields = [
            'name', 'age', 'gender', 'date_of_birth', 'photo', 'parent_name', 'phone', 'email', 'address', 'area', 'blood_group', 'enrollment_date',
            'enrollments', 'payment_method'
        ]
        extra_kwargs = {
            'age': {'required': False, 'allow_null': True},
            'gender': {'required': False, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
            'parent_name': {'required': False, 'allow_null': True},
            'email': {'required': False, 'allow_null': True},
            'address': {'required': False, 'allow_null': True},
            'area': {'required': False, 'allow_null': True},
            'blood_group': {'required': False, 'allow_null': True},
            'photo': {'required': False, 'allow_null': True},
        }

    def validate_age(self, value):
        """Validate student age - must be between 4 and 17."""
        if value < 4 or value > 17:
            raise serializers.ValidationError('Student age must be between 4 and 17 years.')
        return value

    def validate_date_of_birth(self, value):
        """Validate date of birth - age must be between 4 and 17."""
        from django.utils import timezone
        if not value:
            return value
            
        today = timezone.now().date()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        
        if age < 4 or age > 17:
            raise serializers.ValidationError(f'Student age (current: {age}) must be between 4 and 17 years based on date of birth.')
        return value

    def validate_photo(self, value):
        """Ignore photo if it's not a file (handles Junk data like empty dicts)."""
        from django.core.files.base import File
        if value is not None and not isinstance(value, File):
            return None
        return value

    def validate_phone(self, value):
        """Validate phone number - accept 10 digits or 12 digits (with 91 prefix)."""
        phone_digits = ''.join(filter(str.isdigit, value))
        
        if len(phone_digits) == 12 and phone_digits.startswith('91'):
            return phone_digits[2:]
            
        if len(phone_digits) != 10:
            raise serializers.ValidationError('Phone number must be exactly 10 digits (or 12 with +91 prefix).')
            
        return phone_digits

    def validate_enrollments(self, value):
        """Validate max 4 subjects - handles both list and JSON string."""
        import json
        if isinstance(value, str):
            try:
                data = json.loads(value)
            except:
                data = []
        else:
            data = value

        if len(data) > 4:
            raise serializers.ValidationError('A student can enroll in a maximum of 4 subjects.')
        return value
    
    def create(self, validated_data):
        """Create student, auto-generate user account, and create enrollments with fee logic."""
        import json
        from django.contrib.auth import get_user_model
        from apps.enrollments.models import Enrollment
        from apps.subjects.models import Subject
        
        request = self.context.get('request')
        # Extract enrollments and payment_method from validated_data
        # (they are write-only fields not in the Student model)
        enrollments_data = validated_data.pop('enrollments', [])
        payment_method = validated_data.get('payment_method', 'CASH')
        
        if isinstance(enrollments_data, str):
            try:
                enrollments_data = json.loads(enrollments_data)
            except:
                enrollments_data = []

        # Remove payment_method from validated_data
        validated_data.pop('payment_method', None)
        
        # Create the student
        print(f"DEBUG: Creating student with data: {validated_data}")
        try:
            student = Student.objects.create(**validated_data)
            print(f"DEBUG: Student created successfully: {student.student_id}")
        except Exception as e:
            print(f"DEBUG: Student creation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise serializers.ValidationError({"error": f"Model creation failed: {str(e)}"})
        
        # Auto-generated login credentials (for admin reference)
        # Username: lowercase (e.g., stu001)
        username = student.student_id.replace('-', '').lower()
        # Password: STU (uppercase) + enrollment_number + last_4_digits_of_phone (e.g., STU0018229)
        enrollment_number = student.student_id.replace('STU', '')
        default_password = f"STU{enrollment_number}{validated_data['phone'][-4:]}"
        
        User = get_user_model()
        user = None
        try:
            # Try to create a new user
            user = User.objects.create_user(
                username=username,
                password=default_password,
                role='STUDENT',
                is_active=True
            )
            print(f"DEBUG: New user created and linked for {student.student_id}")
        except Exception as e:
            print(f"DEBUG: User creation failed, checking for existing user: {str(e)}")
            # If user already exists, try to get and link it
            try:
                user = User.objects.get(username=username)
                if user.role != 'STUDENT':
                    user.role = 'STUDENT'
                    user.save()
                print(f"DEBUG: Existing user {username} found and prepared for linking")
            except User.DoesNotExist:
                print(f"DEBUG: Could not find or create user for {student.student_id}")

        if user:
            student.user = user
            student.login_username = username
            student.login_password_hint = default_password
            student.save()
            print(f"DEBUG: Student {student.student_id} successfully linked to user {username}")
            
        # Create Enrollments with fee logic based on include_library_fee flag
        print(f"DEBUG: Processing {len(enrollments_data)} enrollments")
        for enr_data in enrollments_data:
            try:
                subject_id = enr_data.get('subject_id')
                batch_time = enr_data.get('batch_time', '7-8 AM')
                include_library_fee = enr_data.get('include_library_fee', False)
                
                print(f"DEBUG: Processing subject_id: {subject_id}, library_fee: {include_library_fee}")
                if not subject_id:
                    print("DEBUG: Empty subject_id, skipping")
                    continue
                    
                subject = Subject.objects.get(id=subject_id, is_deleted=False)
                
                # Base subject fee
                subject_fee = 500.00
                library_fee = 10.00 if include_library_fee else 0.00
                total_fee = subject_fee + library_fee
                
                # For online payments, create pending enrollment
                # For cash/check, create paid enrollment
                if payment_method == 'ONLINE':
                    paid_amount = 0.00
                    pending_amount = total_fee
                    payment_status = 'PENDING_CONFIRMATION'
                else:
                    paid_amount = total_fee
                    pending_amount = 0.00
                    payment_status = 'SUCCESS'
                    
                # Record the payment automatically for registration
                enr = Enrollment.objects.create(
                    student=student,
                    subject=subject,
                    batch_time=batch_time,
                    include_library_fee=include_library_fee,
                    total_fee=total_fee,
                    paid_amount=paid_amount,
                    pending_amount=pending_amount,
                    status='ACTIVE'
                )
                print(f"DEBUG: Enrollment created: {enr.enrollment_id}")
                
                # Only create Payment record if not ONLINE
                # (Online payments will be initiated by the student later)
                if payment_method != 'ONLINE':
                    from apps.payments.models import Payment
                    Payment.objects.create(
                        enrollment=enr,
                        amount=total_fee,
                        payment_date=student.enrollment_date,
                        payment_mode=payment_method,
                        status=payment_status,
                        recorded_by=request.user if request and request.user.is_authenticated else None,
                        notes=f'Automatic registration fee payment ({payment_method})'
                    )
                    print(f"DEBUG: Payment record created for {enr.enrollment_id} with mode {payment_method}")
                else:
                    print(f"DEBUG: Skipping Payment record for ONLINE enrollment {enr.enrollment_id}")
            except Exception as e:
                print(f"DEBUG: Failed to process enrollment for subject {subject_id}: {str(e)}")
                # Continue with other subjects if one fails
        
        # Refresh and return to ensure all relationships are updated for serialization
        student.refresh_from_db()
        return student


class StudentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating students."""
    
    enrollments = serializers.CharField(
        write_only=True,
        required=False,
        help_text='JSON string list of objects with subject_id and batch_time'
    )
    
    class Meta:
        model = Student
        fields = [
            'name', 'age', 'gender', 'date_of_birth', 'photo', 'parent_name', 'phone', 'email', 'address', 'area', 'blood_group', 'status', 'enrollment_date',
            'enrollments'
        ]
        extra_kwargs = {
            'age': {'required': False, 'allow_null': True},
            'gender': {'required': False, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
            'parent_name': {'required': False, 'allow_null': True},
            'email': {'required': False, 'allow_null': True},
            'address': {'required': False, 'allow_null': True},
            'area': {'required': False, 'allow_null': True},
            'blood_group': {'required': False, 'allow_null': True},
            'photo': {'required': False, 'allow_null': True},
        }
    
    def validate_age(self, value):
        """Validate student age - must be between 4 and 17."""
        if value < 4 or value > 17:
            raise serializers.ValidationError('Student age must be between 4 and 17 years.')
        return value

    def validate_date_of_birth(self, value):
        """Validate date of birth - age must be between 4 and 17."""
        from django.utils import timezone
        if not value:
            return value
            
        today = timezone.now().date()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        
        if age < 4 or age > 17:
            raise serializers.ValidationError(f'Student age (current: {age}) must be between 4 and 17 years based on date of birth.')
        return value

    def validate_enrollments(self, value):
        """Validate max 4 subjects - handles both list and JSON string."""
        import json
        if isinstance(value, str):
            try:
                data = json.loads(value)
            except:
                data = []
        else:
            data = value

        if len(data) > 4:
            raise serializers.ValidationError('A student can enroll in a maximum of 4 subjects.')
        return value

    def validate_photo(self, value):
        """Ignore photo if it's not a file (handles Junk data like empty dicts)."""
        from django.core.files.base import File
        if value is not None and not isinstance(value, File):
            return None
        return value

    def validate_phone(self, value):
        """Validate phone number - accept 10 digits or 12 digits (with 91 prefix)."""
        phone_digits = ''.join(filter(str.isdigit, value))
        
        if len(phone_digits) == 12 and phone_digits.startswith('91'):
            return phone_digits[2:]
            
        if len(phone_digits) != 10:
            raise serializers.ValidationError('Phone number must be exactly 10 digits (or 12 with +91 prefix).')
            
        return phone_digits

    def update(self, instance, validated_data):
        """Sync enrollments if provided."""
        import json
        from apps.enrollments.models import Enrollment
        from apps.subjects.models import Subject
        
        enrollments_data = validated_data.pop('enrollments', None)
        
        # Update the student record
        student = super().update(instance, validated_data)
        
        if enrollments_data is not None:
            if isinstance(enrollments_data, str):
                try:
                    enrollments_data = json.loads(enrollments_data)
                except:
                    enrollments_data = []

            # Get current active enrollments
            current_enrs = Enrollment.objects.filter(student=student, is_deleted=False)
            current_subject_ids = {e.subject_id for e in current_enrs}
            
            # Incoming subject IDs
            new_subject_ids = set()
            for item in enrollments_data:
                try:
                    sid = int(item.get('subject_id'))
                    new_subject_ids.add(sid)
                except (ValueError, TypeError):
                    continue
            
            # 1. Handle Deletions: Any current enrollment NOT in the new list
            to_delete = current_subject_ids - new_subject_ids
            if to_delete:
                Enrollment.objects.filter(student=student, subject_id__in=to_delete).update(is_deleted=True)
                print(f"DEBUG: Deleted enrollments for subjects: {to_delete}")
            
            # 2. Handle Updates/Additions
            for item in enrollments_data:
                try:
                    sid = int(item.get('subject_id'))
                    bt = item.get('batch_time', '7-8 AM')
                    lib = item.get('include_library_fee', False)
                    
                    enr, created = Enrollment.objects.update_or_create(
                        student=student,
                        subject_id=sid,
                        defaults={
                            'batch_time': bt,
                            'include_library_fee': lib,
                            'is_deleted': False  # Reactivate if previously deleted
                        }
                    )
                    
                    if created:
                        # Initialize fees for new enrollment
                        subject = Subject.objects.get(id=sid)
                        # Default fee logic (matches StudentCreateSerializer)
                        subject_fee = 500.00
                        library_fee = 10.00 if lib else 0.00
                        enr.total_fee = subject_fee + library_fee
                        enr.paid_amount = 0.00 # Default to unpaid for admin-added subjects
                        enr.status = 'ACTIVE'
                        enr.save()
                        print(f"DEBUG: Created new enrollment for subject {sid}")
                    else:
                        print(f"DEBUG: Updated enrollment for subject {sid}")
                        
                except Exception as e:
                    print(f"DEBUG: Failed to sync enrollment for subject {item.get('subject_id')}: {str(e)}")
        
        return student


class StudentRegistrationRequestSerializer(serializers.ModelSerializer):
    """Public serializer for submitting a new student registration request."""
    
    photo = serializers.SerializerMethodField()

    class Meta:
        from .models import StudentRegistrationRequest
        model = StudentRegistrationRequest
        fields = [
            'id', 'name', 'age', 'gender', 'date_of_birth', 'photo',
            'parent_name', 'phone', 'email', 'address', 'area', 'blood_group',
            'enrollment_date', 'payment_method', 'subjects_data',
        ]
        extra_kwargs = {
            'age': {'required': False, 'allow_null': True},
            'gender': {'required': False, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
            'parent_name': {'required': False, 'allow_null': True},
            'email': {'required': False, 'allow_null': True},
            'address': {'required': False, 'allow_null': True},
            'area': {'required': False, 'allow_null': True},
            'blood_group': {'required': False, 'allow_null': True},
            'photo': {'required': False, 'allow_null': True},
            'enrollment_date': {'required': False, 'allow_null': True},
            'subjects_data': {'required': False},
        }

    def validate_age(self, value):
        """Validate student age - must be between 4 and 17."""
        if value < 4 or value > 17:
            raise serializers.ValidationError('Student age must be between 4 and 17 years.')
        return value

    def validate_date_of_birth(self, value):
        """Validate date of birth - age must be between 4 and 17."""
        from django.utils import timezone
        if not value:
            return value
            
        today = timezone.now().date()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        
        if age < 4 or age > 17:
            raise serializers.ValidationError(f'Student age (current: {age}) must be between 4 and 17 years based on date of birth.')
        return value

    def validate_phone(self, value):
        """Validate phone number - accept 10 digits or 12 digits (with 91 prefix)."""
        phone_digits = ''.join(filter(str.isdigit, value))
        if len(phone_digits) == 12 and phone_digits.startswith('91'):
            return phone_digits[2:]
        if len(phone_digits) != 10:
            raise serializers.ValidationError('Phone number must be exactly 10 digits.')
        return phone_digits

    def validate_subjects_data(self, value):
        import json
        if isinstance(value, str):
            try:
                return json.loads(value)
            except:
                return []
        return value

    def validate_photo(self, value):
        from django.core.files.base import File
        if value is not None and not isinstance(value, File):
            return None
        return value

    def get_photo(self, obj):
        if not obj.photo:
            return None
        try:
            import re
            clean_path = str(obj.photo)
            if not clean_path or clean_path == 'None':
                return None
            
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


class StudentRegistrationRequestAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for viewing registration requests with full details."""

    created_student_id = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()

    class Meta:
        from .models import StudentRegistrationRequest
        model = StudentRegistrationRequest
        fields = [
            'id', 'status', 'rejection_reason',
            'name', 'age', 'gender', 'date_of_birth', 'photo',
            'parent_name', 'phone', 'email', 'address', 'area', 'blood_group',
            'enrollment_date', 'payment_method', 'subjects_data',
            'created_student_id', 'created_at', 'updated_at',
        ]

    def get_photo(self, obj):
        if not obj.photo:
            return None
        try:
            import re
            clean_path = str(obj.photo)
            if not clean_path or clean_path == 'None':
                return None
            
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

    def get_created_student_id(self, obj):
        if obj.created_student:
            return obj.created_student.student_id
        return None

