import csv
import io
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from apps.students.models import Student
from apps.subjects.models import Subject
from apps.enrollments.models import Enrollment
from django.db import transaction
from apps.authentication.models import User
from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import datetime
from .registration_views import _send_registration_email

@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser])
def import_students_csv(request):
    """
    Imports students and their enrollments from a CSV file.
    Expected CSV columns: name, email, phone, gender, date_of_birth, address, city, area, pincode, subject, batch_time, enrollment_date
    """
    file = request.FILES.get('file')
    if not file:
        return Response({'success': False, 'error': 'No file provided'}, status=400)
    
    if not file.name.endswith('.csv'):
        return Response({'success': False, 'error': 'File must be a CSV'}, status=400)

    try:
        decoded_file = file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
    except Exception as e:
        return Response({'success': False, 'error': f'Failed to parse CSV: {str(e)}'}, status=400)
    
    results = {
        'created': 0,
        'updated': 0,
        'errors': []
    }
    
    # Pre-fetch subjects for faster lookup
    subjects_cache = {s.name.lower(): s for s in Subject.objects.filter(is_active=True)}
    
    for i, row in enumerate(reader, 1):
        try:
            # Use a per-row transaction so one bad row does not poison the rest
            # of the import with a broken atomic state.
            with transaction.atomic():
                name = row.get('name', '').strip()
                email = row.get('email', '').strip()
                phone = row.get('phone', '').strip().replace(' ', '')

                if not name or not phone:
                    results['errors'].append(f"Row {i}: Missing required fields (name, phone)")
                    continue

                # If email is missing, create a placeholder based on phone.
                if not email:
                    email = f"{phone}@balkanjibari.local"

                # Each student gets a unique User account (email can be duplicated)
                # This allows multiple students to register with the same email address
                user_created = True
                username = f"stu{get_random_string(5).lower()}"
                user = User.objects.create(
                    email=email,
                    username=username,
                    role='student',
                    is_active=True
                )
                # Set a secure password: STU + last 4 digits of phone + random
                password = f"STU{phone[-4:] if len(phone) >= 4 else '0000'}{get_random_string(4)}"
                user.set_password(password)
                user.save()

                # 2. Handle Student Profile
                dob_str = row.get('date_of_birth', '').strip()
                dob = None
                if dob_str:
                    for fmt in ('%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y'):
                        try:
                            dob = datetime.strptime(dob_str, fmt).date()
                            break
                        except ValueError:
                            continue

                age = 0
                if dob:
                    today = timezone.now().date()
                    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

                student, student_created = Student.objects.update_or_create(
                    user=user,
                    defaults={
                        'name': name,
                        'phone': phone,
                        'email': email,
                        'gender': row.get('gender', 'MALE').upper(),
                        'date_of_birth': dob,
                        'age': age or row.get('age', 10),
                        'address': row.get('address', ''),
                        'city': row.get('city', 'Nadiad'),
                        'area': row.get('area', ''),
                        'pincode': row.get('pincode', ''),
                    }
                )

                if student_created:
                    results['created'] += 1
                else:
                    results['updated'] += 1

                # 3. Handle Enrollment
                subject_name = row.get('subject', '').strip()
                enrolled_subjects = []

                if subject_name:
                    subject = subjects_cache.get(subject_name.lower())
                    if not subject:
                        subject = Subject.objects.filter(name__iexact=subject_name).first()

                    if subject:
                        enrolled_count = Enrollment.objects.filter(subject=subject, is_deleted=False, status='ACTIVE').count()
                        if enrolled_count < subject.max_seats:
                            enr, enr_created = Enrollment.objects.get_or_create(
                                student=student,
                                subject=subject,
                                defaults={
                                    'enrollment_date': timezone.now().date(),
                                    'batch_time': row.get('batch_time', '7-8 AM'),
                                    'status': 'ACTIVE'
                                }
                            )
                            if enr_created:
                                enrolled_subjects.append({
                                    'subject': subject.name,
                                    'batch_time': enr.batch_time,
                                    'fee': float(enr.total_fee),
                                })
                        else:
                            results['errors'].append(f"Row {i}: Subject '{subject_name}' is FULL.")
                    else:
                        results['errors'].append(f"Row {i}: Subject '{subject_name}' not found.")

                # 4. Send credentials email for newly created user.
                if user_created:
                    try:
                        _send_registration_email(student, enrolled_subjects)
                    except Exception as e:
                        results['errors'].append(f"Row {i}: Student created but email failed: {str(e)}")

        except Exception as e:
            results['errors'].append(f"Row {i}: {str(e)}")
    
    return Response({
        'success': True, 
        'message': f"Import completed: {results['created']} created, {results['updated']} updated.",
        'data': results
    })
