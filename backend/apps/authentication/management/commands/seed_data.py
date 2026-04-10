"""
Management command to seed database with initial data.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.students.models import Student
from apps.subjects.models import Subject, FeeStructure
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from datetime import date, timedelta
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with initial data for testing'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')
        
        # Create users
        self.stdout.write('Creating users...')
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@edumanager.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user: admin / admin123'))
        
        staff_user, created = User.objects.get_or_create(
            username='staff',
            defaults={
                'email': 'staff@edumanager.com',
                'first_name': 'Staff',
                'last_name': 'Member',
                'role': 'STAFF',
                'is_staff': True,
            }
        )
        if created:
            staff_user.set_password('staff123')
            staff_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created staff user: staff / staff123'))
        
        # Create subjects
        self.stdout.write('Creating subjects...')
        subjects_data = [
            {'name': 'Piano', 'category': 'MUSIC', 'instructor': 'Mr. Sharma', 'fee': 12000},
            {'name': 'Guitar', 'category': 'MUSIC', 'instructor': 'Ms. Patel', 'fee': 13500},
            {'name': 'Painting', 'category': 'ART', 'instructor': 'Mr. Kumar', 'fee': 10500},
            {'name': 'Drawing', 'category': 'ART', 'instructor': 'Ms. Singh', 'fee': 9000},
            {'name': 'Karate', 'category': 'SPORTS', 'instructor': 'Mr. Reddy', 'fee': 11000},
            {'name': 'Vocal Music', 'category': 'MUSIC', 'instructor': 'Ms. Verma', 'fee': 10000},
            {'name': 'Tabla', 'category': 'MUSIC', 'instructor': 'Mr. Gupta', 'fee': 11500},
            {'name': 'Mehndi', 'category': 'ART', 'instructor': 'Ms. Khan', 'fee': 8000},
        ]
        
        subjects = {}
        for subject_data in subjects_data:
            subject, created = Subject.objects.get_or_create(
                name=subject_data['name'],
                defaults={
                    'category': subject_data['category'],
                    'instructor_name': subject_data['instructor'],
                }
            )
            # Ensure it has at least one fee structure
            fee_structure = FeeStructure.objects.filter(subject=subject, is_active=True).first()
            if not fee_structure:
                fee_structure = FeeStructure.objects.filter(subject=subject).first()
            
            if not fee_structure:
                FeeStructure.objects.create(
                    subject=subject,
                    fee_amount=Decimal(str(subject_data['fee'])),
                    duration='MONTHLY',
                    effective_from=date.today()
                )
                self.stdout.write(self.style.SUCCESS(f'Created fee structure for: {subject.name}'))
            subjects[subject.name] = subject
        
        # Create students
        self.stdout.write('Creating students...')
        students_data = [
            {'name': 'Aarav Sharma', 'age': 12, 'gender': 'MALE', 'parent': 'Mr. Rajesh Sharma', 'phone': '98765-43210', 'address': 'MG Road, Bangalore', 'area': 'Whitefield', 'dob': date(2012, 3, 15)},
            {'name': 'Priya Verma', 'age': 14, 'gender': 'FEMALE', 'parent': 'Mrs. Sunita Verma', 'phone': '99876-54321', 'address': 'Brigade Road, Bangalore', 'area': 'Koramangala', 'dob': date(2010, 7, 22)},
            {'name': 'Rohit Patel', 'age': 11, 'gender': 'MALE', 'parent': 'Mr. Amit Patel', 'phone': '97654-32109', 'address': 'Indiranagar, Bangalore', 'area': 'Indiranagar', 'dob': date(2013, 11, 8)},
            {'name': 'Sneha Desai', 'age': 13, 'gender': 'FEMALE', 'parent': 'Mrs. Kavita Desai', 'phone': '96543-21098', 'address': 'Jayamahal Road, Bangalore', 'area': 'Rajajinagar', 'dob': date(2011, 5, 30)},
            {'name': 'Vikram Singh', 'age': 15, 'gender': 'MALE', 'parent': 'Mr. Harpreet Singh', 'phone': '95432-10987', 'address': 'Ulsoor, Bangalore', 'area': 'Ulsoor', 'dob': date(2009, 9, 12)},
        ]
        
        students = []
        for student_data in students_data:
            student, created = Student.objects.get_or_create(
                name=student_data['name'],
                defaults={
                    'age': student_data['age'],
                    'gender': student_data['gender'],
                    'parent_name': student_data['parent'],
                    'phone': student_data['phone'],
                    'address': student_data['address'],
                    'area': student_data['area'],
                    'date_of_birth': student_data['dob'],
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created student: {student.name} ({student.student_id})'))
            students.append(student)
        
        # Create enrollments
        self.stdout.write('Creating enrollments...')
        enrollments_data = [
            {'student': students[0], 'subject': subjects['Piano']},
            {'student': students[0], 'subject': subjects['Drawing']},
            {'student': students[1], 'subject': subjects['Painting']},
            {'student': students[1], 'subject': subjects['Mehndi']},
            {'student': students[2], 'subject': subjects['Guitar']},
            {'student': students[2], 'subject': subjects['Karate']},
            {'student': students[3], 'subject': subjects['Vocal Music']},
            {'student': students[4], 'subject': subjects['Tabla']},
        ]
        
        enrollments = []
        for enrollment_data in enrollments_data:
            fee_structure = FeeStructure.objects.filter(
                subject=enrollment_data['subject'],
                is_active=True
            ).first()
            
            enrollment, created = Enrollment.objects.get_or_create(
                student=enrollment_data['student'],
                subject=enrollment_data['subject'],
                defaults={
                    'total_fee': fee_structure.fee_amount,
                    'pending_amount': fee_structure.fee_amount,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created enrollment: {enrollment.enrollment_id}'))
            enrollments.append(enrollment)
        
        # Create payments
        self.stdout.write('Creating payments...')
        payments_data = [
            {'enrollment': enrollments[0], 'amount': 12000, 'mode': 'UPI', 'days_ago': 4},
            {'enrollment': enrollments[1], 'amount': 9000, 'mode': 'CASH', 'days_ago': 3},
            {'enrollment': enrollments[2], 'amount': 5250, 'mode': 'CASH', 'days_ago': 6},
            {'enrollment': enrollments[4], 'amount': 13500, 'mode': 'BANK', 'days_ago': 2},
            {'enrollment': enrollments[5], 'amount': 11000, 'mode': 'UPI', 'days_ago': 5},
        ]
        
        for payment_data in payments_data:
            enrollment = payment_data['enrollment']
            amount = Decimal(str(payment_data['amount']))
            
            if amount <= enrollment.pending_amount:
                payment, created = Payment.objects.get_or_create(
                    enrollment=enrollment,
                    amount=amount,
                    defaults={
                        'payment_date': date.today() - timedelta(days=payment_data['days_ago']),
                        'payment_mode': payment_data['mode'],
                        'recorded_by': admin_user,
                    }
                )
                if created:
                    # Update enrollment
                    enrollment.paid_amount += amount
                    enrollment.pending_amount -= amount
                    enrollment.save()
                    self.stdout.write(self.style.SUCCESS(f'Created payment: {payment.payment_id} - ₹{amount}'))
        
        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
        self.stdout.write(self.style.SUCCESS('\nLogin credentials:'))
        self.stdout.write(self.style.SUCCESS('Admin: admin / admin123'))
        self.stdout.write(self.style.SUCCESS('Staff: staff / staff123'))
