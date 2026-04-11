import os
import sys
import django

# Set up Django environment
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(current_dir, '..', 'backend'))

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
import django
django.setup()

from apps.students.models import Student
from apps.subjects.models import Subject
from apps.enrollments.models import Enrollment
from utils.id_cards import generate_id_card_pdf

def test_generate_idcard():
    # 1. Find or create a test student
    student, _ = Student.objects.get_or_create(
        student_id="STU_A5",
        defaults={'name': 'Test Student A5 layout', 'phone': '9876543210', 'email': 'testA5@example.com'}
    )
    
    # 2. Get some subjects
    subjects = list(Subject.objects.all()[:4])
    if len(subjects) < 4:
        print("Not enough subjects in DB to test 4-subject layout.")
        return

    # 3. Create mock enrollments for this test
    class MockEnrollment:
        def __init__(self, subject, batch):
            self.subject = subject
            self.batch_time = batch
            self.student = student
            self.pending_amount = 0

    mock_enrollments = [
        MockEnrollment(subjects[0], "6 PM - 7 PM"),
        MockEnrollment(subjects[1], "7 PM - 8 PM"),
        MockEnrollment(subjects[2], "8 AM - 9 AM"),
        MockEnrollment(subjects[3], "5 PM - 6 PM"),
    ]

    class MockStudent:
        def __init__(self, original):
            self.id = original.id
            self.student_id = original.student_id
            self.login_username = 'STU_TEST_A58229'
            self.name = original.name
            self.phone = original.phone
            self.enrollments = self
            self.photo = None
        
        def filter(self, *args, **kwargs):
            return self

        def order_by(self, *args, **kwargs):
            return mock_enrollments

    mock_student = MockStudent(student)
    
    # We must patch Enrollment objects inside id_cards.py temporarily to use this
    # Actually, in id_cards.py we wrote:
    # all_active = list(Enrollment.objects.filter(student=student, is_deleted=False, status='ACTIVE').order_by('created_at'))
    
    # Let's mock the Enrollment Model just for this call
    class MockObjects:
        def filter(self, *args, **kwargs):
            return self
        def order_by(self, *args, **kwargs):
            return mock_enrollments
            
    class MockEnrollmentClass:
        objects = MockObjects()
        
    import apps.enrollments.models
    original_enrollment = apps.enrollments.models.Enrollment
    apps.enrollments.models.Enrollment = MockEnrollmentClass()

    print("Generating A5 ID Card PDF with 4 subjects...")
    first_enrollment = mock_enrollments[0]
    
    try:
        pdf_bytes = generate_id_card_pdf(first_enrollment)
        
        if pdf_bytes:
            filename = "test_A5_id_card_layout.pdf"
            with open(filename, "wb") as f:
                f.write(pdf_bytes)
            print(f"Successfully generated {filename}")
            print(f"Path: {os.path.abspath(filename)}")
        else:
            print("Failed to generate PDF.")
    finally:
        apps.enrollments.models.Enrollment = original_enrollment

if __name__ == "__main__":
    test_generate_idcard()
