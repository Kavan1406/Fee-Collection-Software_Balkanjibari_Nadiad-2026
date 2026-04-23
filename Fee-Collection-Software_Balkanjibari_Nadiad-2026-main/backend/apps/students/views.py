"""
Views for Student CRUD operations with role-based access.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.db.models import Q, Sum, Count, Case, When, Value, IntegerField
from django.contrib.auth import get_user_model
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

from .utils import get_or_repair_student

from .models import Student, StudentRegistrationRequest
from apps.notifications.models import Notification
from .serializers import (
    StudentSerializer, StudentCreateSerializer, StudentUpdateSerializer,
    StudentRegistrationRequestSerializer, StudentRegistrationRequestAdminSerializer
)
from utils.permissions import IsAdmin, IsStaffAccountantOrAdmin
from utils.pagination import StandardResultsSetPagination



class StudentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Student CRUD operations.
    """
    # Avoid URL collisions where custom action paths can be treated as <pk>.
    lookup_value_regex = r'\d+'
    queryset = Student.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_permissions(self):
        if self.action == 'me':
            return [IsAuthenticated()]
        if self.action == 'update_profile':
            # Students can update their own profile, staff/admin can update any
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsStaffAccountantOrAdmin()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current student's profile with Ultra-Strict Healing logic and Transparency."""
        try:
            student = get_or_repair_student(request)
            
            # Diagnostic Headers
            headers = {
                'X-Student-Healed': str(getattr(request, '_student_healed', False)),
                'X-User-Role': request.user.role if request.user else 'ANONYMOUS',
                'X-User-ID': str(request.user.id) if request.user else 'NONE'
            }
            
            if not student:
                 # BYPASS: Return 200 OK but with linked: false
                 return Response({
                    'success': True,
                    'linked': False,
                    'error': {'message': 'Student profile not linked (Repair Failed)'}
                }, status=status.HTTP_200_OK, headers=headers)
                
            serializer = StudentSerializer(student)
            serializer = StudentSerializer(student)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)
    
    @action(detail=True, methods=['patch'], url_path='update_profile')
    def update_profile(self, request, pk=None):
        """Allow students to update their photo, address, and phone number only."""
        # Debug logging
        try:
            with open('incoming_debug.log', 'a') as f:
                from datetime import datetime
                f.write(f"\n--- UPDATE_PROFILE at {datetime.now()} ---\n")
                f.write(f"User: {request.user.username} (Role: {request.user.role})\n")
                f.write(f"Student ID: {pk}\n")
                f.write(f"Data: {request.data}\n")
                f.write(f"Files: {request.FILES}\n")
                f.write("-" * 40 + "\n")
        except:
            pass
        
        student = self.get_object()
        
        # Security check: Students can only update their own profile
        if request.user.role == 'STUDENT':
            if not hasattr(request.user, 'student_profile') or request.user.student_profile.id != student.id:
                return Response({
                    'success': False,
                    'error': {'message': 'You can only update your own profile'}
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Only allow updating specific fields
        allowed_fields = ['photo', 'address', 'phone']
        data = {}
        
        for field in allowed_fields:
            if field in request.data:
                data[field] = request.data[field]
        
        # Handle photo file
        if 'photo' in request.FILES:
            data['photo'] = request.FILES['photo']
        
        serializer = StudentUpdateSerializer(student, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_student = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'data': StudentSerializer(updated_student).data
        })
    
    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return StudentUpdateSerializer
        return StudentSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        Supports search, area filter, status filter.
        Optimized with annotations and prefetching to avoid N+1 queries.
        """
        from django.db.models import Prefetch
        from apps.enrollments.models import Enrollment
        
        # Base queryset with essential prefetching optimized for subject data
        queryset = Student.objects.filter(is_deleted=False).prefetch_related(
            Prefetch(
                'enrollments',
                queryset=Enrollment.objects.filter(is_deleted=False).select_related('subject')
            )
        )
        
        # Annotate with financial totals only if not searching or if needed for list
        # For now, keep them but use more efficient Sums
        queryset = queryset.annotate(
            annotated_total_fees=Sum(
                'enrollments__total_fee',
                filter=Q(enrollments__is_deleted=False)
            ),
            annotated_total_paid=Sum(
                'enrollments__paid_amount',
                filter=Q(enrollments__is_deleted=False)
            ),
            annotated_total_pending=Sum(
                'enrollments__pending_amount',
                filter=Q(enrollments__is_deleted=False)
            ),
            annotated_total_enrollments=Count(
                'enrollments',
                filter=Q(enrollments__is_deleted=False, enrollments__status='ACTIVE')
            )
        )
        
        # Search by name, student_id, or phone
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(student_id__icontains=search) |
                Q(phone__icontains=search)
            )
        
        # Filter by area
        area = self.request.query_params.get('area', None)
        if area:
            queryset = queryset.filter(area__icontains=area)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        
        # Filter by Subject ID or Name
        subject_id = self.request.query_params.get('subject_id', None)
        if subject_id:
            queryset = queryset.filter(enrollments__subject_id=subject_id, enrollments__is_deleted=False)
            
        subject_name = self.request.query_params.get('subject_name', None)
        if subject_name:
            queryset = queryset.filter(enrollments__subject__name__iexact=subject_name, enrollments__is_deleted=False)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new student."""
        # DEBUG: Write to file because terminal is being stubborn
        try:
            with open('incoming_debug.log', 'a') as f:
                import json
                from datetime import datetime
                f.write(f"\n--- INCOMING at {datetime.now()} ---\n")
                f.write(f"Data: {request.data}\n")
                f.write(f"Files: {request.FILES}\n")
                f.write("-" * 20 + "\n")
        except:
            pass
            
        # Robustness: Remove photo if it's not a file (handles Junk data like empty dicts {})
        # We do this here because DRF ImageField validates BEFORE our custom validators.
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        if 'photo' in data and not hasattr(data.get('photo'), 'read'):
            # It's not a file, so it's junk. Pop it.
            if hasattr(data, 'pop'):
                data.pop('photo')
            elif isinstance(data, dict):
                del data['photo']

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Student created successfully.',
            'data': StudentSerializer(student).data
        }, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Get student details."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """Update student details."""
        partial = kwargs.pop('partial', False)
        
        # Robustness: Remove photo if it's not a file (handles Junk data like empty dicts {})
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        if 'photo' in data and not hasattr(data.get('photo'), 'read'):
            if hasattr(data, 'pop'):
                data.pop('photo', None)
            elif isinstance(data, dict):
                data.pop('photo', None)

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Student updated successfully.',
            'data': StudentSerializer(student).data
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete student (Admin only)."""
        if request.user.role not in ['ADMIN', 'STAFF']:
            return Response({
                'success': False,
                'error': {'message': 'Only admins or staff can delete students.'}
            }, status=status.HTTP_403_FORBIDDEN)

        from apps.enrollments.models import Enrollment

        instance = self.get_object()

        with transaction.atomic():
            # Soft-delete the student
            instance.is_deleted = True
            instance.status = 'INACTIVE'
            instance.save()

            # Deactivate linked User account so student can no longer log in
            instance.user.is_active = False
            instance.user.save()

            # Soft-delete all active enrollments
            Enrollment.objects.filter(
                student=instance, is_deleted=False
            ).update(is_deleted=True, status='DROPPED')

        return Response({
            'success': True,
            'message': 'Student deleted successfully.'
        }, status=status.HTTP_200_OK)
    
    def list(self, request, *args, **kwargs):
        """List students with pagination."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='register-offline')
    @transaction.atomic
    def register_offline(self, request):
        """Alias endpoint for admin/staff offline student registration."""
        if request.user.role not in ['ADMIN', 'STAFF', 'ACCOUNTANT']:
            return Response({
                'success': False,
                'error': {'message': 'Only staff/admin/accountant can register offline students.'}
            }, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        payload['payment_method'] = 'CASH'

        serializer = StudentCreateSerializer(data=payload, context={'request': request})
        if not serializer.is_valid():
            return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        student = serializer.save()

        from apps.payments.models import Payment
        pending_requests = Payment.objects.filter(
            enrollment__student=student,
            payment_mode='CASH',
            status__in=['PENDING_CONFIRMATION', 'CREATED'],
            is_deleted=False,
        ).select_related('enrollment__subject')

        request_rows = [
            {
                'request_id': pay.id,
                'student_id': student.student_id,
                'student_name': student.name,
                'subject': pay.enrollment.subject.name if pay.enrollment.subject else 'N/A',
                'total_fees': float(pay.amount),
                'status': 'PENDING',
                'created_at': pay.created_at,
            }
            for pay in pending_requests
        ]

        return Response({
            'success': True,
            'message': 'Student Registered Successfully',
            'data': {
                **StudentSerializer(student).data,
                'username': student.login_username,
                'password': student.login_password_hint,
                'payment_status': 'PENDING',
                'payment_mode': 'CASH',
                'request_entries': request_rows,
            }
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='download-consolidated-receipt')
    def download_consolidated_receipt(self, request, pk=None):
        """Download consolidated fee receipt for a student with all enrollments."""
        from django.http import HttpResponse
        from utils.receipts import generate_receipt_pdf
        
        student = self.get_object()
        
        # Security check
        if request.user.role == 'STUDENT':
            user_student = getattr(request.user, 'student_profile', None)
            if not user_student or student != user_student:
                return Response({'error': 'Access denied'}, status=403)
        
        # Generate receipt for all student enrollments
        try:
            pdf_content = generate_receipt_pdf(student=student)
            filename = f"receipt_{student.student_id}.pdf"
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class StudentRegistrationRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for student self-registration requests.
    - POST (create): Public — no authentication required.
    - GET (list/retrieve): Admin/Staff only.
    - accept/reject actions: Admin only.
    """

    queryset = StudentRegistrationRequest.objects.all()
    pagination_class = StandardResultsSetPagination


    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        if self.action in ['list', 'retrieve', 'accept', 'reject']:
            return [IsAuthenticated(), IsStaffAccountantOrAdmin()]
        # Default for security
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return StudentRegistrationRequestSerializer
        return StudentRegistrationRequestAdminSerializer

    def create(self, request, *args, **kwargs):
        """Public endpoint — submit a new registration request."""
        # Robustness: Remove photo if it's not a file (handles Junk data like empty dicts {})
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        if 'photo' in data and not hasattr(data.get('photo'), 'read'):
            if hasattr(data, 'pop'):
                data.pop('photo', None)
            elif isinstance(data, dict):
                data.pop('photo', None)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        return Response({
            'success': True,
            'message': 'Your registration request has been submitted. Admin will review and notify you.',
            'id': instance.id,
        }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        """Admin: list all registration requests, filterable by status."""
        queryset = self.get_queryset()
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Admin: accept a registration request and create the student."""
        reg_request = self.get_object()

        if reg_request.status != 'PENDING':
            return Response({
                'success': False,
                'error': {'message': f'Request is already {reg_request.status}.'}
            }, status=status.HTTP_400_BAD_REQUEST)

        # Build data dict matching StudentCreateSerializer fields
        import json
        from django.utils import timezone

        student_data = {
            'name': reg_request.name,
            'phone': reg_request.phone,
            'payment_method': reg_request.payment_method,
        }
        optional_fields = ['age', 'gender', 'date_of_birth', 'parent_name', 'email',
                           'address', 'area', 'blood_group', 'enrollment_date']
        for field in optional_fields:
            val = getattr(reg_request, field, None)
            if val is not None:
                student_data[field] = str(val) if not isinstance(val, str) else val

        # Subjects data
        subjects_data = reg_request.subjects_data or []
        student_data['enrollments'] = json.dumps(subjects_data)

        # Use StudentCreateSerializer to create the student
        create_serializer = StudentCreateSerializer(data=student_data, context={'request': request})
        if not create_serializer.is_valid():
            return Response({
                'success': False,
                'error': create_serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        student = create_serializer.save()

        # Copy photo if present
        if reg_request.photo:
            student.photo = reg_request.photo
            student.save()

        # Mark request as accepted and link to student
        reg_request.status = 'ACCEPTED'
        reg_request.created_student = student
        reg_request.save()

        # Notify the student about acceptance
        try:
            if student.user:
                Notification.objects.create(
                    user=student.user,
                    notification_type='REGISTRATION_ACCEPTED',
                    title='Registration Accepted',
                    message=f'Welcome {student.name}! Your registration has been accepted. You can now log in using your student ID: {student.student_id}.'
                )
        except Exception as e:
            # Non-fatal error
            logger.error(f"Failed to create student notification for acceptance: {str(e)}", exc_info=True)

        # Gather info for the frontend to show print buttons
        first_enr = student.enrollments.first()
        first_pay = first_enr.payments.filter(status='SUCCESS').first() if first_enr else None

        payment_status_msg = "PAID" if reg_request.payment_method == 'CASH' else "PAYMENT PENDING"

        return Response({
            'success': True,
            'message': f'Registration accepted. Student {student.student_id} created. Status: {payment_status_msg}',
            'student_id': student.student_id,
            'login_username': student.login_username,
            'login_password_hint': student.login_password_hint,
            'payment_status': payment_status_msg,
            'enrollment_id': first_enr.id if first_enr else None,
            'payment_id': first_pay.id if first_pay else None,
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Admin: reject a registration request."""
        reg_request = self.get_object()

        if reg_request.status != 'PENDING':
            return Response({
                'success': False,
                'error': {'message': f'Request is already {reg_request.status}.'}
            }, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        reg_request.status = 'REJECTED'
        reg_request.rejection_reason = reason
        reg_request.save()

        return Response({
            'success': True,
            'message': 'Registration request rejected.',
        })
