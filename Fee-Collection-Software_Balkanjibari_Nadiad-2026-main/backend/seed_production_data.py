import os
import django
import sys
from decimal import Decimal
from datetime import date, timedelta
import random

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.students.models import Student
from apps.subjects.models import Subject
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.authentication.models import User

def seed_data():
    print("--- Seeding Production-Safe Sample Data for Analytics ---")
    
    # 1. Get an admin user for recording payments
    admin = User.objects.filter(role='ADMIN').first()
    if not admin:
        print("Error: No admin user found. Please run seed_admin.py first.")
        return

    # 2. Get active subjects
    subjects = list(Subject.objects.filter(is_active=True, is_deleted=False))
    if not subjects:
        print("Error: No active subjects found. Please run seed_summer_camp_subjects.py first.")
        return

    # 3. Create Sample Students
    first_names = ["Arjun", "Deepak", "Sneha", "Priya", "Rahul", "Anjali", "Vikram", "Neha", "Rohan", "Sonal"]
    last_names = ["Patel", "Shah", "Mehta", "Gajjar", "Vyas", "Chauhan", "Mistri", "Trivedi", "Joshi", "Desai"]
    areas = ["Station Road", "Vaniya Vad", "Bazar Area", "College Road", "Shanti Nagar"]
    
    today = date.today()
    
    for i in range(10):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        phone = f"9825{random.randint(100000, 999999)}"
        email = f"student{i+1}@example.com"
        
        student, created = Student.objects.update_or_create(
            phone=phone,
            defaults={
                "name": name,
                "email": email,
                "gender": random.choice(["MALE", "FEMALE"]),
                "age": random.randint(6, 15),
                "address": f"{random.randint(1, 100)}, {random.choice(areas)}",
                "area": random.choice(areas),
                "parent_name": f"Mr. {random.choice(last_names)}",
                "date_of_birth": date(2010 + random.randint(0, 5), random.randint(1, 12), random.randint(1, 28)),
                "enrollment_date": today - timedelta(days=random.randint(1, 60)),
                "status": "ACTIVE",
                "is_deleted": False
            }
        )
        
        # 4. Create Enrollments
        num_subjects = random.randint(1, 2)
        selected_subjects = random.sample(subjects, num_subjects)
        
        for sub in selected_subjects:
            fee_struct = sub.fee_structures.filter(is_active=True).first()
            fee_amount = fee_struct.fee_amount if fee_struct else Decimal('500.00')
            
            enrollment, e_created = Enrollment.objects.update_or_create(
                student=student,
                subject=sub,
                defaults={
                    "total_fee": fee_amount,
                    "paid_amount": Decimal('0.00'), # Will be updated by payments
                    "pending_amount": fee_amount,
                    "status": "ACTIVE",
                    "is_deleted": False,
                    "batch_time": sub.default_batch_timing or "7-8 AM"
                }
            )
            
            # 5. Create Payments (Spread over last 2 months for trends)
            # Create a SUCCESS payment for most enrollments
            if random.random() > 0.1: # 90% chance to have a payment
                payment_date = enrollment.enrollment_date + timedelta(days=random.randint(0, 5))
                amount_to_pay = fee_amount
                
                payment = Payment.objects.create(
                    enrollment=enrollment,
                    amount=amount_to_pay,
                    payment_date=payment_date,
                    payment_mode="CASH",
                    status="SUCCESS",
                    recorded_by=admin,
                    notes="Sample enrollment fee"
                )
                
                # Update enrollment paid status (manual update for seed)
                enrollment.paid_amount += amount_to_pay
                enrollment.pending_amount = enrollment.total_fee - enrollment.paid_amount
                enrollment.save()
                
                print(f"  [SUCCESS] Created Payment {payment.payment_id} for {student.name} - {sub.name}")

    print("\n--- Seeding Complete ---")
    print(f"Total Active Students: {Student.objects.filter(is_deleted=False).count()}")
    print(f"Total Active Enrollments: {Enrollment.objects.filter(is_deleted=False).count()}")
    print(f"Total Successful Payments: {Payment.objects.filter(status='SUCCESS', is_deleted=False).count()}")

if __name__ == "__main__":
    seed_data()
